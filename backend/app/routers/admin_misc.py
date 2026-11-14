from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..database import get_db
from ..deps import staff_user
from ..media import KIND_RULES, delete_if_unreferenced, referenced_urls, save_upload
from ..models import AdminUser, Category, Product, StoreSettings
from ..schemas import DashboardOut, SettingsIn, SettingsOut, UploadOut

router = APIRouter(prefix="/api/admin", tags=["Admin · General"])

# Campos que la cuenta demo no puede modificar (evita que un visitante cambie los datos de contacto reales)
DEMO_LOCKED_FIELDS = ("whatsapp", "instagram", "email")


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    s = get_settings()
    products = db.scalars(select(Product).options(selectinload(Product.variants))).all()
    stocks = [(p, p.stock) for p in products]
    low = sorted([(p, st) for p, st in stocks if 0 < st <= s.low_stock_threshold], key=lambda x: x[1])
    return DashboardOut(
        total_products=len(products),
        active_products=sum(p.is_active for p in products),
        inactive_products=sum(not p.is_active for p in products),
        out_of_stock=sum(st == 0 for _, st in stocks),
        low_stock=len(low),
        total_categories=db.scalar(select(func.count(Category.id))) or 0,
        featured_products=sum(p.is_featured for p in products),
        low_stock_threshold=s.low_stock_threshold,
        low_stock_items=[{"id": p.id, "name": p.name, "sku": p.sku, "stock": st} for p, st in low[:8]],
        demo_mode=s.demo_mode,
    )


@router.get("/settings", response_model=SettingsOut)
def get_store_settings(db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    s = db.get(StoreSettings, 1)
    if not s:
        s = StoreSettings(id=1)
        db.add(s)
        db.commit()
    return s


@router.put("/settings", response_model=SettingsOut)
def update_store_settings(data: SettingsIn, db: Session = Depends(get_db), user: AdminUser = Depends(staff_user)):
    s = db.get(StoreSettings, 1) or StoreSettings(id=1)
    db.add(s)
    if user.role == "demo":
        changed = [f for f in DEMO_LOCKED_FIELDS if getattr(data, f) != (getattr(s, f) or "")]
        if changed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "La cuenta demo no puede modificar WhatsApp, Instagram ni correo de contacto"
            )
    old_imgs = {s.logo_url, s.hero_image_url, s.promo_image_url}
    for field, value in data.model_dump(exclude={"featured_product_ids"}).items():
        setattr(s, field, value)
    if data.featured_product_ids is not None:
        ids = set(data.featured_product_ids)
        found = set(db.scalars(select(Product.id).where(Product.id.in_(ids))))
        if found != ids:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Hay productos destacados inexistentes")
        db.execute(update(Product).values(is_featured=Product.id.in_(ids)))
    db.commit()
    delete_if_unreferenced(db, {u for u in old_imgs if u} - {s.logo_url, s.hero_image_url, s.promo_image_url})
    db.refresh(s)
    return s


@router.get("/uploads/rules", summary="Reglas y dimensiones recomendadas por tipo de imagen")
def upload_rules(user: AdminUser = Depends(staff_user)):
    s = get_settings()
    return {
        "max_mb": s.demo_max_upload_mb if user.role == "demo" else s.max_upload_mb,
        "formats": ["JPG", "PNG", "WEBP"],
        "kinds": {k: {"recommended": v["recommended"], "max": v["max"]} for k, v in KIND_RULES.items()},
    }


@router.post("/uploads", response_model=UploadOut, status_code=201, summary="Subir imagen (se optimiza a WebP)")
async def upload(
    kind: str = Form(...),
    file: UploadFile = File(...),
    user: AdminUser = Depends(staff_user),
):
    s = get_settings()
    return await save_upload(file, kind, s.demo_max_upload_mb if user.role == "demo" else s.max_upload_mb)


@router.delete("/uploads", status_code=204, summary="Descartar imagen subida que no se usa")
def discard_upload(url: str = Query(...), db: Session = Depends(get_db), _: AdminUser = Depends(staff_user)):
    if url in referenced_urls(db):
        return  # sigue en uso: no se borra
    delete_if_unreferenced(db, {url})


# ---------- Modo demostración ----------
_demo_state: dict[str, datetime | None] = {"last_reset": None}


def mark_reset(when: datetime) -> None:
    _demo_state["last_reset"] = when


@router.get("/demo", summary="Estado del modo demostración")
def demo_status(_: AdminUser = Depends(staff_user)):
    s = get_settings()
    return {
        "demo_mode": s.demo_mode,
        "reset_interval_minutes": s.demo_reset_interval_minutes,
        "last_reset": _demo_state["last_reset"],
    }


@router.post("/demo/reset", summary="Restaurar datos de demostración")
def demo_reset(db: Session = Depends(get_db), user: AdminUser = Depends(staff_user)):
    if not get_settings().demo_mode:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "El restablecimiento sólo está disponible en modo demostración")
    from ..seed.seed import run_seed

    result = run_seed(db, reset=True)
    mark_reset(datetime.now().astimezone())
    return {"ok": True, **result}
