import { Check, ChevronLeft, ChevronRight, Expand, Minus, Plus, ShoppingBag, X, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import ProductCard, { Badges, Price } from "../../components/store/ProductCard";
import { Img, SectionHeading } from "../../components/store/primitives";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { api, ApiError, mediaUrl } from "../../lib/api";
import { classNames, discountPercent, formatPrice } from "../../lib/format";
import { useBodyLock, useEscape } from "../../lib/hooks";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP, useReveal } from "../../lib/motion";
import type { ProductCard as Card, ProductDetail, ProductImage } from "../../lib/types";
import NotFound from "./NotFound";

export default function Product() {
  const { slug = "" } = useParams();
  const [p, setP] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<Card[]>([]);
  const [notFound, setNotFound] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    setP(null);
    setNotFound(false);
    api
      .get<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (cancel) return;
        setP(d);
        document.title = `${d.name} — ÉTER Studio`;
      })
      .catch((e) => !cancel && e instanceof ApiError && e.status === 404 && setNotFound(true));
    api.get<Card[]>(`/api/products/${encodeURIComponent(slug)}/related`).then((r) => !cancel && setRelated(r)).catch(() => {});
    return () => {
      cancel = true;
    };
  }, [slug]);

  useReveal(root, [related]);
  useEffect(() => {
    if (p) ScrollTrigger.refresh();
  }, [p, related]);

  if (notFound) return <NotFound />;

  return (
    <div ref={root} className="pb-24 pt-24 sm:pt-28">
      <div className="container-x">
        <nav aria-label="Ruta" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-ink/50">
          <Link to="/" className="hover:text-ink">Inicio</Link>/
          <Link to="/tienda" className="hover:text-ink">Tienda</Link>/
          {p ? (
            <>
              <Link to={`/tienda?category=${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link>/
              <span className="text-ink">{p.name}</span>
            </>
          ) : (
            <span className="skeleton inline-block h-3 w-24 rounded" />
          )}
        </nav>
        {p ? <ProductView key={p.id} p={p} /> : <ProductSkeleton />}
      </div>

      {related.length > 0 && (
        <section className="container-x mt-24 sm:mt-32">
          <SectionHeading eyebrow="Completá el look" title="También te puede gustar" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="skeleton aspect-[4/5] rounded-[24px] lg:col-span-7" />
      <div className="space-y-4 lg:col-span-5">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-12 w-3/4 rounded" />
        <div className="skeleton h-6 w-32 rounded" />
        <div className="skeleton mt-10 h-24 w-full rounded" />
      </div>
    </div>
  );
}

function ProductView({ p }: { p: ProductDetail }) {
  const { add, open: openCart } = useCart();
  const { settings } = useSettings();
  const colors = useMemo(() => {
    const m = new Map<string, string | null>();
    p.variants.forEach((v) => v.color && !m.has(v.color) && m.set(v.color, v.color_hex));
    return [...m.entries()].map(([name, hex]) => ({ name, hex }));
  }, [p]);
  const sizes = p.sizes;
  const hasSizes = sizes.length > 0;

  const firstAvailable = p.variants.find((v) => v.stock > 0);
  const [color, setColor] = useState<string>(firstAvailable?.color ?? colors[0]?.name ?? "");
  const [size, setSize] = useState<string>(hasSizes ? "" : "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const info = useRef<HTMLDivElement>(null);
  const addBtn = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const stockFor = (s: string, c: string) => p.variants.find((v) => v.size === s && v.color === c)?.stock ?? 0;
  const variant = p.variants.find((v) => v.size === (hasSizes ? size : "") && v.color === color);
  const colorStock = p.variants.filter((v) => v.color === color).reduce((a, v) => a + v.stock, 0);
  const available = variant ? variant.stock : hasSizes ? colorStock : 0;
  const soldOut = p.stock === 0;

  useEffect(() => {
    // si el talle elegido no tiene stock en el color nuevo, se limpia
    if (size && stockFor(size, color) === 0) setSize("");
    setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);
  useEffect(() => setQty((q) => Math.min(Math.max(1, q), Math.max(1, variant?.stock ?? 1))), [variant]);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo("[data-pd-in]", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 1.1, ease: "expo.out", delay: 0.15 });
        gsap.fromTo("[data-pd-media]", { clipPath: "inset(8% 6% 8% 6% round 24px)", autoAlpha: 0 }, { clipPath: "inset(0% 0% 0% 0% round 24px)", autoAlpha: 1, duration: 1.4, ease: "expo.out" });
      });
    },
    { scope: wrap, dependencies: [p.id] },
  );

  function handleAdd() {
    if (hasSizes && !size) {
      setSizeError(true);
      return;
    }
    if (!variant || variant.stock === 0) return;
    add(
      {
        variantId: variant.id,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        image: p.images[0]?.url ?? null,
        size: variant.size,
        color: variant.color,
        price: p.price,
        maxStock: variant.stock,
      },
      qty,
    );
    setAdded(true);
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.fromTo(addBtn.current, { scale: 0.96 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" });
    });
    window.setTimeout(() => openCart(), 550);
    window.setTimeout(() => setAdded(false), 2200);
  }

  const off = discountPercent(p.price, p.compare_at_price);

  return (
    <div ref={wrap} className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <Gallery images={p.images} name={p.name} active={active} setActive={setActive} onZoom={(i) => setLightbox(i)} badges={<Badges p={p} />} />

      <div ref={info} className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          <p data-pd-in className="eyebrow text-olive">{p.category.name}</p>
          <h1 data-pd-in className="mt-3 text-[clamp(2.2rem,4.5vw,3.6rem)] font-semibold leading-[0.95] tracking-[-0.035em]">
            {p.name}
          </h1>
          <div data-pd-in className="mt-5 flex flex-wrap items-center gap-3 text-xl">
            <Price price={p.price} compare={p.compare_at_price} />
            {off > 0 && <span className="rounded-full bg-sale/10 px-2.5 py-1 text-xs font-semibold text-sale">Ahorrás {formatPrice((p.compare_at_price ?? 0) - p.price)}</span>}
          </div>
          <p data-pd-in className="mt-6 max-w-prose text-[15px] leading-relaxed text-ink/70">{p.description}</p>

          {colors.length > 0 && (
            <div data-pd-in className="mt-8">
              <p className="mb-3 text-sm">
                <span className="text-ink/50">Color:</span> <span className="font-medium">{color}</span>
              </p>
              <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color">
                {colors.map((c) => {
                  const st = p.variants.filter((v) => v.color === c.name).reduce((a, v) => a + v.stock, 0);
                  return (
                    <button
                      key={c.name}
                      role="radio"
                      aria-checked={color === c.name}
                      aria-label={`${c.name}${st === 0 ? " (sin stock)" : ""}`}
                      title={c.name}
                      onClick={() => setColor(c.name)}
                      className={classNames(
                        "relative size-9 rounded-full ring-offset-2 ring-offset-ivory transition-all",
                        color === c.name ? "ring-2 ring-ink" : "ring-1 ring-ink/15 hover:ring-ink/50",
                      )}
                      style={{ background: c.hex ?? "#ccc" }}
                    >
                      {st === 0 && <span className="absolute inset-0 m-auto h-px w-[130%] -translate-x-[12%] rotate-45 bg-ink/60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasSizes && (
            <div data-pd-in className="mt-7">
              <div className="mb-3 flex items-center justify-between text-sm">
                <p>
                  <span className="text-ink/50">Talle:</span> <span className="font-medium">{size || "Elegí un talle"}</span>
                </p>
                <Link to="/contacto" className="text-xs text-ink/60 underline underline-offset-4 hover:text-ink">
                  ¿Dudas con el talle?
                </Link>
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Talle">
                {sizes.map((s) => {
                  const st = stockFor(s, color);
                  const exists = p.variants.some((v) => v.size === s && v.color === color);
                  return (
                    <button
                      key={s}
                      role="radio"
                      aria-checked={size === s}
                      disabled={!exists || st === 0}
                      onClick={() => {
                        setSize(s);
                        setSizeError(false);
                      }}
                      className={classNames(
                        "h-11 min-w-12 rounded-full border px-4 text-sm font-medium transition-all",
                        size === s ? "border-ink bg-ink text-ivory" : "border-ink/15 hover:border-ink",
                        (!exists || st === 0) && "cursor-not-allowed border-dashed text-ink/30 line-through hover:border-ink/15",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {sizeError && <p className="mt-2 text-xs text-sale" role="alert">Seleccioná un talle para continuar.</p>}
            </div>
          )}

          <div data-pd-in className="mt-6 min-h-5 text-sm" aria-live="polite">
            {soldOut ? (
              <span className="inline-flex items-center gap-2 text-ink/60"><span className="size-2 rounded-full bg-ink/40" /> Producto agotado</span>
            ) : variant ? (
              variant.stock === 0 ? (
                <span className="inline-flex items-center gap-2 text-ink/60"><span className="size-2 rounded-full bg-ink/40" /> Sin stock en esta variante</span>
              ) : variant.stock <= 3 ? (
                <span className="inline-flex items-center gap-2 text-sale"><span className="size-2 animate-pulse rounded-full bg-sale" /> ¡Últimas {variant.stock} unidades!</span>
              ) : (
                <span className="inline-flex items-center gap-2 text-olive-dark"><span className="size-2 rounded-full bg-[#6f8a52]" /> En stock · {variant.stock} disponibles</span>
              )
            ) : (
              <span className="text-ink/50">{available > 0 ? "Elegí un talle para ver el stock" : "Sin stock en este color"}</span>
            )}
          </div>

          <div data-pd-in className="mt-5 flex gap-3">
            <div className="inline-flex h-14 items-center rounded-full border border-ink/15">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="inline-flex size-12 items-center justify-center disabled:opacity-30"
                aria-label="Restar cantidad"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center tabular-nums" aria-label="Cantidad">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(variant?.stock ?? 1, q + 1))}
                disabled={!variant || qty >= variant.stock}
                className="inline-flex size-12 items-center justify-center disabled:opacity-30"
                aria-label="Sumar cantidad"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              ref={addBtn}
              onClick={handleAdd}
              disabled={soldOut || (variant ? variant.stock === 0 : !hasSizes)}
              className={classNames("btn-dark h-14 flex-1", added && "bg-[#3d4a32] hover:bg-[#3d4a32]")}
            >
              {added ? (
                <><Check className="size-4" /> Agregado al carrito</>
              ) : soldOut ? (
                "Agotado"
              ) : (
                <><ShoppingBag className="size-4" /> Agregar al carrito · {formatPrice(p.price * qty)}</>
              )}
            </button>
          </div>

          <div data-pd-in className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
            <Accordion title="Detalles" defaultOpen>
              <ul className="space-y-1.5">
                <li>SKU: {p.sku}</li>
                {colors.length > 0 && <li>Colores: {colors.map((c) => c.name).join(", ")}</li>}
                {hasSizes && <li>Talles: {sizes.join(" · ")}</li>}
              </ul>
            </Accordion>
            {settings.shipping_info && <Accordion title="Envíos">{settings.shipping_info}</Accordion>}
            {settings.returns_info && <Accordion title="Cambios y devoluciones">{settings.returns_info}</Accordion>}
          </div>
        </div>
      </div>

      {lightbox !== null && (
        <Lightbox images={p.images} start={lightbox} name={p.name} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function Accordion({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium">
        {title}
        <Plus className="size-4 transition-transform duration-300 group-open:rotate-45" />
      </summary>
      <div className="pb-5 text-sm leading-relaxed whitespace-pre-line text-ink/65">{children}</div>
    </details>
  );
}

function Gallery({
  images,
  name,
  active,
  setActive,
  onZoom,
  badges,
}: {
  images: ProductImage[];
  name: string;
  active: number;
  setActive: (i: number) => void;
  onZoom: (i: number) => void;
  badges: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("50% 50%");
  const [hoverZoom, setHoverZoom] = useState(false);

  // Mobile: sincroniza el índice con el scroll horizontal
  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  if (images.length === 0) {
    return (
      <div className="lg:col-span-7">
        <div className="flex aspect-[4/5] items-center justify-center rounded-[24px] bg-stone-soft text-ink/40">Sin imágenes</div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-7">
      {/* Mobile / tablet: carrusel con swipe */}
      <div className="relative lg:hidden" data-pd-media>
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-[24px]">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => onZoom(i)} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-stone-soft" aria-label={`Ampliar imagen ${i + 1}`}>
              <Img src={img.url} alt={img.alt || name} eager={i === 0} className="size-full object-cover" wrapperClassName="size-full" />
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute left-4 top-4">{badges}</div>
        {images.length > 1 && (
          <div className="mt-4 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                aria-label={`Ver imagen ${i + 1}`}
                onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
                className={classNames("h-1.5 rounded-full transition-all duration-500", i === active ? "w-6 bg-ink" : "w-1.5 bg-ink/25")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: miniaturas + imagen principal con zoom al pasar el mouse */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[84px_1fr]">
        <div className="flex flex-col gap-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1}`}
              aria-current={i === active}
              className={classNames("overflow-hidden rounded-xl transition-all duration-300", i === active ? "ring-2 ring-ink ring-offset-2 ring-offset-ivory" : "opacity-60 hover:opacity-100")}
            >
              <Img src={img.url} alt="" className="aspect-[4/5] w-full object-cover" />
            </button>
          ))}
        </div>
        <div
          ref={main}
          data-pd-media
          className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[24px] bg-stone-soft"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          onMouseEnter={() => setHoverZoom(true)}
          onMouseLeave={() => setHoverZoom(false)}
          onClick={() => onZoom(active)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onZoom(active)}
          aria-label="Abrir vista ampliada"
        >
          {images.map((img, i) => (
            <Img
              key={img.id}
              src={img.url}
              alt={img.alt || name}
              eager={i === 0}
              style={{ transformOrigin: origin }}
              className={classNames(
                "absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 ease-out",
                i === active ? "opacity-100!" : "opacity-0!",
                i === active && hoverZoom ? "scale-[1.6]" : "scale-100",
              )}
            />
          ))}
          <div className="pointer-events-none absolute left-5 top-5">{badges}</div>
          <span className="pointer-events-none absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-ivory/90 px-3.5 py-2 text-xs font-medium opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            <Expand className="size-3.5" /> Vista ampliada
          </span>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ images, start, name, onClose }: { images: ProductImage[]; start: number; name: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const ref = useRef<HTMLDivElement>(null);
  useBodyLock(true);
  useEscape(true, onClose);
  const go = (d: number) => {
    setZoom(false);
    setI((x) => (x + d + images.length) % images.length);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.fromTo(ref.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
    });
  });
  const img = images[i];
  return (
    <div ref={ref} className="fixed inset-0 z-[70] flex flex-col bg-ink/95 text-ivory" role="dialog" aria-modal="true" aria-label={`Imágenes de ${name}`}>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm text-ivory/60 tabular-nums">{i + 1} / {images.length}</span>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-ivory/50 sm:inline-flex"><ZoomIn className="size-3.5" /> Click para hacer zoom</span>
          <button onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory/10" aria-label="Cerrar vista ampliada" autoFocus>
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-16">
        <div
          className={classNames("relative h-full max-h-[85vh] w-full max-w-[760px] overflow-hidden rounded-2xl", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            setZoom((z) => !z);
          }}
          onMouseMove={(e) => {
            if (!zoom) return;
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
        >
          <img
            key={img.id}
            src={mediaUrl(img.url)}
            alt={img.alt || name}
            style={{ transformOrigin: origin }}
            className={classNames("size-full object-contain transition-transform duration-500 ease-out", zoom ? "scale-[2.2]" : "scale-100")}
          />
        </div>
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ivory/10 backdrop-blur hover:bg-ivory/20 sm:left-6" aria-label="Imagen anterior">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => go(1)} className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ivory/10 backdrop-blur hover:bg-ivory/20 sm:right-6" aria-label="Imagen siguiente">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
