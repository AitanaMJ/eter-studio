from math import ceil

from sqlalchemy import Select, and_, asc, desc, exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .models import Category, Product, ProductVariant

PRODUCT_LOAD = (
    selectinload(Product.category),
    selectinload(Product.variants),
    selectinload(Product.images),
)

SORTS = {
    "newest": (desc(Product.created_at), desc(Product.id)),
    "oldest": (asc(Product.created_at), asc(Product.id)),
    "price_asc": (asc(Product.price), asc(Product.id)),
    "price_desc": (desc(Product.price), asc(Product.id)),
    "name_asc": (asc(func.lower(Product.name)), asc(Product.id)),
    "name_desc": (desc(func.lower(Product.name)), asc(Product.id)),
}


def split(v: str | None) -> list[str]:
    return [x.strip() for x in (v or "").split(",") if x.strip()]


def stock_subquery():
    return (
        select(func.coalesce(func.sum(ProductVariant.stock), 0))
        .where(ProductVariant.product_id == Product.id)
        .correlate(Product)
        .scalar_subquery()
    )


def search_clause(q: str):
    term = f"%{q.strip()}%"
    return or_(Product.name.ilike(term), Product.sku.ilike(term))


def paginate(db: Session, stmt: Select, page: int, page_size: int, sort: str) -> tuple[list[Product], int, int]:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    pages = max(1, ceil(total / page_size))
    order = SORTS.get(sort, SORTS["newest"])
    items = list(
        db.scalars(stmt.options(*PRODUCT_LOAD).order_by(*order).offset((page - 1) * page_size).limit(page_size))
    )
    return items, total, pages


def public_products_stmt(
    q: str | None = None,
    category: str | None = None,
    sizes: str | None = None,
    colors: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    featured: bool | None = None,
    on_sale: bool | None = None,
    in_stock: bool | None = None,
) -> Select:
    stmt = (
        select(Product)
        .join(Category, Category.id == Product.category_id)
        .where(Product.is_active.is_(True), Category.is_active.is_(True))
    )
    if q and q.strip():
        stmt = stmt.where(search_clause(q))
    if cats := split(category):
        stmt = stmt.where(Category.slug.in_(cats))
    size_list, color_list = split(sizes), split(colors)
    if size_list or color_list:
        conds = [ProductVariant.product_id == Product.id]
        if size_list:
            conds.append(ProductVariant.size.in_(size_list))
        if color_list:
            conds.append(ProductVariant.color.in_(color_list))
        stmt = stmt.where(exists().where(and_(*conds)))
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if featured:
        stmt = stmt.where(Product.is_featured.is_(True))
    if on_sale:
        stmt = stmt.where(Product.compare_at_price.is_not(None))
    if in_stock:
        stmt = stmt.where(stock_subquery() > 0)
    return stmt
