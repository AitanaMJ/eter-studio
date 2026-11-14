"""Gestión de imágenes subidas: validación, optimización (WebP), borrado y limpieza de huérfanos."""

import io
import logging
import time
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Category, ProductImage, StoreSettings

log = logging.getLogger("eter.media")

Image.MAX_IMAGE_PIXELS = 40_000_000  # protección contra "decompression bombs"
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}

# Tamaño máximo final (se mantiene la proporción, nunca se agranda) y recomendación mostrada en el panel
KIND_RULES: dict[str, dict] = {
    "product": {"max": (1500, 1875), "recommended": (1000, 1250)},
    "category": {"max": (1200, 1500), "recommended": (800, 1000)},
    "hero": {"max": (2560, 1400), "recommended": (1920, 900)},
    "banner": {"max": (2400, 1000), "recommended": (1600, 600)},
    "logo": {"max": (800, 400), "recommended": (400, 120)},
}
MIN_SIDE = 200


def media_root() -> Path:
    root = Path(get_settings().media_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def url_to_path(url: str) -> Path | None:
    prefix = get_settings().media_url.rstrip("/") + "/"
    if not url or not url.startswith(prefix):
        return None
    root = media_root()
    p = (root / url[len(prefix):]).resolve()
    if root not in p.parents:
        return None
    return p


def path_to_url(path: Path) -> str:
    rel = path.resolve().relative_to(media_root()).as_posix()
    return f"{get_settings().media_url.rstrip('/')}/{rel}"


async def save_upload(file: UploadFile, kind: str, max_mb: float) -> dict:
    if kind not in KIND_RULES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tipo de imagen inválido")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Formato no permitido. Usar JPG, PNG o WEBP")

    limit = int(max_mb * 1024 * 1024)
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"La imagen supera {max_mb:g} MB")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Archivo vacío")

    try:
        probe = Image.open(io.BytesIO(data))
        fmt = probe.format
        probe.verify()
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, SyntaxError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo no es una imagen válida")
    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Formato no permitido. Usar JPG, PNG o WEBP")
    if min(img.size) < MIN_SIDE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"La imagen es muy chica (mínimo {MIN_SIDE}px por lado)")

    img = ImageOps.exif_transpose(img)  # respeta la orientación de fotos de celular
    keep_alpha = kind == "logo" and img.mode in ("RGBA", "LA", "P")
    img = img.convert("RGBA" if keep_alpha else "RGB")
    img.thumbnail(KIND_RULES[kind]["max"], Image.Resampling.LANCZOS)  # mantiene proporciones

    folder = media_root() / kind
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / f"{uuid.uuid4().hex}.webp"
    img.save(dest, "WEBP", quality=82, method=6)  # elimina metadatos EXIF
    return {
        "url": path_to_url(dest),
        "width": img.width,
        "height": img.height,
        "size_kb": round(dest.stat().st_size / 1024),
    }


def referenced_urls(db: Session) -> set[str]:
    urls: set[str] = set(db.scalars(select(ProductImage.url)))
    urls |= {u for u in db.scalars(select(Category.image_url)) if u}
    s = db.get(StoreSettings, 1)
    if s:
        urls |= {u for u in (s.logo_url, s.hero_image_url, s.promo_image_url) if u}
    return urls


def delete_if_unreferenced(db: Session, urls: set[str] | list[str]) -> int:
    """Borra del disco las imágenes indicadas si ya no las usa ningún registro."""
    if not urls:
        return 0
    used = referenced_urls(db)
    removed = 0
    for url in set(urls) - used:
        p = url_to_path(url)
        if p and p.is_file():
            try:
                p.unlink()
                removed += 1
            except OSError:
                log.warning("No se pudo borrar %s", p)
    return removed


def cleanup_orphans(db: Session, min_age_seconds: int = 3600) -> int:
    """Elimina archivos que no están referenciados en la base y tienen más de `min_age_seconds`.

    El margen de tiempo evita borrar imágenes recién subidas cuyo formulario aún no se guardó.
    """
    used = referenced_urls(db)
    now = time.time()
    removed = 0
    for p in media_root().rglob("*"):
        if not p.is_file() or p.name.startswith("."):
            continue
        if p.parent == media_root() / "static":  # imágenes fijas del sitio
            continue
        if now - p.stat().st_mtime < min_age_seconds:
            continue
        if path_to_url(p) not in used:
            try:
                p.unlink()
                removed += 1
            except OSError:
                log.warning("No se pudo borrar %s", p)
    if removed:
        log.info("Limpieza de imágenes: %s archivos huérfanos eliminados", removed)
    return removed
