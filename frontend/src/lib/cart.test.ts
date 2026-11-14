import { describe, expect, it } from "vitest";
import { cartCount, cartReducer, cartSubtotal, parseStoredCart } from "./cart";
import { formatPrice } from "./format";
import type { CartItem } from "./types";
import { buildOrderMessage, whatsappUrl } from "./whatsapp";

const base = {
  variantId: 1,
  productId: 10,
  slug: "remera-essential",
  name: "Remera Essential",
  image: null,
  size: "M",
  color: "Negro",
  price: 28900,
  maxStock: 3,
};

describe("carrito", () => {
  it("agrega y suma cantidades de la misma variante sin superar el stock", () => {
    let s: CartItem[] = [];
    s = cartReducer(s, { type: "add", item: base, quantity: 2 });
    s = cartReducer(s, { type: "add", item: base, quantity: 5 });
    expect(s).toHaveLength(1);
    expect(s[0].quantity).toBe(3);
  });

  it("variantes distintas son líneas distintas", () => {
    let s: CartItem[] = [];
    s = cartReducer(s, { type: "add", item: base, quantity: 1 });
    s = cartReducer(s, { type: "add", item: { ...base, variantId: 2, size: "L" }, quantity: 2 });
    expect(s).toHaveLength(2);
    expect(cartCount(s)).toBe(3);
    expect(cartSubtotal(s)).toBe(28900 * 3);
  });

  it("modifica cantidades, elimina en 0 y quita productos", () => {
    let s = cartReducer([], { type: "add", item: base, quantity: 2 });
    s = cartReducer(s, { type: "setQty", variantId: 1, quantity: 1 });
    expect(s[0].quantity).toBe(1);
    s = cartReducer(s, { type: "setQty", variantId: 1, quantity: 0 });
    expect(s).toHaveLength(0);
    s = cartReducer([], { type: "add", item: base, quantity: 1 });
    expect(cartReducer(s, { type: "remove", variantId: 1 })).toHaveLength(0);
  });

  it("no agrega productos sin stock", () => {
    expect(cartReducer([], { type: "add", item: { ...base, maxStock: 0 }, quantity: 1 })).toHaveLength(0);
  });

  it("sincroniza con stock y precios del servidor", () => {
    let s = cartReducer([], { type: "add", item: base, quantity: 3 });
    s = cartReducer(s, { type: "add", item: { ...base, variantId: 2 }, quantity: 1 });
    s = cartReducer(s, { type: "sync", updates: [{ variantId: 1, quantity: 2, price: 30000, maxStock: 2 }] });
    expect(s).toEqual([{ ...base, quantity: 2, price: 30000, maxStock: 2 }]);
  });

  it("descarta datos guardados corruptos", () => {
    expect(parseStoredCart("no-json")).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
    expect(parseStoredCart(JSON.stringify([{ foo: 1 }, { ...base, quantity: 2 }]))).toHaveLength(1);
    expect(parseStoredCart(JSON.stringify([{ ...base, quantity: 50 }]))[0].quantity).toBe(3);
  });
});

describe("mensaje de WhatsApp", () => {
  const items: CartItem[] = [
    { ...base, quantity: 2 },
    { ...base, variantId: 5, name: "Mini Bag", size: "", color: "Piedra", price: 64900, quantity: 1 },
  ];

  it("incluye productos, variantes, cantidades y total", () => {
    const msg = buildOrderMessage(items, "ÉTER Studio");
    expect(msg).toContain("¡Hola ÉTER Studio!");
    expect(msg).toContain("*1. Remera Essential*");
    expect(msg).toContain("Talle: M · Color: Negro");
    expect(msg).toContain(`Cantidad: 2 × ${formatPrice(28900)} = ${formatPrice(57800)}`);
    expect(msg).toContain("Talle único · Color: Piedra");
    expect(msg).toContain(`*Total: ${formatPrice(28900 * 2 + 64900)}*`);
    expect(msg).toContain("Productos: 3 unidades");
  });

  it("genera URL wa.me con número normalizado y texto codificado", () => {
    const url = whatsappUrl("+54 9 11 2233-4455", "Hola & chau");
    expect(url).toBe("https://wa.me/5491122334455?text=Hola%20%26%20chau");
  });

  it("formatea precios en pesos argentinos", () => {
    expect(formatPrice(128900)).toBe("$128.900");
  });
});
