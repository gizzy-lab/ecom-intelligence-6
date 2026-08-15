"""Deterministic demo e-commerce dataset generator (general retail)."""
import random
from datetime import date, timedelta
import pandas as pd

CATALOG = {
    "Electronics": [
        ("Wireless Earbuds Pro", 79), ("4K Action Camera", 189),
        ("Smart Home Hub", 129), ("Noise-Cancel Headphones", 159),
        ("Portable SSD 1TB", 99),
    ],
    "Clothing": [
        ("Merino Wool Sweater", 89), ("Classic Denim Jacket", 69),
        ("Running Leggings", 45), ("Cotton Crew Tee", 24), ("Rain Shell Jacket", 119),
    ],
    "Sports": [
        ("Yoga Mat Premium", 39), ("Adjustable Dumbbell", 149),
        ("Trail Running Shoes", 129), ("Insulated Water Bottle", 29),
        ("Resistance Band Set", 25),
    ],
    "Home": [
        ("Ceramic Cookware Set", 179), ("Aroma Diffuser", 49),
        ("Weighted Blanket", 89), ("LED Desk Lamp", 59), ("Bamboo Cutting Board", 34),
    ],
}
REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America"]
PAYMENTS = ["Credit Card", "PayPal", "Apple Pay", "Bank Transfer"]


def generate_demo_dataframe():
    rng = random.Random(42)
    start = date.today() - timedelta(days=180)
    rows = []
    order_no = 1000
    # Category momentum: Electronics booming, Home declining, Sports steady growth, Clothing flat
    trend = {"Electronics": 1.9, "Clothing": 1.0, "Sports": 1.4, "Home": 0.45}
    for d in range(181):
        cur = start + timedelta(days=d)
        progress = d / 180.0
        # weekend uplift
        base = 9 + (4 if cur.weekday() >= 5 else 0)
        n_orders = max(1, int(rng.gauss(base, 3)))
        for _ in range(n_orders):
            weights = []
            cats = list(CATALOG.keys())
            for c in cats:
                w = 1 + (trend[c] - 1) * progress
                weights.append(max(0.05, w))
            category = rng.choices(cats, weights=weights)[0]
            product, price = rng.choice(CATALOG[category])
            qty = rng.choices([1, 2, 3, 4], weights=[62, 24, 10, 4])[0]
            order_no += 1
            rows.append({
                "Order Date": cur.isoformat(),
                "Order ID": f"ORD-{order_no}",
                "Product": product,
                "Category": category,
                "Quantity": qty,
                "Unit Price": price,
                "Revenue": round(price * qty, 2),
                "Customer": f"CUST-{rng.randint(1, 1400):04d}",
                "Region": rng.choices(REGIONS, weights=[45, 30, 18, 7])[0],
                "Payment Method": rng.choice(PAYMENTS),
            })
    # Inject an anomaly: a sharp Electronics spike in the last two weeks already covered by trend.
    return pd.DataFrame(rows)
