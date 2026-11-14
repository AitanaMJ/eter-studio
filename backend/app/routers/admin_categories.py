from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import admin_only, staff_user
from ..media import delete_if_unreferenced
from ..models import AdminUser, Category, Product
from ..schemas import CategoryAdminOut, CategoryIn, ReorderIn, StatusIn
from ..services import unique_slug

router = APIRouter(prefix="/api/admin/categories", tags=["Admin · Categorías"])


def _out(db: Session, c: Category) -> dict:
    count = db.scalar(select(func.count(Product.id)).where(Product.category_id == c.id)) or 0
    return {**CategoryAdminOut.model_validate(c, from_attributes=True).model_dump(exclude={"product_count"}), "product_count": count}


def _get(db: Session, cid: int) -> Category:
    c = db.get(Category, cid)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada")
    return c


def _commit(db: Session):
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese nombre o slug") from e


@router.get("", response_model=list[CategoryAdminOut])
def list_categories(db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    cats = db.scalars(select(Category).order_by(Category.position, Category.name)).all()
    return [_out(db, c) for c in cats]


@router.post("", response_model=CategoryAdminOut, status_code=201)
def create_category(data: CategoryIn, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    if db.scalar(select(Category.id).where(func.lower(Category.name) == data.name.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese nombre")
    pos = data.position
    if pos is None:
        pos = (db.scalar(select(func.max(Category.position))) or 0) + 1
    c = Category(
        name=data.name,
        slug=unique_slug(db, Category, data.slug or data.name),
        description=data.description,
        image_url=data.image_url,
        is_active=data.is_active,
        position=pos,
    )
    db.add(c)
    _commit(db)
    return _out(db, c)


@router.put("/{cid}", response_model=CategoryAdminOut)
def update_category(cid: int, data: CategoryIn, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    c = _get(db, cid)
    if db.scalar(select(Category.id).where(func.lower(Category.name) == data.name.lower(), Category.id != cid)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese nombre")
    old_img = c.image_url
    c.name = data.name
    c.slug = unique_slug(db, Category, data.slug or data.name, cid)
    c.description = data.description
    c.image_url = data.image_url
    c.is_active = data.is_active
    if data.position is not None:
        c.position = data.position
    _commit(db)
    if old_img and old_img != c.image_url:
        delete_if_unreferenced(db, {old_img})
    return _out(db, c)


@router.patch("/{cid}/status", response_model=CategoryAdminOut)
def set_status(cid: int, data: StatusIn, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    c = _get(db, cid)
    c.is_active = data.is_active
    _commit(db)
    return _out(db, c)


@router.put("/order/apply", response_model=list[CategoryAdminOut], summary="Reordenar categorías")
def reorder(data: ReorderIn, db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    cats = {c.id: c for c in db.scalars(select(Category))}
    if set(data.ids) != set(cats):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "La lista debe incluir todas las categorías")
    for pos, cid in enumerate(data.ids):
        cats[cid].position = pos
    _commit(db)
    return [_out(db, cats[cid]) for cid in data.ids]


@router.delete("/{cid}", status_code=204, summary="Eliminar categoría sin productos (sólo administrador)")
def delete_category(cid: int, db: Session = Depends(get_db), _: AdminUser = Depends(admin_only)):
    c = _get(db, cid)
    count = db.scalar(select(func.count(Product.id)).where(Product.category_id == cid)) or 0
    if count:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"No se puede eliminar: tiene {count} producto(s) asociados. Reasignalos o desactivá la categoría.",
        )
    img = c.image_url
    db.delete(c)
    _commit(db)
    if img:
        delete_if_unreferenced(db, {img})
