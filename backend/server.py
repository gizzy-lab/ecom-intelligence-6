import os
import io
import json
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from emergentintegrations.llm.chat import LlmChat, UserMessage

import analysis
import insights as insights_mod
from demo_data import generate_demo_dataframe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-6"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Per-session in-memory dataset store: dataset_id -> {work_df, mapping, overview, facts, filename}
DATASETS: dict = {}


class AskRequest(BaseModel):
    question: str


def _process_dataframe(df: pd.DataFrame, filename: str):
    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file has no rows.")
    mapping = analysis.detect_columns(df)
    required = {"revenue", "price", "quantity"}
    if not (mapping.keys() & required):
        raise HTTPException(status_code=400,
                            detail="Could not find any revenue, price or quantity column in your file.")
    work = analysis.build_frame(df, mapping)
    overview = analysis.compute_overview(work)
    facts = insights_mod.detect_facts(work, overview)
    dataset_id = str(uuid.uuid4())
    DATASETS[dataset_id] = {
        "work": work, "mapping": mapping, "overview": overview,
        "facts": facts, "filename": filename, "columns": list(df.columns),
        "row_count": int(len(df)),
    }
    return dataset_id


def _dataset_meta(dataset_id):
    ds = DATASETS.get(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or session expired. Please upload again.")
    return ds


@api_router.get("/")
async def root():
    return {"message": "Runiq Insight API"}


@api_router.post("/upload")
async def upload(file: UploadFile = File(...)):
    name = (file.filename or "dataset").lower()
    content = await file.read()
    try:
        if name.endswith(".csv") or name.endswith(".txt"):
            df = pd.read_csv(io.BytesIO(content))
        elif name.endswith(".xlsx") or name.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a CSV or XLSX file.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read the file: {e}")

    dataset_id = _process_dataframe(df, file.filename or "dataset")
    ds = DATASETS[dataset_id]
    return {
        "dataset_id": dataset_id,
        "filename": ds["filename"],
        "row_count": ds["row_count"],
        "columns": ds["columns"],
        "mapping": ds["mapping"],
        "is_demo": False,
    }


@api_router.post("/demo")
async def load_demo():
    df = generate_demo_dataframe()
    dataset_id = _process_dataframe(df, "Runiq Demo Dataset")
    ds = DATASETS[dataset_id]
    return {
        "dataset_id": dataset_id,
        "filename": ds["filename"],
        "row_count": ds["row_count"],
        "columns": ds["columns"],
        "mapping": ds["mapping"],
        "is_demo": True,
    }


@api_router.get("/overview/{dataset_id}")
async def get_overview(dataset_id: str):
    ds = _dataset_meta(dataset_id)
    return {"overview": ds["overview"], "mapping": ds["mapping"], "filename": ds["filename"], "row_count": ds["row_count"]}


async def _enrich_facts_with_ai(facts, overview):
    """Single Claude call to write WHAT/WHY/ACTION narratives from computed facts."""
    if not facts or not EMERGENT_LLM_KEY:
        return None
    compact = [{"id": i, "type": f["type"], "severity": f["severity"], "metric": f["metric"], "data": f["data"]}
               for i, f in enumerate(facts)]
    context = {
        "total_revenue": overview["total_revenue"],
        "total_orders": overview["total_orders"],
        "average_order_value": overview["average_order_value"],
        "units_sold": overview["units_sold"],
        "top_products": overview["top_products"][:3],
        "top_categories": overview["top_categories"][:3],
    }
    system = (
        "You are Runiq, an expert e-commerce business analyst who explains findings to a non-technical "
        "small business owner. For each finding you are given, write a crisp narrative with three parts: "
        "WHAT is happening (one sentence, plain language, reference the numbers), WHY it may be happening "
        "(one sentence, grounded ONLY in the provided data), and a concrete ACTION the owner should consider "
        "(one sentence, specific and practical). Never invent numbers not present in the data. "
        "Return ONLY valid JSON: a list of objects with keys id, title, what, why, action. "
        "title is a short 3-6 word headline."
    )
    prompt = (
        f"Business context (already computed): {json.dumps(context)}\n\n"
        f"Findings to narrate: {json.dumps(compact)}\n\n"
        "Return the JSON list now."
    )
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"insights-{uuid.uuid4()}",
                       system_message=system).with_model(MODEL_PROVIDER, MODEL_NAME)
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1:
            text = text[start:end + 1]
        parsed = json.loads(text)
        by_id = {int(o["id"]): o for o in parsed if "id" in o}
        return by_id
    except Exception as e:
        logger.warning(f"AI insight enrichment failed, using fallback: {e}")
        return None


@api_router.get("/insights/{dataset_id}")
async def get_insights(dataset_id: str):
    ds = _dataset_meta(dataset_id)
    facts = ds["facts"]
    ai = await _enrich_facts_with_ai(facts, ds["overview"])
    out = []
    for i, f in enumerate(facts):
        title = what = why = action = None
        if ai and i in ai:
            o = ai[i]
            title = o.get("title")
            what = o.get("what")
            why = o.get("why")
            action = o.get("action")
        if not (what and why and action):
            fw, fy, fa = insights_mod.fallback_narrative(f)
            what = what or fw
            why = why or fy
            action = action or fa
            title = title or f["metric"]
        out.append({
            "id": i, "severity": f["severity"], "metric": f["metric"],
            "title": title, "what": what, "why": why, "action": action,
        })
    return {"insights": out, "ai_enriched": ai is not None}


@api_router.post("/ask/{dataset_id}")
async def ask_runiq(dataset_id: str, req: AskRequest):
    ds = _dataset_meta(dataset_id)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI is not configured.")
    ov = ds["overview"]
    facts_compact = [{"metric": f["metric"], "severity": f["severity"], "data": f["data"]} for f in ds["facts"]]
    data_context = {
        "filename": ds["filename"],
        "total_revenue": ov["total_revenue"],
        "total_orders": ov["total_orders"],
        "average_order_value": ov["average_order_value"],
        "units_sold": ov["units_sold"],
        "top_products": ov["top_products"],
        "top_categories": ov["top_categories"],
        "revenue_trend": ov["revenue_trend"],
        "key_findings": facts_compact,
    }
    system = (
        "You are Runiq, a friendly and sharp AI business analyst embedded in the Runiq Insight app. "
        "You answer questions about the user's uploaded e-commerce sales data using ONLY the data context "
        "provided. Be concise, direct, and decision-oriented: lead with the answer, cite the relevant numbers, "
        "and end with a clear recommended action when appropriate. Speak to a non-technical business owner. "
        "If the data does not contain the answer, say so honestly. Keep responses under 180 words. "
        "Do not use markdown tables; use short paragraphs or simple bullet points."
    )
    prompt = f"DATA CONTEXT (JSON):\n{json.dumps(data_context)}\n\nQUESTION: {req.question}"
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"ask-{dataset_id}",
                       system_message=system).with_model(MODEL_PROVIDER, MODEL_NAME)
        resp = await chat.send_message(UserMessage(text=prompt))
        answer = resp if isinstance(resp, str) else str(resp)
        return {"answer": answer.strip()}
    except Exception as e:
        logger.error(f"Ask Runiq error: {e}")
        raise HTTPException(status_code=500, detail="Runiq could not answer right now. Please try again.")


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
