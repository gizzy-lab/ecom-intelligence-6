"""Rule-based insight detection. Produces structured facts; AI narrates WHAT/WHY/ACTION."""
import pandas as pd
import numpy as np


def _money(v):
    return f"${v:,.0f}"


def _pct(v):
    return f"{v:+.0f}%"


def detect_facts(work, overview):
    """Return list of structured insight facts prioritized by severity."""
    facts = []
    total_rev = overview["total_revenue"]

    # 1. Overall revenue trend (first half vs second half)
    if overview["has_date"]:
        dd = work.dropna(subset=["date"]).sort_values("date")
        if len(dd) > 10:
            mid = dd["date"].min() + (dd["date"].max() - dd["date"].min()) / 2
            first = dd[dd["date"] <= mid]["revenue"].sum()
            second = dd[dd["date"] > mid]["revenue"].sum()
            if first > 0:
                change = (second - first) / first * 100
                if change >= 12:
                    facts.append({"type": "revenue_trend", "severity": "success",
                                  "metric": f"{_pct(change)} revenue growth",
                                  "data": {"direction": "up", "change_pct": round(change, 1),
                                           "first_half": round(float(first), 2), "second_half": round(float(second), 2)}})
                elif change <= -12:
                    facts.append({"type": "revenue_trend", "severity": "danger",
                                  "metric": f"{_pct(change)} revenue decline",
                                  "data": {"direction": "down", "change_pct": round(change, 1),
                                           "first_half": round(float(first), 2), "second_half": round(float(second), 2)}})
                else:
                    facts.append({"type": "revenue_trend", "severity": "info",
                                  "metric": f"{_pct(change)} revenue (stable)",
                                  "data": {"direction": "flat", "change_pct": round(change, 1),
                                           "first_half": round(float(first), 2), "second_half": round(float(second), 2)}})

    # 2. Category momentum (fastest growing / declining)
    if overview["has_category"] and overview["has_date"]:
        dd = work.dropna(subset=["date"]).copy()
        if len(dd) > 10:
            mid = dd["date"].min() + (dd["date"].max() - dd["date"].min()) / 2
            for cat in dd["category"].unique():
                cdf = dd[dd["category"] == cat]
                f = cdf[cdf["date"] <= mid]["revenue"].sum()
                s = cdf[cdf["date"] > mid]["revenue"].sum()
                if f > total_rev * 0.02:
                    ch = (s - f) / f * 100 if f > 0 else 0
                    share = cdf["revenue"].sum() / total_rev * 100 if total_rev else 0
                    if ch >= 25:
                        facts.append({"type": "category_growth", "severity": "success",
                                      "metric": f"{cat} up {_pct(ch)}",
                                      "data": {"category": cat, "change_pct": round(ch, 1), "share": round(share, 1)}})
                    elif ch <= -25:
                        facts.append({"type": "category_decline", "severity": "warning",
                                      "metric": f"{cat} down {_pct(ch)}",
                                      "data": {"category": cat, "change_pct": round(ch, 1), "share": round(share, 1)}})

    # 3. Concentration risk (top product share)
    if overview["top_products"]:
        top = overview["top_products"][0]
        if top["share"] >= 22:
            facts.append({"type": "concentration_risk", "severity": "warning",
                          "metric": f"{top['share']:.0f}% revenue from one product",
                          "data": {"product": top["name"], "share": top["share"], "revenue": top["revenue"]}})

    # 4. Top category dependence
    if overview["top_categories"]:
        tc = overview["top_categories"][0]
        if tc["share"] >= 45:
            facts.append({"type": "category_concentration", "severity": "info",
                          "metric": f"{tc['name']} drives {tc['share']:.0f}% of revenue",
                          "data": {"category": tc["name"], "share": tc["share"], "revenue": tc["revenue"]}})

    # 5. Star performer (top product growth opportunity)
    if overview["top_products"]:
        top = overview["top_products"][0]
        facts.append({"type": "top_performer", "severity": "success",
                      "metric": f"{top['name']} is your #1 product",
                      "data": {"product": top["name"], "revenue": top["revenue"], "units": top["units"], "share": top["share"]}})

    # 6. Regional concentration
    if "region" in work:
        gr = work.groupby("region")["revenue"].sum().sort_values(ascending=False)
        if len(gr) > 1 and total_rev:
            top_region = gr.index[0]
            share = gr.iloc[0] / total_rev * 100
            if share >= 40:
                facts.append({"type": "region_concentration", "severity": "info",
                              "metric": f"{top_region} = {share:.0f}% of revenue",
                              "data": {"region": top_region, "share": round(share, 1)}})

    # 7. Underperforming product (lowest revenue among tracked)
    if overview["has_product"]:
        gp = work.groupby("product")["revenue"].sum().sort_values()
        if len(gp) >= 5:
            worst = gp.index[0]
            facts.append({"type": "underperformer", "severity": "warning",
                          "metric": f"{worst} is lagging",
                          "data": {"product": worst, "revenue": round(float(gp.iloc[0]), 2)}})

    order = {"danger": 0, "warning": 1, "success": 2, "info": 3}
    facts.sort(key=lambda f: order.get(f["severity"], 4))
    return facts


def fallback_narrative(fact):
    """Deterministic narrative used if AI enrichment is unavailable."""
    d = fact["data"]
    t = fact["type"]
    if t == "revenue_trend":
        if d["direction"] == "up":
            return (f"Revenue grew {d['change_pct']}% from the first to the second half of the period.",
                    "Sustained order volume and healthy demand pushed revenue higher across the period.",
                    "Double down on what's working — keep top sellers in stock and reinvest in your best channels.")
        if d["direction"] == "down":
            return (f"Revenue fell {abs(d['change_pct'])}% in the second half of the period.",
                    "Demand softened later in the period, likely driven by fewer orders or weaker categories.",
                    "Investigate the drop by category and launch a win-back promotion for lapsed customers.")
        return ("Revenue stayed broadly flat across the period.",
                "Order patterns were consistent with no major swings.",
                "Look for a growth lever — a new product push or targeted promotion could break the plateau.")
    if t == "category_growth":
        return (f"{d['category']} revenue jumped {d['change_pct']}% and now makes up {d['share']}% of sales.",
                "Rising demand in this category is outpacing the rest of your catalog.",
                f"Expand the {d['category']} range and feature it prominently to ride the momentum.")
    if t == "category_decline":
        return (f"{d['category']} revenue dropped {abs(d['change_pct'])}%.",
                "Interest is cooling, or stronger categories are pulling spend away.",
                f"Review pricing and merchandising for {d['category']}, or clear slow stock with a promotion.")
    if t == "concentration_risk":
        return (f"{d['product']} alone accounts for {d['share']}% of total revenue.",
                "A single product carrying this much revenue creates risk if demand shifts.",
                "Diversify by promoting complementary products and building a stronger second tier.")
    if t == "category_concentration":
        return (f"{d['category']} drives {d['share']}% of all revenue.",
                "Your business leans heavily on one category for its results.",
                "Protect this category while nurturing a second growth engine to reduce dependence.")
    if t == "top_performer":
        return (f"{d['product']} is your best seller at {_money_safe(d['revenue'])} in revenue.",
                "Strong, consistent demand makes this your reliable revenue anchor.",
                "Ensure it never goes out of stock and use it to cross-sell related items.")
    if t == "region_concentration":
        return (f"{d['region']} generates {d['share']}% of revenue.",
                "Sales are concentrated in one region, leaving other markets underdeveloped.",
                "Test targeted campaigns in secondary regions to open new growth.")
    if t == "underperformer":
        return (f"{d['product']} is generating very little revenue.",
                "Low visibility, weak demand, or pricing may be holding it back.",
                "Decide whether to reposition it, bundle it, or retire it to focus on winners.")
    return (fact.get("metric", "Insight"), "", "Review this area for action.")


def _money_safe(v):
    try:
        return f"${v:,.0f}"
    except Exception:
        return str(v)
