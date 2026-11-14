def _all(client, **params):
    return client.get("/api/products", params={"page_size": 48, **params}).json()


def test_listado_y_paginacion(client):
    d = client.get("/api/products", params={"page_size": 12}).json()
    assert d["total"] == 30 and d["pages"] == 3 and len(d["items"]) == 12
    p3 = client.get("/api/products", params={"page_size": 12, "page": 3}).json()
    assert len(p3["items"]) == 6
    assert len({i["id"] for i in d["items"]} | {i["id"] for i in p3["items"]}) == 18


def test_busqueda(client):
    names = {i["name"] for i in _all(client, q="jean")["items"]}
    assert names == {"Jean Wide Leg", "Jean Straight", "Jean Baggy"}
    assert _all(client, q="zzzz")["total"] == 0


def test_filtros(client):
    assert _all(client, category="accesorios")["total"] == 8
    d = _all(client, sizes="42")
    assert {i["category"]["slug"] for i in d["items"]} == {"pantalones-y-jeans"}
    d = _all(client, colors="Oliva")
    assert d["total"] >= 2 and all(any(c["name"] == "Oliva" for c in i["colors"]) for i in d["items"])
    d = _all(client, min_price=60000, max_price=80000)
    assert d["total"] > 0 and all(60000 <= i["price"] <= 80000 for i in d["items"])
    d = _all(client, on_sale=True)
    assert d["total"] > 0 and all(i["compare_at_price"] > i["price"] for i in d["items"])
    d = _all(client, category="abrigos", sizes="XL", colors="Camel")
    assert {i["name"] for i in d["items"]} == {"Campera Bomber", "Buzo Essential"}


def test_orden(client):
    asc = [i["price"] for i in _all(client, sort="price_asc")["items"]]
    assert asc == sorted(asc)
    desc = [i["price"] for i in _all(client, sort="price_desc")["items"]]
    assert desc == sorted(desc, reverse=True)
    names = [i["name"].lower() for i in _all(client, sort="name_asc")["items"]]
    assert names == sorted(names)
    newest = client.get("/api/products", params={"sort": "newest", "page_size": 8}).json()["items"]
    assert newest[0]["slug"] == "jean-wide-leg" and newest[0]["is_new"] is True
    assert client.get("/api/products", params={"sort": "invalido"}).status_code == 422


def test_filtros_disponibles(client):
    f = client.get("/api/products/filters").json()
    assert len(f["categories"]) == 4
    assert f["sizes"][:5] == ["XS", "S", "M", "L", "XL"]
    assert 0 < f["min_price"] < f["max_price"]


def test_detalle_y_relacionados(client):
    p = client.get("/api/products/jean-wide-leg").json()
    assert p["name"] == "Jean Wide Leg" and len(p["images"]) == 2 and len(p["variants"]) == 10
    assert p["stock"] == sum(v["stock"] for v in p["variants"])
    rel = client.get("/api/products/jean-wide-leg/related").json()
    assert len(rel) == 4 and all(r["slug"] != "jean-wide-leg" for r in rel)
    assert client.get("/api/products/no-existe").status_code == 404


def test_agotado(client):
    assert client.get("/api/products/top-asimetrico").json()["stock"] == 0


def test_settings_publicos(client):
    s = client.get("/api/settings").json()
    assert s["store_name"] == "ÉTER Studio" and s["slogan"] == "WEAR YOUR IDENTITY."
    assert s["whatsapp"].isdigit()


def test_validar_carrito(client):
    p = client.get("/api/products/remera-essential").json()
    v = next(v for v in p["variants"] if v["stock"] > 0)
    r = client.post("/api/cart/validate", json={"items": [{"variant_id": v["id"], "quantity": 1}]}).json()
    assert r["ok"] and r["subtotal"] == p["price"]
    r = client.post("/api/cart/validate", json={"items": [{"variant_id": v["id"], "quantity": v["stock"] + 3}]}).json()
    assert not r["ok"] and r["lines"][0]["quantity"] == v["stock"]
    agotado = client.get("/api/products/top-asimetrico").json()["variants"][0]
    r = client.post("/api/cart/validate", json={"items": [{"variant_id": agotado["id"], "quantity": 1}]}).json()
    assert not r["ok"] and r["lines"][0]["message"] == "Sin stock"
    r = client.post("/api/cart/validate", json={"items": [{"variant_id": 999999, "quantity": 1}]}).json()
    assert not r["ok"]
    bad = client.post("/api/cart/validate", json={"items": [{"variant_id": v["id"], "quantity": 0}]})
    assert bad.status_code == 422
