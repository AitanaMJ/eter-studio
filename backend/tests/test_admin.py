from pathlib import Path

from app.media import url_to_path

from .conftest import category_id, make_image, product_payload


def _upload(c, kind="product", content=None, name="foto.png", mime="image/png"):
    return c.post(
        "/api/admin/uploads",
        data={"kind": kind},
        files={"file": (name, content if content is not None else make_image(), mime)},
    )


# ---------------- Productos ----------------
def test_crud_producto(admin):
    cid = category_id(admin)
    img = _upload(admin).json()["url"]
    r = admin.post("/api/admin/products", json=product_payload(cid, images=[{"url": img, "alt": ""}]))
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["slug"] == "remera-test" and p["sku"].startswith("ETR-") and p["stock"] == 5
    assert len(p["variants"]) == 2 and all(v["sku"] for v in p["variants"])

    # visible en tienda pública
    assert admin.get("/api/products/remera-test").status_code == 200

    # editar: precio, stock de una variante, quitar otra y agregar nueva
    v0 = p["variants"][0]
    body = product_payload(
        cid,
        name="Remera Test Editada",
        price=27000,
        compare_at_price=32000,
        images=[{"url": img, "alt": "frente"}],
        variants=[
            {"id": v0["id"], "size": "S", "color": "Negro", "color_hex": "#111111", "stock": 9},
            {"size": "L", "color": "Blanco", "color_hex": "#ffffff", "stock": 2},
        ],
    )
    r = admin.put(f"/api/admin/products/{p['id']}", json=body)
    assert r.status_code == 200, r.text
    e = r.json()
    assert e["price"] == 27000 and e["compare_at_price"] == 32000 and e["stock"] == 11
    assert {(v["size"], v["color"]) for v in e["variants"]} == {("S", "Negro"), ("L", "Blanco")}
    assert next(v for v in e["variants"] if v["size"] == "S")["id"] == v0["id"]  # se conserva el id
    assert e["variants"][1]["color_hex"] == "#FFFFFF"

    # desactivar -> desaparece de la tienda
    assert admin.patch(f"/api/admin/products/{p['id']}/status", json={"is_active": False}).status_code == 200
    assert admin.get(f"/api/products/{e['slug']}").status_code == 404

    # destacado
    r = admin.patch(f"/api/admin/products/{p['id']}/featured", json={"is_featured": True})
    assert r.json()["is_featured"] is True

    # duplicar
    d = admin.post(f"/api/admin/products/{p['id']}/duplicate").json()
    assert d["id"] != p["id"] and d["sku"] != e["sku"] and d["is_active"] is False
    assert d["slug"] != e["slug"] and len(d["variants"]) == 2 and d["images"][0]["url"] == img

    # eliminar original: la imagen sigue usada por la copia -> no se borra
    assert admin.delete(f"/api/admin/products/{p['id']}").status_code == 204
    assert admin.get(f"/api/admin/products/{p['id']}").status_code == 404
    assert url_to_path(img).exists()
    # eliminar copia: ahora sí se borra el archivo (sin huérfanos)
    assert admin.delete(f"/api/admin/products/{d['id']}").status_code == 204
    assert not url_to_path(img).exists()


def test_validaciones_producto(admin):
    cid = category_id(admin)
    cases = [
        product_payload(cid, price=0),
        product_payload(cid, price=-10),
        product_payload(cid, compare_at_price=20000),  # menor al precio
        product_payload(cid, variants=[]),
        product_payload(cid, variants=[{"size": "S", "color": "Negro", "stock": -1}]),
        product_payload(cid, variants=[{"size": "S", "color": "Negro", "stock": 1}, {"size": "s", "color": "negro", "stock": 2}]),
        product_payload(cid, variants=[{"size": "S", "color": "Negro", "color_hex": "rojo", "stock": 1}]),
        product_payload(cid, images=[{"url": "https://malicioso.com/x.jpg"}]),
        product_payload(cid, images=[{"url": "/media/../../etc/passwd"}]),
        product_payload(cid, name="x"),
        product_payload(cid, sku="sku con espacios"),
    ]
    for body in cases:
        r = admin.post("/api/admin/products", json=body)
        assert r.status_code == 422, (body, r.text)
        assert r.json()["detail"]
    r = admin.post("/api/admin/products", json=product_payload(99999))
    assert r.status_code == 422
    r = admin.post("/api/admin/products", json=product_payload(cid, sku="ETR-REM-001"))
    assert r.status_code == 409


def test_listado_admin_filtros(admin):
    d = admin.get("/api/admin/products", params={"page_size": 100}).json()
    assert d["total"] == 30
    out = admin.get("/api/admin/products", params={"stock": "out"}).json()
    assert {i["slug"] for i in out["items"]} == {"top-asimetrico"}
    low = admin.get("/api/admin/products", params={"stock": "low", "page_size": 100}).json()
    assert low["total"] > 0 and all(0 < i["stock"] <= 5 for i in low["items"])
    q = admin.get("/api/admin/products", params={"q": "ETR-ACC"}).json()
    assert q["total"] == 8
    pag = admin.get("/api/admin/products", params={"page_size": 10, "page": 2}).json()
    assert pag["pages"] == 3 and len(pag["items"]) == 10


def test_dashboard(admin):
    d = admin.get("/api/admin/dashboard").json()
    assert d["total_products"] == 30 and d["active_products"] == 30
    assert d["out_of_stock"] == 1 and d["total_categories"] == 4 and d["low_stock"] > 0


# ---------------- Categorías ----------------
def test_crud_categorias(admin):
    img = _upload(admin, kind="category").json()["url"]
    r = admin.post("/api/admin/categories", json={"name": "Calzado", "description": "Zapatos", "image_url": img})
    assert r.status_code == 201, r.text
    c = r.json()
    assert c["slug"] == "calzado" and c["product_count"] == 0
    assert admin.post("/api/admin/categories", json={"name": "calzado"}).status_code == 409

    r = admin.put(f"/api/admin/categories/{c['id']}", json={"name": "Calzado y botas", "image_url": None})
    assert r.status_code == 200 and r.json()["slug"] == "calzado-y-botas"
    assert not url_to_path(img).exists()  # imagen reemplazada -> eliminada

    cats = admin.get("/api/admin/categories").json()
    ids = [x["id"] for x in cats][::-1]
    r = admin.put("/api/admin/categories/order/apply", json={"ids": ids})
    assert [x["id"] for x in r.json()] == ids
    assert admin.put("/api/admin/categories/order/apply", json={"ids": ids[:2]}).status_code == 422

    assert admin.delete(f"/api/admin/categories/{c['id']}").status_code == 204


def test_categoria_con_productos_no_se_elimina(admin):
    cid = category_id(admin, "accesorios")
    r = admin.delete(f"/api/admin/categories/{cid}")
    assert r.status_code == 409 and "producto" in r.json()["detail"]


def test_categoria_inactiva_oculta_productos(admin):
    cid = category_id(admin, "accesorios")
    assert admin.patch(f"/api/admin/categories/{cid}/status", json={"is_active": False}).status_code == 200
    assert admin.get("/api/products", params={"category": "accesorios"}).json()["total"] == 0
    assert admin.get("/api/products").json()["total"] == 22
    assert admin.get("/api/products/mini-bag").status_code == 404


# ---------------- Configuración ----------------
def test_configuracion_se_refleja(admin):
    s = admin.get("/api/admin/settings").json()
    s.update(store_name="ÉTER Demo", hero_title="Nuevo título", whatsapp="+54 9 11 5555-0000")
    feat = [p["id"] for p in admin.get("/api/admin/products", params={"page_size": 3}).json()["items"]]
    r = admin.put("/api/admin/settings", json={**s, "featured_product_ids": feat})
    assert r.status_code == 200, r.text
    pub = admin.get("/api/settings").json()
    assert pub["store_name"] == "ÉTER Demo" and pub["hero_title"] == "Nuevo título"
    assert pub["whatsapp"] == "5491155550000"
    featured = admin.get("/api/products", params={"featured": True, "page_size": 48}).json()
    assert sorted(i["id"] for i in featured["items"]) == sorted(feat)

    bad = admin.put("/api/admin/settings", json={**s, "whatsapp": "12"})
    assert bad.status_code == 422
    bad = admin.put("/api/admin/settings", json={**s, "hero_image_url": "https://x.com/a.jpg"})
    assert bad.status_code == 422


def test_cambiar_imagen_hero_elimina_anterior(admin):
    s = admin.get("/api/admin/settings").json()
    new = _upload(admin, kind="hero", content=make_image(size=(2400, 1100))).json()
    assert new["width"] <= 2560
    r = admin.put("/api/admin/settings", json={**s, "hero_image_url": new["url"]})
    assert r.status_code == 200
    assert not url_to_path(s["hero_image_url"]).exists()
    assert url_to_path(new["url"]).exists()


# ---------------- Imágenes ----------------
def test_upload_optimiza_y_mantiene_proporcion(admin):
    r = _upload(admin, content=make_image("JPEG", size=(3000, 2000)), name="x.jpg", mime="image/jpeg")
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["url"].endswith(".webp") and d["width"] == 1500 and d["height"] == 1000
    assert Path(url_to_path(d["url"])).exists()


def test_upload_invalidos(admin):
    assert _upload(admin, content=b"no soy una imagen").status_code == 400
    assert _upload(admin, content=b"%PDF-1.4", name="x.pdf", mime="application/pdf").status_code == 415
    assert _upload(admin, kind="otro").status_code == 400
    assert _upload(admin, content=make_image(size=(100, 100))).status_code == 400
    import os

    big = os.urandom(9 * 1024 * 1024)
    assert _upload(admin, content=big).status_code == 413


def test_descartar_upload(admin):
    url = _upload(admin).json()["url"]
    assert admin.delete("/api/admin/uploads", params={"url": url}).status_code == 204
    assert not url_to_path(url).exists()
    # una imagen en uso no se borra
    used = admin.get("/api/products/remera-essential").json()["images"][0]["url"]
    admin.delete("/api/admin/uploads", params={"url": used})
    assert url_to_path(used).exists()


def test_reemplazar_imagenes_producto_borra_huerfanas(admin):
    p = admin.get("/api/admin/products", params={"q": "Remera Essential"}).json()["items"][0]
    old = [i["url"] for i in p["images"]]
    new = _upload(admin).json()["url"]
    body = {
        "name": p["name"], "description": p["description"], "category_id": p["category"]["id"],
        "price": p["price"], "compare_at_price": p["compare_at_price"], "is_active": True, "is_featured": True,
        "variants": [{k: v[k] for k in ("id", "size", "color", "color_hex", "stock")} for v in p["variants"]],
        "images": [{"url": new}, {"url": old[1]}],
    }
    r = admin.put(f"/api/admin/products/{p['id']}", json=body)
    assert r.status_code == 200
    assert [i["url"] for i in r.json()["images"]] == [new, old[1]]
    assert not url_to_path(old[0]).exists()
    # reordenar
    body["images"] = [{"url": old[1]}, {"url": new}]
    r = admin.put(f"/api/admin/products/{p['id']}", json=body)
    assert [i["url"] for i in r.json()["images"]] == [old[1], new]
