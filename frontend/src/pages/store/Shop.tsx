import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard, { Pagination, ProductCardSkeleton } from "../../components/store/ProductCard";
import { SplitText } from "../../components/store/primitives";
import { api } from "../../lib/api";
import { classNames, formatPrice } from "../../lib/format";
import { useBodyLock, useDebounced, useEscape } from "../../lib/hooks";
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP, useReveal } from "../../lib/motion";
import type { Filters, Page, ProductCard as P } from "../../lib/types";

const SORTS = [
  { value: "newest", label: "Novedades" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre: A–Z" },
  { value: "name_desc", label: "Nombre: Z–A" },
];
const PAGE_SIZE = 12;

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters | null>(null);
  const [data, setData] = useState<Page<P> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debounced = useDebounced(search.trim(), 350);
  const searchRef = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const state = useMemo(
    () => ({
      q: params.get("q") ?? "",
      category: list(params.get("category")),
      sizes: list(params.get("sizes")),
      colors: list(params.get("colors")),
      min_price: params.get("min_price") ?? "",
      max_price: params.get("max_price") ?? "",
      on_sale: params.get("on_sale") === "1",
      featured: params.get("featured") === "1",
      sort: params.get("sort") ?? "newest",
      page: Math.max(1, Number(params.get("page")) || 1),
    }),
    [params],
  );

  function update(patch: Record<string, string | string[] | boolean | number | null>, resetPage = true) {
    const next = new URLSearchParams(params);
    next.delete("focus");
    for (const [k, v] of Object.entries(patch)) {
      const val = Array.isArray(v) ? v.join(",") : typeof v === "boolean" ? (v ? "1" : "") : v === null ? "" : String(v);
      if (val) next.set(k, val);
      else next.delete(k);
    }
    if (resetPage && !("page" in patch)) next.delete("page");
    setParams(next, { replace: false });
  }

  useEffect(() => {
    api.get<Filters>("/api/products/filters").then(setFilters).catch(() => {});
    if (params.get("focus") === "search") searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounced !== state.q) update({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setSearch((s) => (s.trim() === state.q ? s : state.q));
  }, [state.q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<Page<P>>("/api/products", {
        q: state.q,
        category: state.category.join(","),
        sizes: state.sizes.join(","),
        colors: state.colors.join(","),
        min_price: state.min_price,
        max_price: state.max_price,
        on_sale: state.on_sale || undefined,
        featured: state.featured || undefined,
        sort: state.sort,
        page: state.page,
        page_size: PAGE_SIZE,
      })
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [state]);

  useReveal(root, []);

  // Transición del grid al cambiar resultados
  useGSAP(
    () => {
      if (!data || !gridRef.current || prefersReducedMotion()) return;
      gsap.fromTo(
        gridRef.current.querySelectorAll("article"),
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.04, ease: "expo.out", clearProps: "transform" },
      );
      ScrollTrigger.refresh();
    },
    { dependencies: [data], scope: gridRef },
  );

  const activeChips: { label: string; remove: () => void }[] = [];
  state.category.forEach((slug) => {
    const c = filters?.categories.find((x) => x.slug === slug);
    activeChips.push({ label: c?.name ?? slug, remove: () => update({ category: state.category.filter((x) => x !== slug) }) });
  });
  state.sizes.forEach((s) => activeChips.push({ label: `Talle ${s}`, remove: () => update({ sizes: state.sizes.filter((x) => x !== s) }) }));
  state.colors.forEach((s) => activeChips.push({ label: s, remove: () => update({ colors: state.colors.filter((x) => x !== s) }) }));
  if (state.min_price || state.max_price)
    activeChips.push({
      label: `${state.min_price ? formatPrice(+state.min_price) : "$0"} – ${state.max_price ? formatPrice(+state.max_price) : "máx."}`,
      remove: () => update({ min_price: null, max_price: null }),
    });
  if (state.on_sale) activeChips.push({ label: "En oferta", remove: () => update({ on_sale: false }) });
  if (state.featured) activeChips.push({ label: "Destacados", remove: () => update({ featured: false }) });
  if (state.q) activeChips.push({ label: `“${state.q}”`, remove: () => { setSearch(""); update({ q: null }); } });

  const clearAll = () => {
    setSearch("");
    setParams(state.sort !== "newest" ? { sort: state.sort } : {});
  };

  const title = state.category.length === 1 ? filters?.categories.find((c) => c.slug === state.category[0])?.name ?? "Tienda" : state.on_sale ? "Ofertas" : "Tienda";

  const filterPanel = filters && (
    <FilterPanel filters={filters} state={state} update={update} />
  );

  return (
    <div ref={root} className="pb-24 pt-28 sm:pt-36">
      <div className="container-x">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-ink/10 pb-8">
          <div>
            <p className="eyebrow mb-3 text-olive">Catálogo</p>
            <h1 key={title} data-split className="text-[clamp(2.8rem,8vw,6.5rem)] font-semibold leading-[0.88] tracking-[-0.045em]">
              <SplitText text={title} />
            </h1>
          </div>
          <p className="text-sm text-ink/60" aria-live="polite">
            {data ? `${data.total} ${data.total === 1 ? "producto" : "productos"}` : " "}
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar productos</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              maxLength={80}
              className="field h-12 rounded-full bg-white/70 pl-11"
            />
          </label>
          <div className="flex gap-3">
            <button onClick={() => setDrawer(true)} className="btn-outline h-12 flex-1 py-0 lg:hidden">
              <SlidersHorizontal className="size-4" /> Filtros
              {activeChips.length > 0 && <span className="rounded-full bg-ink px-1.5 text-[10px] text-ivory">{activeChips.length}</span>}
            </button>
            <label className="relative flex-1 sm:flex-none">
              <span className="sr-only">Ordenar por</span>
              <select
                value={state.sort}
                onChange={(e) => update({ sort: e.target.value })}
                className="field h-12 w-full appearance-none rounded-full bg-white/70 pr-10 sm:w-60"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2" viewBox="0 0 12 12" aria-hidden>
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </label>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            {activeChips.map((c) => (
              <button key={c.label} onClick={c.remove} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs text-ivory hover:bg-ink-soft">
                {c.label} <X className="size-3" />
              </button>
            ))}
            <button onClick={clearAll} className="ml-1 text-xs text-ink/60 underline underline-offset-4 hover:text-ink">
              Limpiar todo
            </button>
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[240px_1fr] xl:gap-14">
          <aside className="hidden lg:block" aria-label="Filtros">
            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pb-8 pr-2 no-scrollbar">{filterPanel}</div>
          </aside>

          <div className="min-w-0">
            {error ? (
              <div className="rounded-2xl border border-ink/10 bg-white p-10 text-center">
                <p className="font-medium">No pudimos cargar los productos.</p>
                <p className="mt-1 text-sm text-ink/60">{error}</p>
              </div>
            ) : data && data.items.length === 0 && !loading ? (
              <div className="flex flex-col items-center rounded-[24px] bg-stone-soft px-6 py-20 text-center">
                <p className="font-display text-2xl font-semibold">Sin resultados</p>
                <p className="mt-2 max-w-sm text-sm text-ink/60">Probá con otra búsqueda o quitá algunos filtros para ver más productos.</p>
                <button onClick={clearAll} className="btn-dark mt-8">Ver todos los productos</button>
              </div>
            ) : (
              <div
                ref={gridRef}
                className={classNames("grid grid-cols-2 gap-x-3 gap-y-10 transition-opacity sm:gap-x-5 md:grid-cols-3", loading && data ? "opacity-50" : "")}
                aria-busy={loading}
              >
                {data
                  ? data.items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 6} />)
                  : Array.from({ length: 9 }, (_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            )}
            {data && (
              <Pagination
                page={data.page}
                pages={data.pages}
                onChange={(p) => {
                  update({ page: p > 1 ? p : null }, false);
                  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
                }}
              />
            )}
          </div>
        </div>
      </div>

      <FilterDrawer open={drawer} onClose={() => setDrawer(false)} total={data?.total ?? 0} onClear={clearAll}>
        {filterPanel}
      </FilterDrawer>
    </div>
  );
}

type ShopState = {
  category: string[];
  sizes: string[];
  colors: string[];
  min_price: string;
  max_price: string;
  on_sale: boolean;
};

function FilterPanel({
  filters,
  state,
  update,
}: {
  filters: Filters;
  state: ShopState;
  update: (patch: Record<string, string | string[] | boolean | null>) => void;
}) {
  const [min, setMin] = useState(state.min_price);
  const [max, setMax] = useState(state.max_price);
  useEffect(() => {
    setMin(state.min_price);
    setMax(state.max_price);
  }, [state.min_price, state.max_price]);

  const toggle = (key: "category" | "sizes" | "colors", v: string) =>
    update({ [key]: state[key].includes(v) ? state[key].filter((x) => x !== v) : [...state[key], v] });

  const step = 10000;
  const presets = [
    { label: `Hasta ${formatPrice(30000)}`, min: "", max: "30000" },
    { label: `${formatPrice(30000)} – ${formatPrice(70000)}`, min: "30000", max: "70000" },
    { label: `Más de ${formatPrice(70000)}`, min: "70000", max: "" },
  ];

  return (
    <div className="space-y-9">
      <fieldset>
        <legend className="eyebrow mb-4 text-ink/50">Categoría</legend>
        <ul className="space-y-1">
          {filters.categories.map((c) => {
            const on = state.category.includes(c.slug);
            return (
              <li key={c.id}>
                <button onClick={() => toggle("category", c.slug)} aria-pressed={on} className="group flex w-full items-center gap-3 py-1.5 text-left text-sm">
                  <span className={classNames("flex size-[18px] items-center justify-center rounded-[5px] border transition-colors", on ? "border-ink bg-ink text-ivory" : "border-ink/25 group-hover:border-ink")}>
                    {on && <Check className="size-3" />}
                  </span>
                  {c.name}
                </button>
              </li>
            );
          })}
          <li>
            <button onClick={() => update({ on_sale: !state.on_sale })} aria-pressed={state.on_sale} className="group flex w-full items-center gap-3 py-1.5 text-left text-sm">
              <span className={classNames("flex size-[18px] items-center justify-center rounded-[5px] border transition-colors", state.on_sale ? "border-sale bg-sale text-white" : "border-ink/25 group-hover:border-ink")}>
                {state.on_sale && <Check className="size-3" />}
              </span>
              En oferta
            </button>
          </li>
        </ul>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4 text-ink/50">Talle</legend>
        <div className="flex flex-wrap gap-2">
          {filters.sizes.map((s) => {
            const on = state.sizes.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggle("sizes", s)}
                aria-pressed={on}
                className={classNames("h-9 min-w-11 rounded-full border px-3 text-xs font-medium transition-colors", on ? "border-ink bg-ink text-ivory" : "border-ink/15 hover:border-ink")}
              >
                {s}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4 text-ink/50">Color</legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {filters.colors.map((c) => {
            const on = state.colors.includes(c.name);
            return (
              <button key={c.name} onClick={() => toggle("colors", c.name)} aria-pressed={on} className="flex items-center gap-2.5 rounded-lg py-1.5 text-left text-[13px]">
                <span
                  className={classNames("size-5 shrink-0 rounded-full ring-1 ring-offset-2 ring-offset-ivory transition-all", on ? "ring-2 ring-ink" : "ring-ink/15")}
                  style={{ background: c.hex ?? "#ccc" }}
                />
                <span className={on ? "font-medium" : ""}>{c.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4 text-ink/50">Precio</legend>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ min_price: min || null, max_price: max || null });
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={step}
            placeholder={`${filters.min_price}`}
            aria-label="Precio mínimo"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="field h-10 min-w-0 px-3"
          />
          <span className="text-ink/40">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={step}
            placeholder={`${filters.max_price}`}
            aria-label="Precio máximo"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="field h-10 min-w-0 px-3"
          />
          <button type="submit" className="inline-flex h-10 shrink-0 items-center rounded-xl bg-ink px-3 text-xs font-medium text-ivory">
            OK
          </button>
        </form>
        <div className="mt-3 flex flex-col items-start gap-1">
          {presets.map((p) => {
            const on = state.min_price === p.min && state.max_price === p.max;
            return (
              <button
                key={p.label}
                onClick={() => update({ min_price: on ? null : p.min || null, max_price: on ? null : p.max || null })}
                className={classNames("text-left text-[13px] underline-offset-4 hover:underline", on && "font-medium underline")}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function FilterDrawer({
  open,
  onClose,
  total,
  onClear,
  children,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  onClear: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  useBodyLock(open);
  useEscape(open, onClose);
  useGSAP(
    () => {
      if (!mounted || !panel.current) return;
      if (prefersReducedMotion()) {
        if (!open) setMounted(false);
        return;
      }
      if (open) gsap.fromTo(panel.current, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: "expo.out" });
      else gsap.to(panel.current, { yPercent: 100, duration: 0.45, ease: "expo.in", onComplete: () => setMounted(false) });
    },
    { dependencies: [open, mounted] },
  );
  if (!mounted) return null;
  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
      <div className={classNames("absolute inset-0 bg-ink/40 transition-opacity duration-500", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div ref={panel} className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[28px] bg-ivory">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <button onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-ink/5" aria-label="Cerrar filtros">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">{children}</div>
        <div className="flex gap-3 border-t border-ink/10 p-4">
          <button onClick={onClear} className="btn-outline flex-1">Limpiar</button>
          <button onClick={onClose} className="btn-dark flex-[2]">Ver {total} {total === 1 ? "producto" : "productos"}</button>
        </div>
      </div>
    </div>
  );
}
