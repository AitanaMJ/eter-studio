from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="admin")  # admin | demo
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (CheckConstraint("role in ('admin','demo')", name="ck_admin_role"),)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    price: Mapped[int] = mapped_column(Integer)  # ARS, sin decimales
    compare_at_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Category] = relationship(back_populates="products")
    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductVariant.position"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.position"
    )

    __table_args__ = (
        CheckConstraint("price > 0", name="ck_product_price_positive"),
        CheckConstraint(
            "compare_at_price IS NULL OR compare_at_price > price", name="ck_product_compare_price"
        ),
    )

    @property
    def stock(self) -> int:
        return sum(v.stock for v in self.variants)


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    sku: Mapped[str] = mapped_column(String(60), unique=True)
    size: Mapped[str] = mapped_column(String(20), default="")  # "" = talle único / no aplica
    color: Mapped[str] = mapped_column(String(40), default="")  # "" = sin color
    color_hex: Mapped[str | None] = mapped_column(String(7), nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    position: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[Product] = relationship(back_populates="variants")

    __table_args__ = (
        UniqueConstraint("product_id", "size", "color", name="uq_variant_combo"),
        CheckConstraint("stock >= 0", name="ck_variant_stock_nonneg"),
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    alt: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[Product] = relationship(back_populates="images")

    __table_args__ = (Index("ix_product_images_url", "url"),)


class StoreSettings(Base):
    """Configuración de la tienda (fila única id=1)."""

    __tablename__ = "store_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    store_name: Mapped[str] = mapped_column(String(80), default="ÉTER Studio")
    slogan: Mapped[str] = mapped_column(String(120), default="WEAR YOUR IDENTITY.")
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    hero_eyebrow: Mapped[str] = mapped_column(String(120), default="")
    hero_title: Mapped[str] = mapped_column(String(160), default="")
    hero_subtitle: Mapped[str] = mapped_column(Text, default="")
    hero_cta: Mapped[str] = mapped_column(String(60), default="Explorar colección")
    hero_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    categories_title: Mapped[str] = mapped_column(String(120), default="")
    new_arrivals_title: Mapped[str] = mapped_column(String(120), default="")
    featured_title: Mapped[str] = mapped_column(String(120), default="")

    promo_eyebrow: Mapped[str] = mapped_column(String(120), default="")
    promo_title: Mapped[str] = mapped_column(String(160), default="")
    promo_text: Mapped[str] = mapped_column(Text, default="")
    promo_cta: Mapped[str] = mapped_column(String(60), default="")
    promo_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    about_title: Mapped[str] = mapped_column(String(160), default="")
    about_text: Mapped[str] = mapped_column(Text, default="")

    whatsapp: Mapped[str] = mapped_column(String(30), default="")
    instagram: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    address: Mapped[str] = mapped_column(String(200), default="")
    shipping_info: Mapped[str] = mapped_column(Text, default="")
    returns_info: Mapped[str] = mapped_column(Text, default="")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (CheckConstraint("id = 1", name="ck_settings_singleton"),)
