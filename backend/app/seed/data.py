"""Datos de demostración de ÉTER Studio (precios ficticios en ARS)."""

C = {
    "Negro": "#111111",
    "Blanco": "#FFFFFF",
    "Marfil": "#F5F3EE",
    "Piedra": "#D9D6CF",
    "Oliva": "#858579",
    "Camel": "#B08B5E",
    "Gris melange": "#A7A7A2",
    "Índigo": "#2F3E5C",
    "Celeste denim": "#8FA9C4",
    "Arena": "#CDBA9A",
    "Chocolate": "#5A3E2B",
    "Plata": "#C4C6C8",
    "Dorado": "#C8A964",
    "Rosa empolvado": "#D9B8B0",
    "Azul noche": "#1F2638",
    "Suela": "#8A5A3B",
}

TOPS = ["XS", "S", "M", "L", "XL"]
JEANS = ["36", "38", "40", "42", "44"]
UNICO: list[str] = [""]

CATEGORIES = [
    {
        "slug": "remeras-y-tops",
        "name": "Remeras y tops",
        "description": "Básicos de algodón premium y siluetas contemporáneas para el día a día.",
        "image": "cat-remeras",
    },
    {
        "slug": "pantalones-y-jeans",
        "name": "Pantalones y jeans",
        "description": "Denim rígido, sastrería relajada y cortes amplios que acompañan el movimiento.",
        "image": "cat-pantalones",
    },
    {
        "slug": "abrigos",
        "name": "Abrigos",
        "description": "Capas esenciales: blazers, camperas y tejidos suaves para cada estación.",
        "image": "cat-abrigos",
    },
    {
        "slug": "accesorios",
        "name": "Accesorios",
        "description": "Bolsos, joyería y detalles que completan tu identidad.",
        "image": "cat-accesorios",
    },
]

# (sku, nombre, slug, categoría, precio, precio_anterior, talles, colores, destacado, días_desde_alta, descripción, perfil_stock)
# perfil_stock: "normal" | "bajo" | "agotado" | "mixto"
PRODUCTS = [
    # ---- Remeras y tops (8)
    ("ETR-REM-001", "Remera Essential", "remera-essential", "remeras-y-tops", 28900, None, TOPS,
     ["Blanco", "Negro", "Piedra"], True, 4,
     "La remera que define el guardarropas. Jersey de algodón peinado 24/1 de 180 g, cuello redondo con ribb fino y "
     "calce regular. Suave al tacto, estructura que no se deforma lavado tras lavado.", "normal"),
    ("ETR-REM-002", "Remera Oversized", "remera-oversized", "remeras-y-tops", 32900, None, TOPS,
     ["Blanco", "Oliva", "Negro"], False, 9,
     "Silueta amplia con hombro caído y largo extendido. Algodón de 220 g con caída pesada, pensada para usar "
     "sola o como base de capas.", "normal"),
    ("ETR-REM-003", "Top Ribbed", "top-ribbed", "remeras-y-tops", 24900, 31900, ["XS", "S", "M", "L"],
     ["Negro", "Marfil"], False, 63,
     "Top de punto acanalado con elastano que abraza la figura. Cuello alto y manga larga: minimalismo puro "
     "para combinar con sastrería o denim.", "bajo"),
    ("ETR-REM-004", "Remera Graphic", "remera-graphic", "remeras-y-tops", 34900, None, TOPS,
     ["Blanco", "Marfil"], False, 14,
     "Remera con estampa editorial en serigrafía al agua de tacto suave. Algodón peinado y calce relajado, "
     "edición limitada de temporada.", "mixto"),
    ("ETR-REM-005", "Musculosa Basic", "musculosa-basic", "remeras-y-tops", 18900, None, ["XS", "S", "M", "L"],
     ["Blanco", "Negro", "Gris melange"], False, 71,
     "Musculosa de breteles finos en algodón con elastano. Ideal como primera capa o para los días de calor.",
     "normal"),
    ("ETR-REM-006", "Top Asimétrico", "top-asimetrico", "remeras-y-tops", 36900, None, ["XS", "S", "M"],
     ["Blanco"], False, 85,
     "Top de hombros descubiertos con volados asimétricos en poplín liviano. Una pieza protagonista para "
     "noches de verano.", "agotado"),
    ("ETR-REM-007", "Remera Boxy", "remera-boxy", "remeras-y-tops", 29900, None, TOPS,
     ["Negro", "Arena"], True, 18,
     "Corte boxy, cuadrado y corto, con mangas amplias. Jersey compacto de 200 g que mantiene la forma.",
     "normal"),
    ("ETR-REM-008", "Body Minimal", "body-minimal", "remeras-y-tops", 33900, 42900, ["XS", "S", "M", "L"],
     ["Negro", "Arena"], False, 47,
     "Body de manga larga con escote cruzado y cierre a presión. Tejido de microfibra con caída fluida que "
     "no marca.", "bajo"),
    # ---- Pantalones y jeans (8)
    ("ETR-PAN-001", "Jean Wide Leg", "jean-wide-leg", "pantalones-y-jeans", 74900, None, JEANS,
     ["Celeste denim", "Índigo"], True, 2,
     "Tiro alto y pierna amplia desde la cadera. Denim 100% algodón de 13 oz con lavado medio y terminación "
     "en ruedo ancho.", "normal"),
    ("ETR-PAN-002", "Jean Straight", "jean-straight", "pantalones-y-jeans", 69900, None, JEANS,
     ["Índigo", "Negro"], False, 35,
     "El recto de siempre, actualizado: tiro medio, pierna recta y denim rígido con un leve stretch para mayor "
     "comodidad.", "normal"),
    ("ETR-PAN-003", "Pantalón Cargo", "pantalon-cargo", "pantalones-y-jeans", 64900, 79900, TOPS,
     ["Oliva", "Arena", "Negro"], True, 22,
     "Gabardina de algodón con bolsillos laterales con fuelle, cintura con lazo interno y puño ajustable en "
     "el ruedo. Utility con estética limpia.", "mixto"),
    ("ETR-PAN-004", "Pantalón Sastrero", "pantalon-sastrero", "pantalones-y-jeans", 72900, None, ["XS", "S", "M", "L"],
     ["Rosa empolvado", "Negro"], False, 55,
     "Sastrería relajada con pinzas delanteras, tiro alto y botamanga con puño. Tela de lana fría con caída "
     "impecable.", "normal"),
    ("ETR-PAN-005", "Jogger Urban", "jogger-urban", "pantalones-y-jeans", 46900, None, TOPS,
     ["Gris melange", "Negro"], False, 30,
     "Frisa liviana de algodón perchado, cintura elastizada con cordón y puños. Comodidad absoluta con "
     "terminaciones premium.", "normal"),
    ("ETR-PAN-006", "Short Denim", "short-denim", "pantalones-y-jeans", 38900, 46900, JEANS[:4],
     ["Celeste denim"], False, 90,
     "Short de tiro alto con botamanga doblada y roturas sutiles. Denim rígido que se adapta al cuerpo con "
     "el uso.", "bajo"),
    ("ETR-PAN-007", "Pantalón Linen", "pantalon-linen", "pantalones-y-jeans", 58900, None, TOPS,
     ["Arena", "Blanco"], True, 6,
     "Lino con viscosa, fresco y liviano. Cintura con elástico posterior, pierna amplia y bolsillos "
     "laterales invisibles.", "normal"),
    ("ETR-PAN-008", "Jean Baggy", "jean-baggy", "pantalones-y-jeans", 78900, None, JEANS,
     ["Celeste denim", "Índigo"], False, 11,
     "Calce baggy de tiro medio, amplio en todo el largo. Lavado vintage y costuras reforzadas.", "normal"),
    # ---- Abrigos (6)
    ("ETR-ABR-001", "Campera Bomber", "campera-bomber", "abrigos", 129900, 159900, TOPS,
     ["Camel", "Negro"], True, 40,
     "Bomber de nylon satinado con relleno liviano, puños y cintura de ribb y bolsillo funcional en manga.",
     "mixto"),
    ("ETR-ABR-002", "Blazer Oversized", "blazer-oversized", "abrigos", 139900, None, ["XS", "S", "M", "L"],
     ["Camel", "Azul noche"], True, 8,
     "Blazer de hombros marcados y calce amplio, una sola botonadura y forrería completa. La pieza que eleva "
     "cualquier look.", "normal"),
    ("ETR-ABR-003", "Buzo Essential", "buzo-essential", "abrigos", 54900, None, TOPS,
     ["Blanco", "Camel"], False, 28,
     "Buzo cuello redondo en frisa de algodón de 320 g. Puños y cintura de ribb y costuras planas.", "normal"),
    ("ETR-ABR-004", "Hoodie Urban", "hoodie-urban", "abrigos", 62900, None, TOPS,
     ["Arena", "Gris melange"], False, 50,
     "Hoodie con capucha doble, bolsillo canguro y hombro caído. Frisa pesada de tacto suave.", "bajo"),
    ("ETR-ABR-005", "Campera Denim", "campera-denim", "abrigos", 98900, None, TOPS,
     ["Índigo", "Celeste denim"], False, 66,
     "Campera de jean clásica con cuello en contraste, bolsillos al pecho y botones metálicos grabados.",
     "normal"),
    ("ETR-ABR-006", "Cardigan Soft", "cardigan-soft", "abrigos", 69900, 84900, ["S", "M", "L"],
     ["Marfil", "Arena"], False, 15,
     "Tejido de punto con mezcla de lana y alpaca, extremadamente suave. Botones de nácar y calce relajado.",
     "normal"),
    # ---- Accesorios (8)
    ("ETR-ACC-001", "Bolso Shoulder", "bolso-shoulder", "accesorios", 89900, None, UNICO,
     ["Suela", "Negro"], True, 20,
     "Bolso de hombro en cuero vacuno con textura grabada, correa regulable y cierre de traba metálica.",
     "normal"),
    ("ETR-ACC-002", "Gorra Classic", "gorra-classic", "accesorios", 21900, None, UNICO,
     ["Gris melange", "Blanco"], False, 75,
     "Gorra de seis paneles en gabardina lavada, visera curva y ajuste posterior con hebilla.", "normal"),
    ("ETR-ACC-003", "Cinturón Minimal", "cinturon-minimal", "accesorios", 27900, None, ["85", "90", "95", "100"],
     ["Suela", "Negro"], False, 100,
     "Cinturón de cuero curtido al vegetal de 3 cm con hebilla de metal cepillado.", "mixto"),
    ("ETR-ACC-004", "Collar Silver", "collar-silver", "accesorios", 39900, None, UNICO,
     ["Plata"], False, 3,
     "Collar de plata 925 con dije calado y cadena forzada de 45 cm. Incluye estuche.", "bajo"),
    ("ETR-ACC-005", "Aros Sculpt", "aros-sculpt", "accesorios", 34900, None, UNICO,
     ["Dorado", "Plata"], False, 12,
     "Aros de forma orgánica en bronce con baño de oro de 18k. Livianos y escultóricos.", "normal"),
    ("ETR-ACC-006", "Mini Bag", "mini-bag", "accesorios", 64900, 74900, UNICO,
     ["Piedra", "Rosa empolvado"], False, 33,
     "Mini cartera estructurada con cadena desmontable y tachas tonales. Entra lo esencial.", "normal"),
    ("ETR-ACC-007", "Lentes Urban", "lentes-urban", "accesorios", 45900, None, UNICO,
     ["Dorado"], False, 44,
     "Anteojos de sol redondos con armazón metálico liviano y lentes polarizadas con filtro UV400.", "normal"),
    ("ETR-ACC-008", "Tote Bag", "tote-bag", "accesorios", 35900, None, UNICO,
     ["Arena", "Suela"], False, 58,
     "Tote de lona de algodón pesada con base reforzada y bolsillo interno. Para todo el día.", "normal"),
]

STOCK_PATTERNS = {
    "normal": [12, 8, 15, 6, 10, 4, 9, 7, 11, 5],
    "bajo": [2, 1, 0, 3, 1, 2, 0, 1],
    "agotado": [0],
    "mixto": [7, 0, 4, 12, 0, 3, 9, 2],
}

SETTINGS = {
    "store_name": "ÉTER Studio",
    "slogan": "WEAR YOUR IDENTITY.",
    "logo_url": None,
    "hero_eyebrow": "Colección Otoño · Invierno 26",
    "hero_title": "Siluetas que hablan por vos.",
    "hero_subtitle": "Prendas esenciales, cortes precisos y materiales nobles. Diseñadas en Buenos Aires para "
    "acompañar tu forma de moverte.",
    "hero_cta": "Explorar colección",
    "hero_image": "hero-alt",
    "categories_title": "Comprá por categoría",
    "new_arrivals_title": "Novedades",
    "featured_title": "Selección ÉTER",
    "promo_eyebrow": "Edición limitada",
    "promo_title": "Texturas de temporada. Hasta 20% off.",
    "promo_text": "Tejidos suaves, tonos tierra y capas pensadas para combinar entre sí. Stock limitado.",
    "promo_cta": "Ver ofertas",
    "promo_image": "banner",
    "about_title": "Ropa con intención.",
    "about_text": "ÉTER Studio nace en 2021 con una idea simple: menos prendas, mejor pensadas. Trabajamos con talleres "
    "locales, materiales nobles y una paleta atemporal para que cada pieza dure y se combine con todo lo demás.\n\n"
    "Creemos en la identidad antes que en la tendencia. Por eso diseñamos colecciones cortas, producidas en "
    "series pequeñas, con foco en el calce y en los detalles que se sienten.",
    "whatsapp": "5491122334455",
    "instagram": "eter.studio",
    "email": "hola@eterstudio.com",
    "address": "Showroom en Palermo, CABA — con cita previa",
    "shipping_info": "Envíos a todo el país por correo o moto en CABA y GBA. Envío gratis en compras superiores a "
    "$150.000. Despachamos dentro de las 48 h hábiles de confirmado el pedido.",
    "returns_info": "Tenés 30 días para cambiar tu compra. La prenda debe estar sin uso y con su etiqueta. El primer "
    "cambio es sin cargo; coordinalo por WhatsApp.",
}
