"""Backend API tests for Runiq Insight."""
import io
import os
import time
import pytest
import requests
import pandas as pd

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ecom-intelligence-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def demo_dataset_id(session):
    r = session.post(f"{API}/demo", timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["is_demo"] is True
    assert "dataset_id" in data
    return data["dataset_id"]


def _make_csv_bytes():
    df = pd.DataFrame({
        "Order Date": pd.date_range("2024-01-01", periods=30, freq="D").strftime("%Y-%m-%d"),
        "Order ID": [f"O{i:04d}" for i in range(30)],
        "Product": ["Widget A", "Widget B", "Widget C"] * 10,
        "Category": ["Cat1", "Cat2", "Cat3"] * 10,
        "Quantity": [1, 2, 3] * 10,
        "Unit Price": [10.0, 20.0, 30.0] * 10,
    })
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode()


def _make_xlsx_bytes():
    df = pd.DataFrame({
        "Order Date": pd.date_range("2024-01-01", periods=15, freq="D").strftime("%Y-%m-%d"),
        "Order ID": [f"X{i:04d}" for i in range(15)],
        "Product": ["Alpha", "Beta", "Gamma"] * 5,
        "Category": ["C1", "C2", "C3"] * 5,
        "Quantity": [2] * 15,
        "Unit Price": [15.0] * 15,
    })
    buf = io.BytesIO()
    df.to_excel(buf, index=False)
    return buf.getvalue()


class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200


class TestDemo:
    def test_demo_creates_session(self, session):
        r = session.post(f"{API}/demo", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["is_demo"] is True
        assert d["row_count"] > 0
        assert isinstance(d["columns"], list)

    def test_demo_overview_no_500(self, session, demo_dataset_id):
        # Regression: previously 500 due to numpy.bool serialization
        r = session.get(f"{API}/overview/{demo_dataset_id}")
        assert r.status_code == 200, r.text
        ov = r.json()["overview"]
        assert ov["total_revenue"] > 0
        assert ov["total_orders"] > 0
        assert ov["average_order_value"] > 0
        assert ov["units_sold"] > 0
        assert isinstance(ov["has_date"], bool)
        assert isinstance(ov["has_product"], bool)
        assert isinstance(ov["has_category"], bool)
        assert len(ov["revenue_trend"]) > 0
        assert len(ov["top_products"]) > 0
        assert len(ov["top_categories"]) > 0

    def test_demo_insights(self, session, demo_dataset_id):
        r = session.get(f"{API}/insights/{demo_dataset_id}", timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["insights"], list)
        if d["insights"]:
            first = d["insights"][0]
            for k in ["id", "severity", "what", "why", "action", "title"]:
                assert k in first

    def test_demo_ask(self, session, demo_dataset_id):
        r = session.post(f"{API}/ask/{demo_dataset_id}",
                         json={"question": "Which product should I focus on?"}, timeout=90)
        assert r.status_code == 200
        assert "answer" in r.json()
        assert len(r.json()["answer"]) > 5


class TestUpload:
    def test_csv_upload_and_overview(self, session):
        files = {"file": ("test.csv", _make_csv_bytes(), "text/csv")}
        r = session.post(f"{API}/upload", files=files, timeout=60)
        assert r.status_code == 200, r.text
        did = r.json()["dataset_id"]
        r2 = session.get(f"{API}/overview/{did}")
        assert r2.status_code == 200, r2.text
        ov = r2.json()["overview"]
        assert ov["total_revenue"] > 0
        assert ov["total_orders"] == 30

    def test_xlsx_upload_and_overview(self, session):
        files = {"file": ("test.xlsx", _make_xlsx_bytes(),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = session.post(f"{API}/upload", files=files, timeout=60)
        assert r.status_code == 200, r.text
        did = r.json()["dataset_id"]
        r2 = session.get(f"{API}/overview/{did}")
        assert r2.status_code == 200
        ov = r2.json()["overview"]
        assert ov["total_revenue"] > 0

    def test_invalid_file_type(self, session):
        files = {"file": ("test.pdf", b"garbage", "application/pdf")}
        r = session.post(f"{API}/upload", files=files)
        assert r.status_code == 400


class TestSessionExpiry:
    def test_unknown_dataset_returns_404(self, session):
        r = session.get(f"{API}/overview/nonexistent-id")
        assert r.status_code == 404
