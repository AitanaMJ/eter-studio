# ÉTER Studio — Catálogo web autoadministrable

**WEAR YOUR IDENTITY.**

Catálogo web autoadministrable de indumentaria y accesorios desarrollado por **GAP Programming**. Es una tienda demo
pensada para mostrar a clientes cómo funciona un catálogo propio: la tienda pública tiene un carrito que cierra la
venta por WhatsApp, y un panel de administración permite gestionar productos, variantes, stock, imágenes, categorías
y la apariencia del sitio sin tocar código.

> ÉTER Studio es una marca ficticia creada para esta demo. Los productos, textos y datos de contacto son de ejemplo.

| Capa | Tecnologías |
|---|---|
| Frontend | React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · GSAP + ScrollTrigger · React Router 7 · Lucide |
| Backend | Python 3.12+ · FastAPI · SQLAlchemy 2 · Alembic · Pydantic 2 · Argon2 · JWT en cookie httpOnly |
| Base de datos | PostgreSQL (probado con PostgreSQL 18) |

## Funcionalidades

### Tienda pública

- **Páginas:** Inicio con portada animada, Tienda, Colecciones, Producto, Nosotros y Contacto.
- **Catálogo:** búsqueda, filtros por categoría, talle, color, precio y ofertas, orden y paginación.
- **Ficha de producto:** galería con zoom, variantes de talle y color con stock individual, y productos relacionados.
- **Carrito:** panel lateral que se conserva al recargar la página y valida stock y precios contra el servidor.
- **Pedido por WhatsApp:** el carrito arma el mensaje con el detalle del pedido y el total.
- **Diseño:** editorial y responsive, con animaciones GSAP que respetan la preferencia de movimiento reducido.

### Panel de administración (`/admin`)

- **Dashboard:** métricas del catálogo, alertas de stock bajo y agotados, y accesos rápidos.
- **Productos:** alta, edición, duplicado, activación, destacados y eliminación.
- **Variantes:** generador de combinaciones de talle y color, con stock por variante.
- **Imágenes:** carga múltiple con arrastrar y soltar, reordenamiento y optimización automática a WebP.
- **Categorías:** imagen, orden y visibilidad.
- **Personalización:** identidad, portada, banner, títulos, destacados, contacto, envíos y la página Nosotros.
  Los cambios se ven en la tienda al instante.
- **Responsive:** el panel se adapta a celulares y tablets (de 360 px a escritorio), con barras de guardado fijas y
  navegación móvil.
- **Modo demo:** cuenta con permisos restringidos y restauración de los datos de ejemplo con un clic.

## Inicio rápido

```powershell
# 1. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env               # completar DATABASE_URL, SECRET_KEY y contraseñas
alembic upgrade head                 # crear el esquema en la base eter_studio
python -m app.seed                   # cargar los 30 productos demo y los usuarios
uvicorn app.main:app --reload --port 8000

# 2. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                          # http://localhost:5173 · panel en /admin
```

Las secciones siguientes detallan cada paso.

---

## 1. Requisitos

- **Python 3.12 o superior** (probado con 3.13)
- **Node.js 20 o superior** (probado con 22) y npm
- **PostgreSQL 14 o superior** (probado con 18). No requiere Docker.

## 2. Estructura

```
eter-studio/
├── backend/
│   ├── app/
│   │   ├── main.py            # App FastAPI, CORS, headers de seguridad, archivos estáticos
│   │   ├── config.py          # Variables de entorno (pydantic-settings)
│   │   ├── models.py          # Usuarios, categorías, productos, variantes, imágenes, configuración
│   │   ├── schemas.py         # Validaciones Pydantic
│   │   ├── security.py        # Argon2, JWT, límite de intentos de login
│   │   ├── media.py           # Subida, optimización WebP y limpieza de imágenes huérfanas
│   │   ├── routers/           # Endpoints públicos, auth y admin
│   │   └── seed/              # Seed idempotente + 68 imágenes demo optimizadas
│   ├── alembic/               # Migraciones
│   ├── tests/                 # Pruebas automatizadas (pytest)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/store/       # Inicio, Tienda, Producto, Colecciones, Nosotros, Contacto
    │   ├── pages/admin/       # Login, Dashboard, Productos, Categorías, Personalización
    │   ├── components/        # Header, carrito, tarjetas, uploader de imágenes, UI del panel
    │   └── lib/               # API, carrito, mensaje de WhatsApp, animaciones
    └── .env.example
```

## 3. Configuración de PostgreSQL

Crear la base de datos (una sola vez). Con PostgreSQL en el puerto **5433**:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5433 -U postgres -c "CREATE DATABASE eter_studio;"
# Opcional, para correr las pruebas automatizadas:
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5433 -U postgres -c "CREATE DATABASE eter_test;"
```

> Las migraciones sólo crean tablas nuevas dentro de `eter_studio`; no modifican otras bases.

## 4. Instalación

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Linux/Mac: source .venv/bin/activate
pip install -r requirements-dev.txt    # producción: requirements.txt
copy .env.example .env                 # y completar los valores (ver sección 5)
```

### Frontend

```powershell
cd frontend
npm install
```

## 5. Variables de entorno (`backend/.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://USUARIO:PASSWORD@localhost:5433/eter_studio` |
| `SECRET_KEY` | Clave para firmar sesiones. Generar: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ENVIRONMENT` | `development` o `production` (en producción exige `SECRET_KEY` propia) |
| `COOKIE_SECURE` | `true` en producción con HTTPS |
| `CORS_ORIGINS` | Orígenes permitidos del frontend, separados por coma |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Administrador que crea el seed |
| `DEMO_MODE` | `true` habilita cuenta demo y restauración de datos |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Cuenta demo con permisos restringidos |
| `DEMO_RESET_INTERVAL_MINUTES` | Restauración automática de la demo cada N minutos (0 = desactivada) |
| `MAX_UPLOAD_MB` / `DEMO_MAX_UPLOAD_MB` | Tamaño máximo de imágenes (admin / demo) |
| `LOW_STOCK_THRESHOLD` | Umbral de “stock bajo” en el dashboard |
| `FRONTEND_DIST` | (Opcional) ruta al build del frontend para servir todo desde FastAPI |

El frontend **no contiene secretos**: sólo usa `VITE_API_URL` (opcional) si la API vive en otro dominio.

## 6. Migraciones y datos demo

```powershell
cd backend
alembic upgrade head          # crea/actualiza el esquema
python -m app.seed            # carga 4 categorías, 30 productos, configuración y usuarios
```

El seed es **idempotente**: identifica productos por SKU y categorías por slug, así que ejecutarlo varias veces no
duplica nada ni pisa cambios hechos desde el panel.

Otros comandos útiles:

```powershell
python -m app.seed --reset              # restaura TODO el catálogo a los datos demo (pide confirmación)
python -m app.seed --users-only         # crea los usuarios definidos en .env
python -m app.seed --set-password admin@eterstudio.com   # cambia una contraseña (la pide por consola)
```

## 7. Ejecución en desarrollo

Dos terminales:

```powershell
# Terminal 1 — API en http://127.0.0.1:8000
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Tienda en http://localhost:5173
cd frontend
npm run dev
```

Vite redirige `/api` y `/media` al backend, por lo que no hace falta configurar CORS en desarrollo.

- Tienda: <http://localhost:5173>
- Panel: <http://localhost:5173/admin>
- Documentación de la API (Swagger): <http://127.0.0.1:8000/api/docs> · ReDoc: `/api/redoc`

## 8. Acceso al panel

Ingresar en **/admin** con el `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos en `.env` (el usuario se crea al correr
`python -m app.seed`). Cambiar la contraseña luego con `python -m app.seed --set-password <email>`.

### Cuenta demo para clientes

Con `DEMO_MODE=true` existe además la cuenta `DEMO_EMAIL` / `DEMO_PASSWORD`. Permisos de la cuenta demo:

| Puede | No puede |
|---|---|
| Crear, editar, duplicar, activar/desactivar productos | Eliminar productos ni categorías |
| Subir/reordenar imágenes (máx. `DEMO_MAX_UPLOAD_MB`) | Cambiar WhatsApp, Instagram ni correo de contacto |
| Crear/editar/reordenar categorías | Usarse si `DEMO_MODE=false` (queda bloqueada) |
| Editar textos, banner y destacados | |
| Restaurar los datos demo (botón en el panel) | |

**Producción vs. demo:** la cuenta demo y la restauración sólo funcionan con `DEMO_MODE=true`. La demo pública debe
correr en **su propia instancia y base de datos** (por ejemplo `eter_demo`); en la tienda real de un cliente se usa
`DEMO_MODE=false`, con lo que la cuenta demo no puede iniciar sesión y el endpoint de restauración responde 403.
Así, un visitante de la demo nunca puede alterar datos de producción. Con `DEMO_RESET_INTERVAL_MINUTES=60` la demo se
restaura sola cada hora.

## 9. Pruebas

```powershell
# Backend (usa la base eter_test: ¡la reinicia en cada ejecución!)
cd backend
$env:TEST_DATABASE_URL="postgresql+psycopg://postgres:PASSWORD@localhost:5433/eter_test"
pytest -q

# Frontend: carrito y mensaje de WhatsApp
cd frontend
npm test
npm run build      # typecheck + build de producción
```

Por seguridad, las pruebas se niegan a correr si el nombre de la base no contiene `_test`.

Cobertura de las pruebas de backend (38): autenticación (cookie httpOnly, hash Argon2id, rate limit, CSRF, rutas
protegidas), listado/búsqueda/filtros/orden/paginación, detalle y relacionados, CRUD de productos con variantes e
imágenes, validaciones de precio/stock/variantes/URLs, categorías (incluida la restricción de borrado con productos),
configuración reflejada en la tienda, subida/optimización/descartado de imágenes y limpieza de huérfanas, validación
de carrito contra stock real, permisos de la cuenta demo, restauración y seed idempotente.

## 10. Imágenes

- Formatos aceptados: JPG, PNG y WEBP. Se valida el contenido real del archivo (no sólo la extensión), el tamaño
  máximo y un mínimo de 200 px por lado.
- Se **optimizan automáticamente** a WebP (calidad 82), se corrige la orientación EXIF, se eliminan metadatos y se
  redimensionan **manteniendo la proporción** (nunca se agrandan).
- Dimensiones recomendadas (también se muestran en el panel):

| Uso | Recomendado |
|---|---|
| Hero / banner principal | 1920 × 900 px |
| Producto | 1000 × 1250 px (4:5) |
| Categoría | 800 × 1000 px |
| Banner secundario | 1600 × 600 px |

- **Sin archivos huérfanos:** al reemplazar o quitar una imagen, o al eliminar un producto/categoría, el archivo se
  borra si ya no lo usa ningún registro. Las imágenes subidas en un formulario que se cancela se descartan, y al
  iniciar el servidor se eliminan los archivos sin referencia con más de 1 hora de antigüedad.
- Las imágenes se guardan en `backend/uploads/` y se sirven en `/media/...`.

### Almacenamiento en producción

`backend/uploads/` debe ser un **volumen persistente** (no efímero) y estar incluido en los backups junto con la
base. En plataformas con disco efímero (Heroku, algunos PaaS) o con varias instancias, conviene migrar `media.py` a un
almacenamiento de objetos (S3, Cloudflare R2, DigitalOcean Spaces) detrás de una CDN: sólo hay que reemplazar el
guardado/borrado de archivos y devolver la URL pública; el resto del sistema guarda URLs y no cambia. Si se usa una
CDN en otro dominio, ajustar la validación `_media_url` de `schemas.py` para aceptar ese prefijo.

Las fotografías demo provienen de [Unsplash](https://unsplash.com) (licencia Unsplash, uso libre) y están incluidas
en `backend/app/seed/images/` ya optimizadas.

## 11. Despliegue

### Opción A — Un solo servidor (simple, ideal para la demo)

```bash
cd frontend && npm ci && npm run build
cd ../backend && pip install -r requirements.txt
# .env: ENVIRONMENT=production, SECRET_KEY propia, COOKIE_SECURE=true, FRONTEND_DIST=../frontend/dist
alembic upgrade head && python -m app.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers
```

FastAPI sirve la API, las imágenes y la SPA (con fallback a `index.html` para las rutas del frontend). Poner delante
un proxy con HTTPS (Nginx, Caddy, Traefik). Ejemplo Caddy:

```
tienda.ejemplo.com {
    reverse_proxy 127.0.0.1:8000
}
```

### Opción B — Frontend estático + API separada

- Publicar `frontend/dist` en Netlify/Vercel/Cloudflare Pages con regla SPA (`/* → /index.html`) y definir
  `VITE_API_URL=https://api.ejemplo.com` antes del build.
- Desplegar el backend y configurar `CORS_ORIGINS=https://tienda.ejemplo.com`, `COOKIE_SECURE=true`.
- Para que la cookie de sesión funcione entre dominios, usar subdominios del mismo sitio (`tienda.` / `api.`).
  Lo más simple es un proxy que sirva `/api` y `/media` desde el mismo dominio que el frontend.

### Checklist de producción

- [ ] `ENVIRONMENT=production`, `SECRET_KEY` única y larga, `COOKIE_SECURE=true`, HTTPS.
- [ ] Contraseña de administrador fuerte (`python -m app.seed --set-password`).
- [ ] `DEMO_MODE=false` en tiendas reales.
- [ ] Volumen persistente y backups de `uploads/` y de PostgreSQL (`pg_dump`).
- [ ] Usuario de PostgreSQL propio con permisos sólo sobre su base.
- [ ] Con varios workers/instancias, el límite de intentos de login es por proceso: para límites globales,
      usar el rate limiting del proxy o Redis.

## 12. API

Documentación interactiva en `/api/docs`. Resumen:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/settings` | Configuración pública de la tienda |
| GET | `/api/categories` | Categorías activas |
| GET | `/api/products` | Listado con `q`, `category`, `sizes`, `colors`, `min_price`, `max_price`, `on_sale`, `featured`, `sort`, `page` |
| GET | `/api/products/filters` | Talles, colores y rango de precios disponibles |
| GET | `/api/products/{slug}` · `/related` | Detalle y relacionados |
| POST | `/api/cart/validate` | Valida stock y precios actuales del carrito |
| POST | `/api/auth/login` · `/logout` · GET `/session` · `/me` | Sesión |
| GET/POST/PUT/DELETE | `/api/admin/products[/{id}]` | CRUD de productos (+ `PATCH /status`, `/featured`, `POST /duplicate`) |
| GET/POST/PUT/DELETE | `/api/admin/categories[/{id}]` | CRUD de categorías (+ `PATCH /status`, `PUT /order/apply`) |
| GET/PUT | `/api/admin/settings` | Personalización |
| POST/DELETE | `/api/admin/uploads` | Subir / descartar imágenes |
| GET | `/api/admin/dashboard` | Métricas |
| GET/POST | `/api/admin/demo` · `/demo/reset` | Estado y restauración del modo demo |

Las peticiones que modifican datos requieren el header `X-Eter-Client: web` (protección CSRF) además de la cookie de
sesión.

## 13. Seguridad implementada

- Contraseñas con **Argon2id**; credenciales iniciales sólo desde variables de entorno.
- Sesión en **cookie httpOnly + SameSite=Lax** (no accesible desde JavaScript), con expiración.
- Protección **CSRF** por header obligatorio + CORS restringido.
- **Límite de intentos** de login por IP y correo; respuesta uniforme para usuario inexistente.
- Validación de todos los datos en el backend (Pydantic + restricciones `CHECK`, `UNIQUE` y `FOREIGN KEY` en la base).
- Imágenes: validación del contenido real, límite de tamaño y de píxeles, re-codificación (descarta contenido embebido).
- Las imágenes de productos/configuración sólo pueden ser archivos subidos al propio sistema.
- Headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`; `Cache-Control: no-store` en el panel.

## 14. Fuera de alcance de esta versión

- Pagos online (el pedido se cierra por WhatsApp).
- Gestión de pedidos y descuento automático de stock al vender (el stock se ajusta manualmente desde el panel).
- Gestión de múltiples usuarios desde el panel (se administran por CLI/variables de entorno).

## Licencia

© GAP Programming. Todos los derechos reservados. El código se comparte con fines de demostración.

Las fotografías incluidas provienen de [Unsplash](https://unsplash.com) y se usan bajo la
[licencia de Unsplash](https://unsplash.com/license).
