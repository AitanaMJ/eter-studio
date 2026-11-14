import type { CartItem } from "./types";

export const CART_KEY = "eter-cart-v1";
export const MAX_QTY = 99;

export type CartAction =
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "setQty"; variantId: number; quantity: number }
  | { type: "remove"; variantId: number }
  | { type: "sync"; updates: { variantId: number; quantity: number; price: number; maxStock: number }[] }
  | { type: "clear" }
  | { type: "replace"; items: CartItem[] };

const clampQty = (q: number, max: number) => Math.max(0, Math.min(Math.floor(q) || 0, max, MAX_QTY));

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const existing = state.find((i) => i.variantId === action.item.variantId);
      if (existing) {
        const quantity = clampQty(existing.quantity + action.quantity, action.item.maxStock);
        return state.map((i) => (i.variantId === existing.variantId ? { ...i, ...action.item, quantity } : i));
      }
      const quantity = clampQty(action.quantity, action.item.maxStock);
      return quantity > 0 ? [...state, { ...action.item, quantity }] : state;
    }
    case "setQty":
      return state
        .map((i) => (i.variantId === action.variantId ? { ...i, quantity: clampQty(action.quantity, i.maxStock) } : i))
        .filter((i) => i.quantity > 0);
    case "remove":
      return state.filter((i) => i.variantId !== action.variantId);
    case "sync": {
      const map = new Map(action.updates.map((u) => [u.variantId, u]));
      return state
        .map((i) => {
          const u = map.get(i.variantId);
          if (!u) return { ...i, quantity: 0 };
          return { ...i, price: u.price || i.price, maxStock: u.maxStock, quantity: clampQty(u.quantity, u.maxStock) };
        })
        .filter((i) => i.quantity > 0);
    }
    case "clear":
      return [];
    case "replace":
      return action.items;
  }
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.quantity, 0);
}

function isCartItem(x: unknown): x is CartItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.variantId === "number" &&
    typeof o.productId === "number" &&
    typeof o.name === "string" &&
    typeof o.slug === "string" &&
    typeof o.price === "number" &&
    typeof o.quantity === "number" &&
    typeof o.maxStock === "number"
  );
}

/** Lee el carrito guardado descartando datos corruptos o manipulados. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(isCartItem)
      .map((i) => ({ ...i, size: String(i.size ?? ""), color: String(i.color ?? ""), quantity: clampQty(i.quantity, i.maxStock) }))
      .filter((i) => i.quantity > 0);
  } catch {
    return [];
  }
}
