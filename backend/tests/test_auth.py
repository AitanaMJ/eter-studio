from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import AdminUser


def test_login_ok_y_me(client):
    r = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Admin-Test-Pass-123"})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    assert "httponly" in r.headers["set-cookie"].lower()
    assert "password" not in r.text
    me = client.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "admin@test.com"


def test_login_incorrecto(client):
    assert client.post("/api/auth/login", json={"email": "admin@test.com", "password": "mala"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "nadie@test.com", "password": "mala"}).status_code == 401


def test_rate_limit_login(client):
    for _ in range(5):
        client.post("/api/auth/login", json={"email": "admin@test.com", "password": "mala"})
    r = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Admin-Test-Pass-123"})
    assert r.status_code == 429


def test_rutas_admin_protegidas(client):
    assert client.get("/api/admin/dashboard").status_code == 401
    assert client.get("/api/admin/products").status_code == 401
    assert client.get("/api/admin/settings").status_code == 401
    assert client.delete("/api/admin/products/1").status_code == 401


def test_session(client):
    assert client.get("/api/auth/session").json() == {"authenticated": False, "user": None}
    client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Admin-Test-Pass-123"})
    s = client.get("/api/auth/session").json()
    assert s["authenticated"] is True and s["user"]["role"] == "admin"


def test_token_invalido(client):
    client.cookies.set("eter_session", "token.falso.firmado")
    assert client.get("/api/auth/me").status_code == 401


def test_csrf_header_obligatorio(admin):
    with TestClient(app) as raw:  # sin header X-Eter-Client
        raw.cookies.update(admin.cookies)
        assert raw.post("/api/admin/categories", json={"name": "Nueva"}).status_code == 403
        r = raw.post("/api/auth/login", json={"email": "admin@test.com", "password": "Admin-Test-Pass-123"})
        assert r.status_code == 403


def test_logout(admin):
    assert admin.post("/api/auth/logout").status_code == 204
    assert admin.get("/api/auth/me").status_code == 401


def test_password_hasheada(db):
    u = db.scalar(select(AdminUser).where(AdminUser.email == "admin@test.com"))
    assert u.password_hash.startswith("$argon2id$")
