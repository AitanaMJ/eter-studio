import re
import unicodedata
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import Category, Product, ProductImage, ProductVariant
from .schemas import ProductIn

NEW_PRODUCT_DAYS = 30
SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "item"


def size_key(size: str):
    s = size.upper()
    if s in SIZE_ORDER:
        return (0, SIZE_ORDER.index(s), s)
    if s.isdigit():
        return (1, int(s), s)
    return (2, 0, s)


def unique_slug(db: Session, model, base: str, exclude_id: int | None = None) -> str:
    base = slugify(base)[:120]
    slug, n = base, 2
    while True:
        q = select(model.id).where(model.slug == slug)
        if exclude_id:
            q = q.where(model.id != exclude_id)
        if not db.scalar(q):
            return slug
        slug, n = f"{base}-{n}", n + 1


def generate_sku(db: Session, category: Category) -> str:
    prefix = slugify(category.name).replace("-", "")[:3].upper() or "PRD"
    n = (db.scalar(select(func.count(Product.id))) or 0) + 1
    while True:
        sku = f"ETR-{prefix}-{n:03d}"
        if not db.scalar(select(Product.id).where(Product.sku == sku)):
            return sku
        n += 1


def is_new(p: Product) -> bool:
    created = p.created_at
    if created is None:
        return True
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    return created >= datetime.now(UTC) - timedelta(days=NEW_PRODUCT_DAYS)


def _colors(p: Product) -> list[dict]:
    seen: dict[str, str | None] = {}
    for v in p.variants:
        if v.color and v.color not in seen:
            seen[v.color] = v.color_hex
    return [{"name": k, "hex": h} for k, h in seen.items()]


def _sizes(p: Product) -> list[str]:
    return sorted({v.size for v in p.variants if v.size}, key=size_key)


def _images(p: Product, limit: int | None = None) -> list[dict]:
    imgs = p.images if limit is None else p.images[:limit]
    return [{"id": i.id, "url": i.url, "alt": i.alt or p.name, "position": i.position} for i in imgs]


def serialize_card(p: Product) -> dict:
    return {
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "slug": p.slug,
        "price": p.price,
        "compare_at_price": p.compare_at_price,
        "category": {"id": p.category.id, "name": p.category.name, "slug": p.category.slug},
        "images": _images(p, 2),
        "stock": p.stock,
        "is_new": is_new(p),
        "is_featured": p.is_featured,
        "sizes": _sizes(p),
        "colors": _colors(p),
        "created_at": p.created_at,
    }


def serialize_detail(p: Product) -> dict:
    data = serialize_card(p)
    data["images"] = _images(p)
    data["description"] = p.description
    data["variants"] = [
        {"id": v.id, "sku": v.sku, "size": v.size, "color": v.color, "color_hex": v.color_hex, "stock": v.stock}
        for v in p.variants
    ]
    return data


def serialize_admin(p: Product) -> dict:
    data = serialize_detail(p)
    data["is_active"] = p.is_active
    data["updated_at"] = p.updated_at
    return data


def apply_product_payload(db: Session, product: Product, data: ProductIn) -> set[str]:
    """Aplica el payload al producto. Devuelve las URLs de imágenes que dejaron de usarse."""
    category = db.get(Category, data.category_id)
    if not category:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "La categoría no existe")

    product.name = data.name
    product.description = data.description
    product.category = category
    product.price = data.price
    product.compare_at_price = data.compare_at_price
    product.is_active = data.is_active
    product.is_featured = data.is_featured
    product.slug = unique_slug(db, Product, data.slug or data.name, product.id)

    if data.sku:
        clash = db.scalar(select(Product.id).where(Product.sku == data.sku, Product.id != (product.id or 0)))
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, f"El SKU {data.sku} ya está en uso")
        product.sku = data.sku
    elif not product.sku:
        product.sku = generate_sku(db, category)

    # --- Variantes: actualizar existentes por id, crear nuevas, eliminar las quitadas
    existing = {v.id: v for v in product.variants}
    incoming_ids = {v.id for v in data.variants if v.id}
    removed = [v for vid, v in existing.items() if vid not in incoming_ids]
    if removed:  # borrar primero para liberar combinaciones talle/color reutilizadas
        product.variants = [v for v in product.variants if v.id in incoming_ids]
        db.flush()
    keep: list[ProductVariant] = []
    for pos, v in enumerate(data.variants):
        var = existing.get(v.id) if v.id else None
        if var is None:
            var = ProductVariant()
        var.size, var.color, var.color_hex, var.stock, var.position = v.size, v.color, v.color_hex, v.stock, pos
        if not var.sku:
            var.sku = f"TMP-{uuid.uuid4().hex[:20]}"
        keep.append(var)
    product.variants = keep
    try:
        db.flush()  # asigna ids / valida unicidad de combinaciones
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Conflicto de datos: revisar SKU, slug o variantes duplicadas")
    used_skus = set()
    for var in product.variants:
        if var.sku.startswith("TMP-") or var.sku in used_skus:
            parts = [product.sku, slugify(var.size).upper(), slugify(var.color).upper()[:6]]
            var.sku = "-".join(x for x in parts if x)[:55] + f"-{var.id}"
        used_skus.add(var.sku)

    # --- Imágenes: reemplazo completo respetando el orden recibido
    old_urls = {i.url for i in product.images}
    product.images = [
        ProductImage(url=i.url, alt=i.alt or data.name, position=pos) for pos, i in enumerate(data.images)
    ]
    return old_urls - {i.url for i in data.images}
