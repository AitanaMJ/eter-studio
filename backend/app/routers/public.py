from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Category, Product, ProductVariant, StoreSettings
from ..queries import PRODUCT_LOAD, paginate, public_products_stmt
from ..schemas import (
    CartValidateIn,
    CartValidateOut,
    CategoryOut,
    FiltersOut,
    Page,
    ProductCard,
    ProductDetail,
    SettingsOut,
)
from ..services import serialize_card, serialize_detail, size_key

router = APIRouter(prefix="/api", tags=["Tienda pública"])


@router.get("/settings", response_model=SettingsOut, summary="Configuración pública de la tienda")
def public_settings(db: Session = Depends(get_db)):
    s = db.get(StoreSettings, 1)
    if not s:
        s = StoreSettings(id=1)
    return s


@router.get("/categories", response_model=list[CategoryOut], summary="Categorías activas")
def categories(db: Session = Depends(get_db)):
    return db.scalars(
        select(Category).where(Category.is_active.is_(True)).order_by(Category.position, Category.name)
    ).all()


@router.get("/products", summary="Listado de productos con búsqueda, filtros, orden y paginación")
def products(
    q: str | None = Query(None, max_length=80, description="Búsqueda por nombre o SKU"),
    category: str | None = Query(None, description="Slugs de categoría separados por coma"),
    sizes: str | None = Query(None, description="Talles separados por coma"),
    colors: str | None = Query(None, description="Colores separados por coma"),
    min_price: int | None = Query(None, ge=0),
    max_price: int | None = Query(None, ge=0),
    featured: bool | None = None,
    on_sale: bool | None = None,
    in_stock: bool | None = None,
    sort: str = Query("newest", pattern="^(newest|price_asc|price_desc|name_asc|name_desc)$"),
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(12, ge=1, le=48),
    db: Session = Depends(get_db),
) -> Page:
    stmt = public_products_stmt(q, category, sizes, colors, min_price, max_price, featured, on_sale, in_stock)
    items, total, pages = paginate(db, stmt, page, page_size, sort)
    return Page(
        items=[ProductCard.model_validate(serialize_card(p)) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/products/filters", response_model=FiltersOut, summary="Valores disponibles para filtros")
def filters(db: Session = Depends(get_db)):
    active = (
        select(Product.id)
        .join(Category)
        .where(Product.is_active.is_(True), Category.is_active.is_(True))
        .scalar_subquery()
    )
    sizes = {s for s in db.scalars(select(ProductVariant.size).where(ProductVariant.product_id.in_(active))) if s}
    colors: dict[str, str | None] = {}
    for name, hex_ in db.execute(
        select(ProductVariant.color, ProductVariant.color_hex)
        .where(ProductVariant.product_id.in_(active), ProductVariant.color != "")
        .order_by(ProductVariant.color)
    ):
        colors.setdefault(name, hex_)
    lo, hi = db.execute(select(func.min(Product.price), func.max(Product.price)).where(Product.id.in_(active))).one()
    cats = db.scalars(
        select(Category).where(Category.is_active.is_(True)).order_by(Category.position, Category.name)
    ).all()
    return FiltersOut(
        categories=[CategoryOut.model_validate(c) for c in cats],
        sizes=sorted(sizes, key=size_key),
        colors=[{"name": k, "hex": v} for k, v in colors.items()],
        min_price=lo or 0,
        max_price=hi or 0,
    )


def _get_public_product(db: Session, slug: str) -> Product:
    p = db.scalar(
        select(Product)
        .join(Category)
        .options(*PRODUCT_LOAD)
        .where(Product.slug == slug, Product.is_active.is_(True), Category.is_active.is_(True))
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return p


@router.get("/products/{slug}", response_model=ProductDetail, summary="Detalle de producto")
def product_detail(slug: str, db: Session = Depends(get_db)):
    return serialize_detail(_get_public_product(db, slug))


@router.get("/products/{slug}/related", response_model=list[ProductCard], summary="Productos relacionados")
def related(slug: str, limit: int = Query(4, ge=1, le=12), db: Session = Depends(get_db)):
    p = _get_public_product(db, slug)
    base = public_products_stmt().where(Product.id != p.id).options(*PRODUCT_LOAD)
    same = list(db.scalars(base.where(Product.category_id == p.category_id).order_by(Product.created_at.desc()).limit(limit)))
    if len(same) < limit:
        ids = [x.id for x in same] + [p.id]
        same += list(
            db.scalars(base.where(Product.id.not_in(ids), Product.is_featured.is_(True)).limit(limit - len(same)))
        )
    return [serialize_card(x) for x in same]


@router.post("/cart/validate", response_model=CartValidateOut, summary="Valida stock y precios actuales del carrito")
def validate_cart(data: CartValidateIn, db: Session = Depends(get_db)):
    ids = [i.variant_id for i in data.items]
    variants = {
        v.id: v
        for v in db.scalars(
            select(ProductVariant)
            .options(selectinload(ProductVariant.product).selectinload(Product.category))
            .where(ProductVariant.id.in_(ids))
        )
    }
    requested: dict[int, int] = {}
    for item in data.items:  # agrupa la misma variante si viene repetida
        requested[item.variant_id] = requested.get(item.variant_id, 0) + item.quantity

    lines, subtotal, all_ok = [], 0, True
    for vid, qty in requested.items():
        v = variants.get(vid)
        if not v or not v.product.is_active or not v.product.category.is_active:
            all_ok = False
            lines.append(
                dict(variant_id=vid, product_id=0, name="Producto no disponible", slug="", size="", color="",
                     unit_price=0, requested=qty, available=0, quantity=0, ok=False,
                     message="Este producto ya no está disponible")
            )
            continue
        available = v.stock
        quantity = min(qty, available)
        ok = quantity == qty
        all_ok &= ok
        msg = None
        if available == 0:
            msg = "Sin stock"
        elif not ok:
            msg = f"Sólo quedan {available} unidades"
        subtotal += quantity * v.product.price
        lines.append(
            dict(variant_id=vid, product_id=v.product.id, name=v.product.name, slug=v.product.slug, size=v.size,
                 color=v.color, unit_price=v.product.price, requested=qty, available=available, quantity=quantity,
                 ok=ok, message=msg)
        )
    return CartValidateOut(ok=all_ok, lines=lines, subtotal=subtotal)
