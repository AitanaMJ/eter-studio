export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface Category extends CategoryRef {
  description: string;
  image_url: string | null;
  position: number;
  is_active: boolean;
}

export interface AdminCategory extends Category {
  product_count: number;
  created_at: string;
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string;
  position: number;
}

export interface Variant {
  id: number;
  sku: string;
  size: string;
  color: string;
  color_hex: string | null;
  stock: number;
}

export interface ColorOption {
  name: string;
  hex: string | null;
}

export interface ProductCard {
  id: number;
  sku: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  category: CategoryRef;
  images: ProductImage[];
  stock: number;
  is_new: boolean;
  is_featured: boolean;
  sizes: string[];
  colors: ColorOption[];
  created_at: string;
}

export interface ProductDetail extends ProductCard {
  description: string;
  variants: Variant[];
}

export interface AdminProduct extends ProductDetail {
  is_active: boolean;
  updated_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Filters {
  categories: Category[];
  sizes: string[];
  colors: ColorOption[];
  min_price: number;
  max_price: number;
}

export interface StoreSettings {
  store_name: string;
  slogan: string;
  logo_url: string | null;
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta: string;
  hero_image_url: string | null;
  categories_title: string;
  new_arrivals_title: string;
  featured_title: string;
  promo_eyebrow: string;
  promo_title: string;
  promo_text: string;
  promo_cta: string;
  promo_image_url: string | null;
  about_title: string;
  about_text: string;
  whatsapp: string;
  instagram: string;
  email: string;
  address: string;
  shipping_info: string;
  returns_info: string;
  updated_at?: string | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "demo";
}

export interface CartItem {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  size: string;
  color: string;
  price: number;
  quantity: number;
  maxStock: number;
}

export interface CartValidation {
  ok: boolean;
  subtotal: number;
  lines: {
    variant_id: number;
    product_id: number;
    name: string;
    slug: string;
    size: string;
    color: string;
    unit_price: number;
    requested: number;
    available: number;
    quantity: number;
    ok: boolean;
    message: string | null;
  }[];
}
