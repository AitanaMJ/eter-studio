import { cartSubtotal } from "./cart";
import { formatPrice } from "./format";
import type { CartItem } from "./types";

export function buildOrderMessage(items: CartItem[], storeName: string, customer?: { name?: string; note?: string }): string {
  const lines: string[] = [];
  lines.push(`¡Hola ${storeName}! Quiero hacer el siguiente pedido:`);
  lines.push("");
  items.forEach((item, idx) => {
    lines.push(`*${idx + 1}. ${item.name}*`);
    const variant = [item.size ? `Talle: ${item.size}` : "Talle único", item.color ? `Color: ${item.color}` : ""]
      .filter(Boolean)
      .join(" · ");
    lines.push(`   ${variant}`);
    lines.push(`   Cantidad: ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}`);
  });
  lines.push("");
  const units = items.reduce((a, i) => a + i.quantity, 0);
  lines.push(`Productos: ${units} ${units === 1 ? "unidad" : "unidades"}`);
  lines.push(`*Total: ${formatPrice(cartSubtotal(items))}*`);
  if (customer?.name?.trim()) {
    lines.push("");
    lines.push(`Nombre: ${customer.name.trim()}`);
  }
  if (customer?.note?.trim()) {
    lines.push(`Comentario: ${customer.note.trim()}`);
  }
  lines.push("");
  lines.push("¿Me confirman disponibilidad y opciones de envío? ¡Gracias!");
  return lines.join("\n");
}

export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}
