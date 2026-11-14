"""Seed idempotente: crea lo que falta sin duplicar. Con reset=True restaura los datos de demostración."""

import logging
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..media import cleanup_orphans, media_root, path_to_url
from ..models import AdminUser, Category, Product, ProductImage, ProductVariant, StoreSettings
from ..security import hash_password
from . import data

log = logging.getLogger("eter.seed")
SEED_IMAGES = Path(__file__).resolve().parent / "images"
STATIC_FOLDER = "static"  # imágenes fijas del sitio (no se consideran huérfanas)


def _image_url(name: str, overwrite: bool = False, folder: str = "seed") -> str | None:
    src = SEED_IMAGES / f"{name}.webp"
    if not src.exists():
        return None
    dest_dir = media_root() / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name
    if overwrite or not dest.exists():
        shutil.copyfile(src, dest)
    return path_to_url(dest)


def _product_images(slug: str, overwrite: bool) -> list[str]:
    urls, n = [], 1
    while (SEED_IMAGES / f"{slug}-{n}.webp").exists():
        urls.append(_image_url(f"{slug}-{n}", overwrite))
        n += 1
    return urls


def ensure_users(db: Session) -> list[str]:
    """Crea los usuarios definidos en variables de entorno si no existen."""
    s = get_settings()
    created = []
    targets = [(s.admin_email, s.admin_password, s.admin_name, "admin")]
    if s.demo_mode:
        targets.append((s.demo_email, s.demo_password, "Cuenta demo", "demo"))
    for email, password, name, role in targets:
        if not email or not password:
            continue
        exists = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email.lower()))
        if not exists:
            db.add(AdminUser(email=email.lower(), name=name, password_hash=hash_password(password), role=role))
            created.append(email)
    db.commit()
    return created


def reset_password(db: Session, email: str, password: str) -> bool:
    user = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email.lower()))
    if not user:
        return False
    user.password_hash = hash_password(password)
    db.commit()
    return True


def run_seed(db: Session, reset: bool = False) -> dict:
    if reset:
        db.execute(delete(ProductImage))
        db.execute(delete(ProductVariant))
        db.execute(delete(Product))
        db.execute(delete(Category))
        db.execute(delete(StoreSettings))
        db.flush()

    now = datetime.now(UTC)
    stats = {"categories_created": 0, "products_created": 0, "settings_created": False}

    # Categorías
    cats: dict[str, Category] = {}
    for pos, c in enumerate(data.CATEGORIES):
        cat = db.scalar(select(Category).where(Category.slug == c["slug"]))
        if not cat:
            cat = Category(
                slug=c["slug"],
                name=c["name"],
                description=c["description"],
                image_url=_image_url(c["image"], reset),
                position=pos,
                is_active=True,
            )
            db.add(cat)
            stats["categories_created"] += 1
        cats[c["slug"]] = cat
    db.flush()

    # Productos (identificados por SKU)
    existing = set(db.scalars(select(Product.sku)))
    for (sku, name, slug, cat_slug, price, compare, sizes, colors, featured, days, desc, profile) in data.PRODUCTS:
        if sku in existing:
            continue
        if db.scalar(select(Product.id).where(Product.slug == slug)):
            continue
        pattern = data.STOCK_PATTERNS[profile]
        variants, k = [], 0
        for color in colors:
            for size in sizes:
                parts = [sku, size, color[:3].upper().replace("Í", "I")]
                variants.append(
                    ProductVariant(
                        sku="-".join(p for p in parts if p),
                        size=size,
                        color=color,
                        color_hex=data.C[color],
                        stock=pattern[k % len(pattern)],
                        position=k,
                    )
                )
                k += 1
        p = Product(
            sku=sku,
            name=name,
            slug=slug,
            description=desc,
            category=cats[cat_slug],
            price=price,
            compare_at_price=compare,
            is_active=True,
            is_featured=featured,
            created_at=now - timedelta(days=days, hours=k),
            variants=variants,
            images=[
                ProductImage(url=u, alt=f"{name} — vista {i + 1}", position=i)
                for i, u in enumerate(_product_images(slug, reset))
            ],
        )
        db.add(p)
        stats["products_created"] += 1

    # Configuración
    if not db.get(StoreSettings, 1):
        values = {k: v for k, v in data.SETTINGS.items() if k not in ("hero_image", "promo_image")}
        db.add(
            StoreSettings(
                id=1,
                **values,
                hero_image_url=_image_url(data.SETTINGS["hero_image"], reset),
                promo_image_url=_image_url(data.SETTINGS["promo_image"], reset),
            )
        )
        stats["settings_created"] = True

    db.commit()
    # Imágenes editoriales usadas por páginas estáticas (Colecciones / Nosotros)
    for extra in ("hero", "editorial-1", "editorial-2", "editorial-3", "editorial-4", "editorial-5"):
        _image_url(extra, reset, folder=STATIC_FOLDER)
    if reset:
        stats["orphans_removed"] = cleanup_orphans(db, min_age_seconds=0)
    stats["users_created"] = ensure_users(db)
    return stats
