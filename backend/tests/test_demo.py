from app.seed.seed import run_seed

from .conftest import category_id, make_image, product_payload


def test_demo_puede_editar_pero_no_eliminar(demo):
    cid = category_id(demo)
    r = demo.post("/api/admin/products", json=product_payload(cid))
    assert r.status_code == 201
    pid = r.json()["id"]
    assert demo.delete(f"/api/admin/products/{pid}").status_code == 403
    assert demo.delete(f"/api/admin/categories/{cid}").status_code == 403


def test_demo_no_cambia_datos_de_contacto(demo):
    s = demo.get("/api/admin/settings").json()
    r = demo.put("/api/admin/settings", json={**s, "whatsapp": "5491100000000"})
    assert r.status_code == 403
    r = demo.put("/api/admin/settings", json={**s, "email": "spam@x.com"})
    assert r.status_code == 403
    r = demo.put("/api/admin/settings", json={**s, "hero_title": "Probando la demo"})
    assert r.status_code == 200


def test_demo_limite_upload(demo):
    import os

    r = demo.post(
        "/api/admin/uploads",
        data={"kind": "product"},
        files={"file": ("a.png", os.urandom(4 * 1024 * 1024), "image/png")},
    )
    assert r.status_code == 413
    ok = demo.post("/api/admin/uploads", data={"kind": "product"}, files={"file": ("a.png", make_image(), "image/png")})
    assert ok.status_code == 201


def test_reset_restaura_datos(demo):
    cid = category_id(demo)
    demo.post("/api/admin/products", json=product_payload(cid, name="Producto Basura"))
    s = demo.get("/api/admin/settings").json()
    demo.put("/api/admin/settings", json={**s, "store_name": "Tienda Rota"})
    assert demo.get("/api/products").json()["total"] == 31

    r = demo.post("/api/admin/demo/reset")
    assert r.status_code == 200 and r.json()["products_created"] == 30
    assert demo.get("/api/products").json()["total"] == 30
    assert demo.get("/api/settings").json()["store_name"] == "ÉTER Studio"
    # la sesión sigue siendo válida: los usuarios no se tocan
    assert demo.get("/api/auth/me").status_code == 200


def test_reset_deshabilitado_fuera_de_demo(admin, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "demo_mode", False)
    assert admin.post("/api/admin/demo/reset").status_code == 403


def test_demo_bloqueada_si_modo_demo_apagado(demo, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "demo_mode", False)
    assert demo.get("/api/admin/dashboard").status_code == 403


def test_seed_idempotente(db):
    r = run_seed(db)
    assert r["products_created"] == 0 and r["categories_created"] == 0 and r["settings_created"] is False
    r = run_seed(db)
    assert r["products_created"] == 0
