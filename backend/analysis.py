"""Column auto-mapping and statistical analysis engine. Modular by design."""
import pandas as pd
import numpy as np

CANDIDATES = {
    "date": ["order date", "orderdate", "date", "timestamp", "purchase date", "invoice date", "created", "day"],
    "order_id": ["order id", "orderid", "order number", "orderno", "order_no", "invoice", "transaction", "order"],
    "product": ["product name", "product", "item name", "item", "sku", "title"],
    "category": ["category", "product category", "department", "segment", "type", "group"],
    "quantity": ["quantity", "qty", "units", "units sold", "count", "no of items"],
    "price": ["unit price", "unitprice", "price", "rate", "cost per unit"],
    "revenue": ["revenue", "sales", "sales amount", "total price", "line total", "grand total", "amount", "total", "net sales"],
    "customer": ["customer id", "customer name", "customer", "client", "buyer", "user"],
    "region": ["region", "country", "state", "city", "location", "area", "zone", "market"],
    "payment": ["payment method", "paymentmethod", "payment", "pay type", "method"],
}


def _norm(s):
    return str(s).strip().lower().replace("_", " ").replace("-", " ")


def detect_columns(df):
    """Map dataset columns to canonical roles using keyword matching."""
    cols = {c: _norm(c) for c in df.columns}
    mapping = {}
    used = set()
    for role, keys in CANDIDATES.items():
        best = None
        best_score = 0
        for orig, ncol in cols.items():
            if orig in used:
                continue
            for k in keys:
                if ncol == k:
                    score = 100
                elif ncol.replace(" ", "") == k.replace(" ", ""):
                    score = 95
                elif k == ncol or (len(k) > 3 and k in ncol) or (len(ncol) > 3 and ncol in k):
                    score = 60
                else:
                    score = 0
                if score > best_score:
                    best_score = score
                    best = orig
        if best is not None and best_score >= 60:
            mapping[role] = best
            used.add(best)
    return mapping


def build_frame(df, mapping):
    """Return a normalized working dataframe with canonical columns + computed revenue."""
    work = pd.DataFrame()
    if "date" in mapping:
        work["date"] = pd.to_datetime(df[mapping["date"]], errors="coerce")
    if "order_id" in mapping:
        work["order_id"] = df[mapping["order_id"]].astype(str)
    if "product" in mapping:
        work["product"] = df[mapping["product"]].astype(str)
    if "category" in mapping:
        work["category"] = df[mapping["category"]].astype(str)
    if "customer" in mapping:
        work["customer"] = df[mapping["customer"]].astype(str)
    if "region" in mapping:
        work["region"] = df[mapping["region"]].astype(str)
    if "payment" in mapping:
        work["payment"] = df[mapping["payment"]].astype(str)

    qty = pd.to_numeric(df[mapping["quantity"]], errors="coerce") if "quantity" in mapping else None
    price = pd.to_numeric(df[mapping["price"]], errors="coerce") if "price" in mapping else None
    rev = pd.to_numeric(df[mapping["revenue"]], errors="coerce") if "revenue" in mapping else None

    if qty is not None:
        work["quantity"] = qty.fillna(0)
    else:
        work["quantity"] = 1

    if rev is not None:
        work["revenue"] = rev.fillna(0)
    elif price is not None:
        work["revenue"] = (price.fillna(0) * work["quantity"]).fillna(0)
    else:
        work["revenue"] = 0.0
    return work


def _fmt_period(ts, monthly):
    return ts.strftime("%b %Y") if monthly else ts.strftime("%b %d")


def compute_overview(work):
    total_revenue = float(work["revenue"].sum())
    if "order_id" in work:
        total_orders = int(work["order_id"].nunique())
    else:
        total_orders = int(len(work))
    units_sold = int(work["quantity"].sum())
    aov = total_revenue / total_orders if total_orders else 0.0

    result = {
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "average_order_value": round(aov, 2),
        "units_sold": units_sold,
        "has_date": bool("date" in work and work["date"].notna().any()),
        "has_category": bool("category" in work),
        "has_product": bool("product" in work),
    }

    # Revenue trend
    trend = []
    if result["has_date"]:
        dd = work.dropna(subset=["date"]).copy()
        if len(dd):
            span_days = (dd["date"].max() - dd["date"].min()).days
            monthly = span_days > 75
            key = dd["date"].dt.to_period("M") if monthly else dd["date"].dt.to_period("D")
            grp = dd.groupby(key)["revenue"].sum()
            for period, val in grp.items():
                trend.append({"period": _fmt_period(period.to_timestamp(), monthly), "revenue": round(float(val), 2)})
    result["revenue_trend"] = trend

    # Top products
    top_products = []
    if "product" in work:
        gp = work.groupby("product").agg(revenue=("revenue", "sum"), units=("quantity", "sum")).sort_values("revenue", ascending=False).head(6)
        for name, row in gp.iterrows():
            top_products.append({
                "name": name, "revenue": round(float(row["revenue"]), 2), "units": int(row["units"]),
                "share": round(float(row["revenue"]) / total_revenue * 100, 1) if total_revenue else 0,
            })
    result["top_products"] = top_products

    # Top categories
    top_categories = []
    if "category" in work:
        gc = work.groupby("category").agg(revenue=("revenue", "sum"), units=("quantity", "sum")).sort_values("revenue", ascending=False)
        for name, row in gc.iterrows():
            top_categories.append({
                "name": name, "revenue": round(float(row["revenue"]), 2), "units": int(row["units"]),
                "share": round(float(row["revenue"]) / total_revenue * 100, 1) if total_revenue else 0,
            })
    result["top_categories"] = top_categories
    return result
