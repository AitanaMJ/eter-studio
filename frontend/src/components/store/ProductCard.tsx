import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { classNames, discountPercent, formatPrice } from "../../lib/format";
import type { ProductCard as P } from "../../lib/types";
import { Img, Swatch } from "./primitives";

export function Badges({ p, className }: { p: Pick<P, "is_new" | "stock" | "price" | "compare_at_price">; className?: string }) {
  const off = discountPercent(p.price, p.compare_at_price);
  return (
    <div className={classNames("flex flex-wrap gap-1.5", className)}>
      {p.stock === 0 && <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ivory">Agotado</span>}
      {p.stock > 0 && off > 0 && (
        <span className="rounded-full bg-sale px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">Oferta −{off}%</span>
      )}
      {p.is_new && p.stock > 0 && (
        <span className="rounded-full bg-ivory px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink">Nuevo</span>
      )}
    </div>
  );
}

export function Price({ price, compare, className }: { price: number; compare: number | null; className?: string }) {
  return (
    <span className={classNames("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={classNames("tabular-nums", compare ? "text-sale" : "")}>{formatPrice(price)}</span>
      {compare && <s className="text-[0.85em] text-ink/40 tabular-nums">{formatPrice(compare)}</s>}
    </span>
  );
}

export default function ProductCard({ p, priority = false, className }: { p: P; priority?: boolean; className?: string }) {
  const [first, second] = p.images;
  return (
    <article data-reveal className={classNames("group relative", className)}>
      <Link to={`/producto/${p.slug}`} className="block" aria-label={`${p.name}, ${formatPrice(p.price)}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-stone-soft">
          <Img
            src={first?.url}
            alt={first?.alt ?? p.name}
            eager={priority}
            className={classNames(
              "absolute inset-0 size-full object-cover transition-[transform,opacity] duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]",
              p.stock === 0 && "grayscale-[35%]",
            )}
            wrapperClassName="absolute inset-0"
          />
          {second && (
            <Img
              src={second.url}
              alt=""
              aria-hidden
              className="absolute inset-0 hidden size-full object-cover opacity-0! transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100! md:block"
            />
          )}
          <Badges p={p} className="absolute left-3 top-3" />
          <span className="absolute inset-x-3 bottom-3 hidden translate-y-3 rounded-full bg-ivory/90 py-2.5 text-center text-xs font-medium opacity-0 backdrop-blur transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 md:block">
            {p.stock === 0 ? "Ver producto" : "Ver talles y colores"}
          </span>
        </div>
        <div className="mt-3.5 flex flex-col gap-1 px-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="font-sans text-[14px] font-medium leading-snug tracking-normal sm:truncate sm:text-[15px]">{p.name}</h3>
            <p className="mt-0.5 text-xs text-ink/50">{p.category.name}</p>
          </div>
          <Price price={p.price} compare={p.compare_at_price} className="shrink-0 text-[14px] sm:justify-end sm:text-right sm:text-[15px]" />
        </div>
        {p.colors.length > 1 && (
          <div className="mt-2 flex gap-1.5 px-0.5" aria-label={`Colores: ${p.colors.map((c) => c.name).join(", ")}`}>
            {p.colors.slice(0, 5).map((c) => (
              <Swatch key={c.name} hex={c.hex} name={c.name} size={11} />
            ))}
          </div>
        )}
      </Link>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5] rounded-[18px]" />
      <div className="skeleton mt-4 h-4 w-2/3 rounded" />
      <div className="skeleton mt-2 h-3 w-1/3 rounded" />
    </div>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const btn = "inline-flex size-10 items-center justify-center rounded-full text-sm transition-colors";
  return (
    <nav aria-label="Paginación" className="mt-14 flex items-center justify-center gap-1">
      <button className={classNames(btn, "hover:bg-ink/5 disabled:opacity-30")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
        <ChevronLeft className="size-4" />
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="w-6 text-center text-ink/40">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={classNames(btn, n === page ? "bg-ink text-ivory" : "hover:bg-ink/5")}
          >
            {n}
          </button>
        ),
      )}
      <button className={classNames(btn, "hover:bg-ink/5 disabled:opacity-30")} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Página siguiente">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
