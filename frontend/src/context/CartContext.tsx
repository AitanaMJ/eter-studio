import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { CART_KEY, cartCount, cartReducer, cartSubtotal, parseStoredCart, type CartAction } from "../lib/cart";
import type { CartItem } from "../lib/types";

interface Ctx {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dispatch: (a: CartAction) => void;
  add: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  /** Se incrementa en cada agregado: lo usa el header para animar el contador. */
  bump: number;
}

const CartContext = createContext<Ctx | null>(null);

function load(): CartItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_KEY));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, load);
  const [isOpen, setOpen] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items]);

  // Sincroniza entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) dispatch({ type: "replace", items: parseStoredCart(e.newValue) });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity: number) => {
    dispatch({ type: "add", item, quantity });
    setBump((b) => b + 1);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      dispatch,
      add,
      bump,
    }),
    [items, isOpen, add, bump],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera de CartProvider");
  return ctx;
}
