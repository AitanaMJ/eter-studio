const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** $ 28.900 → normaliza espacios para que el resultado sea estable entre navegadores/Node. */
export function formatPrice(value: number): string {
  return ars.format(value).replace(/\s/g, " ").replace("$ ", "$");
}

export function discountPercent(price: number, compare: number | null | undefined): number {
  if (!compare || compare <= price) return 0;
  return Math.round((1 - price / compare) * 100);
}

export function variantLabel(size: string, color: string): string {
  return [size && `Talle ${size}`, color].filter(Boolean).join(" · ") || "Talle único";
}

export function classNames(...v: (string | false | null | undefined)[]): string {
  return v.filter(Boolean).join(" ");
}
