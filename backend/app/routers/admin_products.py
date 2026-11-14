from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import admin_only, staff_user
from ..media import delete_if_unreferenced
from ..models import AdminUser, Product, ProductImage, ProductVariant
from ..queries import PRODUCT_LOAD, paginate, search_clause, stock_subquery
from ..schemas import Page, ProductAdminOut, ProductIn, StatusIn
from ..services import apply_product_payload, generate_sku, serialize_admin, unique_slug

router = APIRouter(prefix="/api/admin/products", tags=["Admin · Productos"])


def _get(db: Session, product_id: int) -> Product:
    p = db.scalar(select(Product).options(*PRODUCT_LOAD).where(Product.id == product_id))
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return p


def _commit(db: Session):
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Conflicto de datos: revisar SKU, slug o variantes") from e


@router.get("", summary="Listado administrativo")
def list_products(
    q: str | None = Query(None, max_length=80),
    category_id: int | None = None,
    status_: str | None = Query(None, alias="status", pattern="^(active|inactive)$"),
    stock: str | None = Query(None, pattern="^(out|low|available)$"),
    featured: bool | None = None,
    sort: str = Query("newest", pattern="^(newest|oldest|price_asc|price_desc|name_asc|name_desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(staff_user),
) -> Page:
    stmt = select(Product)
    if q and q.strip():
        stmt = stmt.where(search_clause(q))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if status_:
        stmt = stmt.where(Product.is_active.is_(status_ == "active"))
    if featured is not None:
        stmt = stmt.where(Product.is_featured.is_(featured))
    stock_sq = stock_subquery()
    threshold = get_settings().low_stock_threshold
    if stock == "out":
        stmt = stmt.where(stock_sq == 0)
    elif stock == "low":
        stmt = stmt.where(stock_sq > 0, stock_sq <= threshold)
    elif stock == "available":
        stmt = stmt.where(stock_sq > 0)
    items, total, pages = paginate(db, stmt, page, page_size, sort)
    return Page(
        items=[ProductAdminOut.model_validate(serialize_admin(p)) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{product_id}", response_model=ProductAdminOut)
def get_product(product_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    return serialize_admin(_get(db, product_id))


@router.post("", response_model=ProductAdminOut, status_code=201, summary="Crear producto")
def create_product(data: ProductIn, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    p = Product()
    db.add(p)
    apply_product_payload(db, p, data)
    _commit(db)
    return serialize_admin(_get(db, p.id))


@router.put("/{product_id}", response_model=ProductAdminOut, summary="Editar producto")
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    p = _get(db, product_id)
    removed = apply_product_payload(db, p, data)
    _commit(db)
    delete_if_unreferenced(db, removed)
    return serialize_admin(_get(db, p.id))


@router.patch("/{product_id}/status", response_model=ProductAdminOut, summary="Activar / desactivar")
def set_status(product_id: int, data: StatusIn, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    p = _get(db, product_id)
    p.is_active = data.is_active
    _commit(db)
    return serialize_admin(_get(db, p.id))


@router.patch("/{product_id}/featured", response_model=ProductAdminOut, summary="Marcar / desmarcar destacado")
def set_featured(product_id: int, data: dict, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    if not isinstance(data.get("is_featured"), bool):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "is_featured debe ser booleano")
    p = _get(db, product_id)
    p.is_featured = data["is_featured"]
    _commit(db)
    return serialize_admin(_get(db, p.id))


@router.post("/{product_id}/duplicate", response_model=ProductAdminOut, status_code=201, summary="Duplicar producto")
def duplicate(product_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    src = _get(db, product_id)
    name = f"{src.name} (copia)"[:120]
    copy = Product(
        name=name,
        slug=unique_slug(db, Product, name),
        sku=generate_sku(db, src.category),
        description=src.description,
        category_id=src.category_id,
        price=src.price,
        compare_at_price=src.compare_at_price,
        is_active=False,  # la copia queda inactiva hasta revisarla
        is_featured=False,
        images=[ProductImage(url=i.url, alt=i.alt, position=i.position) for i in src.images],
    )
    db.add(copy)
    db.flush()
    copy.variants = [
        ProductVariant(
            sku=f"{copy.sku}-{n + 1}", size=v.size, color=v.color, color_hex=v.color_hex, stock=v.stock, position=n
        )
        for n, v in enumerate(src.variants)
    ]
    _commit(db)
    return serialize_admin(_get(db, copy.id))


@router.delete("/{product_id}", status_code=204, summary="Eliminar producto (sólo administrador)")
def delete_product(product_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(admin_only)):
    p = _get(db, product_id)
    urls = {i.url for i in p.images}
    db.delete(p)
    _commit(db)
    delete_if_unreferenced(db, urls)
