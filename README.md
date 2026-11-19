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


## Licencia

© GAP Programming. Todos los derechos reservados. El código se comparte con fines de demostración.

Las fotografías incluidas provienen de [Unsplash](https://unsplash.com) y se usan bajo la
[licencia de Unsplash](https://unsplash.com/license).
