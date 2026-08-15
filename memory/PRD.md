# Runiq Insight — PRD

## Problem Statement
AI-powered business decision assistant for SMB e-commerce. Owners collect sales data in CSV/XLSX but struggle to interpret it. Runiq Insight turns raw sales data into decision-ready insights and actions.

## Target User
E-commerce business owner/manager who is NOT a data analyst.

## Architecture
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, framer-motion, recharts. Routes: `/` (Welcome/Upload), `/overview`, `/insights`, `/ask`. State via DataContext (per-session, in-memory client side).
- Backend: FastAPI, single-worker uvicorn. In-memory per-session dataset store (`DATASETS` dict keyed by dataset_id). Modules: `analysis.py` (column auto-mapping + KPI compute), `insights.py` (rule-based fact detection + fallback narratives), `demo_data.py` (deterministic demo dataset), `server.py` (routes + AI).
- AI: Claude Sonnet 4.6 via Emergent LLM key (emergentintegrations). Hybrid — math computes numbers, AI writes WHAT/WHY/ACTION narratives and answers Ask Runiq.
- No auth, no DB persistence (per-session only).

## Core Requirements (static)
- CSV/XLSX upload with graceful column auto-detection.
- Demo dataset option (general retail: Electronics, Clothing, Sports, Home).
- Executive Overview: Total Revenue, Total Orders, AOV, Units Sold, revenue trend, top products, top categories.
- Business Insights: prioritized cards with severity + WHAT/WHY/ACTION.
- Ask Runiq: conversational AI over the dataset.

## Implemented (2026-06)
- Full MVP: Welcome/Upload, Executive Overview, Business Insights, Ask Runiq. (done)
- Real calculations from uploaded data; column auto-mapping; demo dataset. (done)
- AI-enriched insights + Ask Runiq via Claude Sonnet 4.6. (done)
- Runiq Studio brand (navy) + logo integrated. (done)
- Bug fix: numpy.bool serialization causing false "Session expired" on GET /api/overview — fixed by casting to native bool. Verified by testing agent (backend 100%, frontend flows 100%). (done)

## Backlog (P1/P2)
- P1: Add TTL/eviction for in-memory DATASETS store.
- P1: Distinguish 404 vs other backend errors in frontend messaging.
- P2: Streaming responses for Ask Runiq.
- P2: Export insights as PDF/summary.
- P2: Additional data sources / connectors.

## Notes
- User intended to upload Runiq Studio brand assets; logo received and integrated. Navy identity designed to match.
