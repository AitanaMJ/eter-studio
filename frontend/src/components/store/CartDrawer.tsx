import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { useBodyLock, useEscape } from "../../lib/hooks";
import { gsap, prefersReducedMotion, useGSAP } from "../../lib/motion";
import type { CartValidation } from "../../lib/types";
import { buildOrderMessage, whatsappUrl } from "../../lib/whatsapp";
import { Img } from "./primitives";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.09c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.1-1.47-1.1-2.81 0-1.33.7-1.99.95-2.26.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.55.79 1.9.86 2.04.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.34Z" />
    </svg>
  );
}

export { WhatsAppIcon };

export default function CartDrawer() {
  const { items, isOpen, close, dispatch, subtotal, count } = useCart();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(isOpen);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setNotice(null);
    }
  }, [isOpen]);
  useBodyLock(isOpen);
  useEscape(isOpen, close);

  useGSAP(
    () => {
      if (!mounted || !panel.current || !overlay.current) return;
      const reduced = prefersReducedMotion();
      if (isOpen) {
        closeBtn.current?.focus();
        if (reduced) return;
        gsap
          .timeline()
          .fromTo(overlay.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power2.out" })
          .fromTo(panel.current, { xPercent: 100 }, { xPercent: 0, duration: 0.8, ease: "expo.out" }, 0)
          .fromTo(
            panel.current.querySelectorAll("[data-cart-line]"),
            { autoAlpha: 0, x: 30 },
            { autoAlpha: 1, x: 0, stagger: 0.05, duration: 0.7 },
            0.2,
          );
      } else {
        if (reduced) return setMounted(false);
        gsap
          .timeline({ onComplete: () => setMounted(false) })
          .to(panel.current, { xPercent: 100, duration: 0.55, ease: "expo.in" })
          .to(overlay.current, { autoAlpha: 0, duration: 0.4 }, "-=0.3");
      }
    },
    { dependencies: [isOpen, mounted] },
  );

  async function checkout() {
    setNotice(null);
    if (!settings.whatsapp) {
      setNotice("La tienda todavía no configuró su número de WhatsApp.");
      return;
    }
    // Se abre la pestaña de inmediato (dentro del click) para evitar el bloqueo de popups
    const win = window.open("about:blank", "_blank");
    setChecking(true);
    try {
      const res = await api.post<CartValidation>("/api/cart/validate", {
        items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      });
      const priceChanged = res.lines.some((l) => {
        const it = items.find((i) => i.variantId === l.variant_id);
        return it && l.ok && l.unit_price !== it.price;
      });
      if (!res.ok || priceChanged) {
        win?.close();
        dispatch({
          type: "sync",
          updates: res.lines
            .filter((l) => l.product_id)
            .map((l) => ({ variantId: l.variant_id, quantity: l.quantity, price: l.unit_price, maxStock: l.available })),
        });
        setNotice(
          !res.ok
            ? "Actualizamos tu carrito: algunos productos cambiaron de stock. Revisalo y volvé a confirmar."
            : "Algunos precios se actualizaron. Revisá el total y volvé a confirmar.",
        );
        return;
      }
      const url = whatsappUrl(settings.whatsapp, buildOrderMessage(items, settings.store_name, { name, note }));
      if (win) {
        win.opener = null;
        win.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      win?.close();
      setNotice(e instanceof Error ? e.message : "No pudimos validar el carrito. Intentá nuevamente.");
    } finally {
      setChecking(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Carrito de compras">
      <div ref={overlay} className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={close} />
      <div
        ref={panel}
        className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-ivory shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-7">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-xl font-semibold">Tu carrito</h2>
            <span className="text-sm text-ink/50">({count})</span>
          </div>
          <button
            ref={closeBtn}
            onClick={close}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-ink/5"
            aria-label="Cerrar carrito"
          >
            <X className="size-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-stone-soft">
              <ShoppingBag className="size-6 text-ink/50" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold">Tu carrito está vacío</p>
              <p className="mt-2 text-sm text-ink/60">Descubrí la colección y armá tu pedido.</p>
            </div>
            <Link to="/tienda" onClick={close} className="btn-dark">
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-5 sm:px-7">
              {items.map((item) => (
                <li key={item.variantId} data-cart-line className="flex gap-4 py-5">
                  <Link to={`/producto/${item.slug}`} onClick={close} className="w-20 shrink-0 overflow-hidden rounded-lg bg-stone-soft sm:w-24">
                    <Img src={item.image} alt={item.name} className="aspect-[4/5] w-full object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/producto/${item.slug}`} onClick={close} className="font-medium leading-snug hover:underline">
                        {item.name}
                      </Link>
                      <button
                        onClick={() => dispatch({ type: "remove", variantId: item.variantId })}
                        className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink/40 hover:bg-ink/5 hover:text-ink"
                        aria-label={`Quitar ${item.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-ink/55">
                      {[item.size ? `Talle ${item.size}` : "Talle único", item.color].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="inline-flex items-center rounded-full border border-ink/15">
                        <button
                          className="inline-flex size-8 items-center justify-center disabled:opacity-30"
                          onClick={() => dispatch({ type: "setQty", variantId: item.variantId, quantity: item.quantity - 1 })}
                          aria-label="Restar una unidad"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          className="inline-flex size-8 items-center justify-center disabled:opacity-30"
                          disabled={item.quantity >= item.maxStock}
                          onClick={() => dispatch({ type: "setQty", variantId: item.variantId, quantity: item.quantity + 1 })}
                          aria-label="Sumar una unidad"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {item.quantity >= item.maxStock && (
                      <p className="mt-2 text-[11px] text-olive-dark">Máximo disponible: {item.maxStock}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink/10 bg-white/60 px-5 pb-5 pt-4 sm:px-7">
              <details className="group mb-3 text-sm">
                <summary className="cursor-pointer list-none text-ink/60 hover:text-ink">
                  <span className="underline underline-offset-4">Agregar nombre o comentario</span>
                </summary>
                <div className="mt-3 grid gap-2">
                  <input className="field" placeholder="Tu nombre" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                  <textarea
                    className="field resize-none"
                    rows={2}
                    maxLength={300}
                    placeholder="Comentario (envío, horario, etc.)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </details>
              {notice && (
                <p className="mb-3 flex gap-2 rounded-xl bg-[#f3e6dc] px-3 py-2.5 text-xs text-sale" role="alert">
                  <AlertCircle className="mt-px size-4 shrink-0" /> {notice}
                </p>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink/60">Subtotal</span>
                <span className="font-display text-2xl font-semibold tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-ink/50">Coordinás el envío y el pago directamente con la tienda.</p>
              <button onClick={checkout} disabled={checking} className="btn-dark mt-4 w-full bg-[#1f3b2c] py-4 hover:bg-[#17301f]">
                <WhatsAppIcon className="size-5" />
                {checking ? "Verificando stock…" : "Finalizar por WhatsApp"}
              </button>
              <button onClick={close} className="mt-2 w-full py-2 text-sm text-ink/60 hover:text-ink">
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
