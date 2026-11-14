import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .config import get_settings

MAX_PRICE = 100_000_000
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SKU_RE = re.compile(r"^[A-Z0-9][A-Z0-9-]{1,39}$")


def _strip(v: str | None) -> str | None:
    return v.strip() if isinstance(v, str) else v


def _media_url(v: str | None) -> str | None:
    """Sólo se aceptan imágenes administradas por el propio sistema (evita URLs externas arbitrarias)."""
    if v in (None, ""):
        return None
    prefix = get_settings().media_url.rstrip("/") + "/"
    if not v.startswith(prefix) or ".." in v:
        raise ValueError("La imagen debe subirse desde el panel")
    return v


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserOut(ORM):
    id: int
    email: str
    name: str
    role: str


# ---------- Categorías ----------
class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    slug: str | None = Field(default=None, max_length=100)
    description: str = Field(default="", max_length=600)
    image_url: str | None = None
    is_active: bool = True
    position: int | None = Field(default=None, ge=0, le=10_000)

    _s = field_validator("name", "description", mode="before")(_strip)
    _img = field_validator("image_url")(_media_url)

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str | None) -> str | None:
        if v in (None, ""):
            return None
        v = v.strip().lower()
        if not SLUG_RE.match(v):
            raise ValueError("Slug inválido: usar minúsculas, números y guiones")
        return v


class CategoryOut(ORM):
    id: int
    name: str
    slug: str
    description: str
    image_url: str | None
    position: int
    is_active: bool


class CategoryAdminOut(CategoryOut):
    product_count: int = 0
    created_at: datetime


class ReorderIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


class StatusIn(BaseModel):
    is_active: bool


# ---------- Productos ----------
class VariantIn(BaseModel):
    id: int | None = None
    size: str = Field(default="", max_length=20)
    color: str = Field(default="", max_length=40)
    color_hex: str | None = None
    stock: int = Field(ge=0, le=100_000)
    sku: str | None = Field(default=None, max_length=60)

    _s = field_validator("size", "color", mode="before")(_strip)

    @field_validator("color_hex")
    @classmethod
    def _hex(cls, v: str | None) -> str | None:
        if v in (None, ""):
            return None
        if not HEX_RE.match(v):
            raise ValueError("Color hexadecimal inválido (ej: #111111)")
        return v.upper()


class ImageIn(BaseModel):
    url: str
    alt: str = Field(default="", max_length=200)

    _u = field_validator("url")(_media_url)


class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str | None = Field(default=None, max_length=140)
    sku: str | None = Field(default=None, max_length=40)
    description: str = Field(default="", max_length=4000)
    category_id: int
    price: int = Field(gt=0, le=MAX_PRICE)
    compare_at_price: int | None = Field(default=None, gt=0, le=MAX_PRICE)
    is_active: bool = True
    is_featured: bool = False
    variants: list[VariantIn] = Field(min_length=1, max_length=120)
    images: list[ImageIn] = Field(default_factory=list, max_length=12)

    _s = field_validator("name", "description", mode="before")(_strip)

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str | None) -> str | None:
        if v in (None, ""):
            return None
        v = v.strip().lower()
        if not SLUG_RE.match(v):
            raise ValueError("Slug inválido: usar minúsculas, números y guiones")
        return v

    @field_validator("sku")
    @classmethod
    def _sku(cls, v: str | None) -> str | None:
        if v in (None, ""):
            return None
        v = v.strip().upper()
        if not SKU_RE.match(v):
            raise ValueError("SKU inválido: usar mayúsculas, números y guiones")
        return v

    @model_validator(mode="after")
    def _check(self):
        if self.compare_at_price is not None and self.compare_at_price <= self.price:
            raise ValueError("El precio anterior debe ser mayor al precio actual")
        combos = set()
        for v in self.variants:
            key = (v.size.lower(), v.color.lower())
            if key in combos:
                raise ValueError(f"Variante duplicada: {v.size or 'único'} / {v.color or 'sin color'}")
            combos.add(key)
        urls = [i.url for i in self.images]
        if len(urls) != len(set(urls)):
            raise ValueError("Hay imágenes repetidas")
        return self


class VariantOut(ORM):
    id: int
    sku: str
    size: str
    color: str
    color_hex: str | None
    stock: int


class ImageOut(ORM):
    id: int
    url: str
    alt: str
    position: int


class CategoryRef(ORM):
    id: int
    name: str
    slug: str


class ColorOut(BaseModel):
    name: str
    hex: str | None


class ProductCard(ORM):
    id: int
    sku: str
    name: str
    slug: str
    price: int
    compare_at_price: int | None
    category: CategoryRef
    images: list[ImageOut]
    stock: int
    is_new: bool
    is_featured: bool
    sizes: list[str]
    colors: list[ColorOut]
    created_at: datetime


class ProductDetail(ProductCard):
    description: str
    variants: list[VariantOut]


class ProductAdminOut(ProductDetail):
    is_active: bool
    updated_at: datetime


class Page(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int


class FiltersOut(BaseModel):
    categories: list[CategoryOut]
    sizes: list[str]
    colors: list[ColorOut]
    min_price: int
    max_price: int


# ---------- Carrito ----------
class CartItemIn(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=99)


class CartValidateIn(BaseModel):
    items: list[CartItemIn] = Field(min_length=1, max_length=60)


class CartLineOut(BaseModel):
    variant_id: int
    product_id: int
    name: str
    slug: str
    size: str
    color: str
    unit_price: int
    requested: int
    available: int
    quantity: int
    ok: bool
    message: str | None = None


class CartValidateOut(BaseModel):
    ok: bool
    lines: list[CartLineOut]
    subtotal: int


# ---------- Configuración ----------
class SettingsBase(BaseModel):
    store_name: str = Field(min_length=2, max_length=80)
    slogan: str = Field(default="", max_length=120)
    logo_url: str | None = None
    hero_eyebrow: str = Field(default="", max_length=120)
    hero_title: str = Field(default="", max_length=160)
    hero_subtitle: str = Field(default="", max_length=600)
    hero_cta: str = Field(default="", max_length=60)
    hero_image_url: str | None = None
    categories_title: str = Field(default="", max_length=120)
    new_arrivals_title: str = Field(default="", max_length=120)
    featured_title: str = Field(default="", max_length=120)
    promo_eyebrow: str = Field(default="", max_length=120)
    promo_title: str = Field(default="", max_length=160)
    promo_text: str = Field(default="", max_length=600)
    promo_cta: str = Field(default="", max_length=60)
    promo_image_url: str | None = None
    about_title: str = Field(default="", max_length=160)
    about_text: str = Field(default="", max_length=3000)
    whatsapp: str = Field(default="", max_length=30)
    instagram: str = Field(default="", max_length=120)
    email: str = Field(default="", max_length=255)
    address: str = Field(default="", max_length=200)
    shipping_info: str = Field(default="", max_length=3000)
    returns_info: str = Field(default="", max_length=3000)


class SettingsIn(SettingsBase):
    featured_product_ids: list[int] | None = Field(default=None, max_length=24)

    _imgs = field_validator("logo_url", "hero_image_url", "promo_image_url")(_media_url)

    @field_validator("whatsapp")
    @classmethod
    def _wa(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v or "")
        if v and not (8 <= len(digits) <= 15):
            raise ValueError("WhatsApp inválido: ingresar código de país y número, sólo dígitos (ej: 5491122334455)")
        return digits

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = (v or "").strip()
        if v and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Correo inválido")
        return v

    @field_validator("instagram")
    @classmethod
    def _ig(cls, v: str) -> str:
        v = (v or "").strip().lstrip("@")
        if v and not re.match(r"^[A-Za-z0-9._]{1,60}$", v):
            raise ValueError("Usuario de Instagram inválido")
        return v


class SettingsOut(SettingsBase, ORM):
    updated_at: datetime | None = None


# ---------- Uploads ----------
UploadKind = Literal["product", "category", "hero", "banner", "logo"]


class UploadOut(BaseModel):
    url: str
    width: int
    height: int
    size_kb: int


class DashboardOut(BaseModel):
    total_products: int
    active_products: int
    inactive_products: int
    out_of_stock: int
    low_stock: int
    total_categories: int
    featured_products: int
    low_stock_threshold: int
    low_stock_items: list[dict]
    demo_mode: bool
