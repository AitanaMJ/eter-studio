import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Img, SplitText } from "../../components/store/primitives";
import { useSettings } from "../../context/SettingsContext";
import { api, mediaUrl } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { ScrollTrigger, useReveal } from "../../lib/motion";
import type { Category, Page, ProductCard } from "../../lib/types";

export default function Collections() {
  const { settings } = useSettings();
  const [cats, setCats] = useState<Category[] | null>(null);
  const [previews, setPreviews] = useState<Record<string, ProductCard[]>>({});
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Category[]>("/api/categories")
      .then(async (cs) => {
        setCats(cs);
        const entries = await Promise.all(
          cs.map((c) =>
            api
              .get<Page<ProductCard>>("/api/products", { category: c.slug, page_size: 3, sort: "newest" })
              .then((r) => [c.slug, r.items] as const)
              .catch(() => [c.slug, []] as const),
          ),
        );
        setPreviews(Object.fromEntries(entries));
      })
      .catch(() => setCats([]));
  }, []);

  useReveal(root, [cats, previews]);
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [previews]);

  return (
    <div ref={root} className="pb-24 pt-28 sm:pt-36">
      <header className="container-x mb-16 grid gap-8 border-b border-ink/10 pb-12 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="eyebrow mb-4 text-olive">Temporada Otoño · Invierno 26</p>
          <h1 data-split className="text-[clamp(3rem,9vw,8rem)] font-semibold leading-[0.85] tracking-[-0.05em]">
            <SplitText text="Colecciones" />
          </h1>
        </div>
        <p data-reveal className="max-w-md text-lg leading-relaxed text-ink/65 lg:justify-self-end">
          Cuatro capítulos de un mismo guardarropas. Piezas pensadas para combinarse entre sí, en una paleta de neutros,
          tierra y oliva.
        </p>
      </header>

      <div className="container-x space-y-24 sm:space-y-32">
        {(cats ?? []).map((c, idx) => (
          <section key={c.id} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
            <Link
              to={`/tienda?category=${c.slug}`}
              data-reveal-img
              className={`group relative block overflow-hidden rounded-[28px] bg-stone-soft lg:col-span-7 ${idx % 2 ? "lg:order-2" : ""}`}
            >
              <div className="aspect-[4/5] sm:aspect-[16/12]">
                <Img
                  src={c.image_url}
                  alt={c.name}
                  className="size-full object-cover transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                  wrapperClassName="size-full"
                />
              </div>
              <span className="absolute left-5 top-5 font-display text-[clamp(3rem,8vw,7rem)] font-bold leading-none text-ivory/90 mix-blend-difference">
                0{idx + 1}
              </span>
            </Link>
            <div className={`lg:col-span-5 ${idx % 2 ? "lg:order-1" : ""}`}>
              <p data-reveal className="eyebrow text-olive">Capítulo 0{idx + 1}</p>
              <h2 data-split className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.95]">
                <SplitText text={c.name} />
              </h2>
              <p data-reveal className="mt-5 max-w-md leading-relaxed text-ink/65">{c.description}</p>
              <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
                {(previews[c.slug] ?? []).map((p) => (
                  <li key={p.id} data-reveal>
                    <Link to={`/producto/${p.slug}`} className="group flex items-center gap-4 py-3">
                      <Img src={p.images[0]?.url} alt="" className="aspect-[4/5] w-14 shrink-0 rounded-lg object-cover" wrapperClassName="w-14 aspect-[4/5] rounded-lg" />
                      <span className="flex-1 text-sm font-medium group-hover:underline">{p.name}</span>
                      <span className="text-sm tabular-nums text-ink/60">{formatPrice(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link data-reveal to={`/tienda?category=${c.slug}`} className="btn-dark mt-8">
                Ver {c.name.toLowerCase()} <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>
        ))}
        {cats === null && <div className="skeleton aspect-[16/9] rounded-[28px]" />}
      </div>

      <section className="container-x mt-28">
        <div data-reveal-img className="relative overflow-hidden rounded-[28px] bg-ink">
          <img src={mediaUrl("/media/static/editorial-5.webp")} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover opacity-70 sm:aspect-[16/7]" />
          <div className="absolute inset-0 flex flex-col items-start justify-end p-6 text-ivory sm:p-12">
            <p className="max-w-3xl font-display text-[clamp(1.8rem,4.5vw,3.8rem)] font-semibold leading-[1]">
              “Menos prendas, mejor pensadas.”
            </p>
            <p className="eyebrow mt-5 text-ivory/70">{settings.store_name} — {settings.slogan}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
