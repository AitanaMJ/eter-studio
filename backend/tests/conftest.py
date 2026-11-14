"""Configuración de pruebas.

Usa la base indicada en TEST_DATABASE_URL (por defecto eter_test en el mismo servidor).
Nunca apuntar TEST_DATABASE_URL a una base con datos reales: las pruebas la reinician.
"""

import io
import os
import tempfile

import pytest

os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/eter_test"
)
os.environ["MEDIA_DIR"] = tempfile.mkdtemp(prefix="eter-media-")
os.environ["SECRET_KEY"] = "test-secret-key-0123456789abcdef"
os.environ["ADMIN_EMAIL"] = "admin@test.com"
os.environ["ADMIN_PASSWORD"] = "Admin-Test-Pass-123"
os.environ["DEMO_MODE"] = "true"
os.environ["DEMO_EMAIL"] = "demo@test.com"
os.environ["DEMO_PASSWORD"] = "Demo-Test-Pass-123"
os.environ["DEMO_RESET_INTERVAL_MINUTES"] = "0"

if "_test" not in os.environ["DATABASE_URL"].rsplit("/", 1)[-1]:
    raise SystemExit("TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga '_test'")

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.database import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.security import login_limiter  # noqa: E402
from app.seed.seed import run_seed  # noqa: E402

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="session", autouse=True)
def _migrate():
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    cfg = Config(os.path.join(BACKEND, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(BACKEND, "alembic"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def seeded(_migrate):
    login_limiter.reset()
    with SessionLocal() as db:
        run_seed(db, reset=True)
    yield


@pytest.fixture
def db():
    with SessionLocal() as s:
        yield s


@pytest.fixture
def client():
    with TestClient(app, headers={"X-Eter-Client": "web"}) as c:
        yield c


def _login(c: TestClient, email: str, password: str) -> TestClient:
    r = c.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return c


@pytest.fixture
def admin(client):
    return _login(client, "admin@test.com", "Admin-Test-Pass-123")


@pytest.fixture
def demo():
    with TestClient(app, headers={"X-Eter-Client": "web"}) as c:
        yield _login(c, "demo@test.com", "Demo-Test-Pass-123")


def make_image(fmt="PNG", size=(1200, 1500), color=(180, 160, 140)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, fmt)
    return buf.getvalue()


def category_id(client, slug="remeras-y-tops") -> int:
    return next(c["id"] for c in client.get("/api/categories").json() if c["slug"] == slug)


def product_payload(cat_id: int, **over):
    data = {
        "name": "Remera Test",
        "description": "Producto de prueba",
        "category_id": cat_id,
        "price": 25000,
        "compare_at_price": None,
        "is_active": True,
        "is_featured": False,
        "variants": [
            {"size": "S", "color": "Negro", "color_hex": "#111111", "stock": 5},
            {"size": "M", "color": "Negro", "color_hex": "#111111", "stock": 0},
        ],
        "images": [],
    }
    data.update(over)
    return data
