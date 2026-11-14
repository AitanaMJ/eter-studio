import { ArrowDown, ArrowRight, ArrowUpRight, MessageCircle, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard, { ProductCardSkeleton } from "../../components/store/ProductCard";
import { Img, Marquee, SectionHeading, SplitText } from "../../components/store/primitives";
import { useSettings } from "../../context/SettingsContext";
import { api, mediaUrl } from "../../lib/api";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP, useReveal } from "../../lib/motion";
import type { Category, Page, ProductCard as P } from "../../lib/types";

export default function Home() {
  const { settings, loaded } = useSettings();
  const [cats, setCats] = useState<Category[] | null>(null);
  const [latest, setLatest] = useState<P[] | null>(null);
  const [featured, setFeatured] = useState<P[] | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCats).catch(() => setCats([]));
    api.get<Page<P>>("/api/products", { sort: "newest", page_size: 8 }).then((r) => setLatest(r.items)).catch(() => setLatest([]));
    api.get<Page<P>>("/api/products", { featured: true, page_size: 4 }).then((r) => setFeatured(r.items)).catch(() => setFeatured([]));
  }, []);

  useReveal(root, [cats, latest, featured]);

  useEffect(() => {
    if (cats && latest && featured) ScrollTrigger.refresh();
  }, [cats, latest, featured]);

  // Entrada cinematográfica del hero + parallax
  useGSAP(
    () => {
      if (!loaded) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.fromTo("[data-hero-media]", { clipPath: "inset(18% 12% 18% 12% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.8, ease: "expo.inOut" })
          .fromTo("[data-hero-img]", { scale: 1.35 }, { scale: 1.08, duration: 2.4 }, 0)
          .fromTo("[data-hero-eyebrow]", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.9)
          .fromTo("[data-hero-title] .split-word", { yPercent: 115 }, { yPercent: 0, duration: 1.4, stagger: 0.08 }, 1)
          .fromTo("[data-hero-fade]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1 }, 1.5);
        gsap.to("[data-hero-img]", {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: hero.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to("[data-hero-content]", {
          yPercent: -20,
          autoAlpha: 0.2,
          ease: "none",
          scrollTrigger: { trigger: hero.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          gsap.fromTo(el, { yPercent: -8 }, {
            yPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [loaded] },
  );

  const heroTitle = settings.hero_title || settings.slogan;

  return (
    <div ref={root}>
      {/* HERO */}
      <section ref={hero} className="relative h-[100svh] min-h-[620px] overflow-hidden bg-ink text-ivory">
        <div data-hero-media className="absolute inset-0 overflow-hidden">
          {settings.hero_image_url && (
            <img
              data-hero-img
              src={mediaUrl(settings.hero_image_url)}
              alt=""
              fetchPriority="high"
              className="size-full scale-[1.08] object-cover object-[60%_30%]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/40" />
        </div>
        {loaded && (
          <div data-hero-content className="container-x relative flex h-full flex-col justify-end pb-12 sm:pb-16 lg:pb-20">
            {settings.hero_eyebrow && (
              <p data-hero-eyebrow className="eyebrow mb-5 text-ivory/80">
                {settings.hero_eyebrow}
              </p>
            )}
            <h1
              data-hero-title
              className="max-w-[14ch] text-[clamp(2.9rem,9.5vw,9rem)] font-semibold leading-[0.9] tracking-[-0.045em]"
            >
              <SplitText text={heroTitle} />
            </h1>
            <div className="mt-8 flex flex-col gap-8 sm:mt-10 lg:flex-row lg:items-end lg:justify-between">
              {settings.hero_subtitle && (
                <p data-hero-fade className="max-w-md text-[15px] leading-relaxed text-ivory/80 sm:text-base">
                  {settings.hero_subtitle}
                </p>
              )}
              <div data-hero-fade className="flex flex-wrap items-center gap-3">
                <Link to="/tienda" className="btn-light group px-7">
                  {settings.hero_cta || "Explorar colección"}
                  <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
                <a href="#novedades" className="btn border border-ivory/30 text-ivory hover:border-ivory">
                  Novedades
                </a>
              </div>
            </div>
            <div data-hero-fade className="mt-10 hidden items-center justify-between border-t border-ivory/20 pt-5 text-xs text-ivory/60 sm:flex">
              <span className="eyebrow">{settings.slogan}</span>
              <span className="inline-flex items-center gap-2">
                Scroll <ArrowDown className="size-3.5 animate-bounce" />
              </span>
            </div>
          </div>
        )}
      </section>

      <Marquee text={settings.slogan} className="bg-stone py-4 text-ink" />

      {/* CATEGORÍAS */}
      <section className="container-x py-20 sm:py-28">
        <SectionHeading
          eyebrow="Categorías"
          title={settings.categories_title || "Comprá por categoría"}
          action={
            <Link to="/colecciones" className="link-underline inline-flex items-center gap-1.5 text-sm font-medium">
              Ver colecciones <ArrowUpRight className="size-4" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {(cats ?? Array.from({ length: 4 }, () => null)).map((c, i) =>
            c ? (
              <Link
                key={c.id}
                to={`/tienda?category=${c.slug}`}
                data-reveal
                className={`group relative block overflow-hidden rounded-[20px] bg-stone-soft ${i % 2 === 1 ? "lg:translate-y-14" : ""}`}
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <Img
                    src={c.image_url}
                    alt={c.name}
                    className="size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]"
                    wrapperClassName="size-full"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-ivory sm:p-6">
                  <div>
                    <span className="text-[11px] text-ivory/60">0{i + 1}</span>
                    <h3 className="text-lg font-semibold leading-tight sm:text-2xl">{c.name}</h3>
                  </div>
                  <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-ivory text-ink transition-transform duration-500 group-hover:rotate-45 sm:inline-flex">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
              </Link>
            ) : (
              <div key={i} className="skeleton aspect-[4/5] rounded-[20px]" />
            ),
          )}
        </div>
      </section>

      {/* NOVEDADES */}
      <section id="novedades" className="container-x scroll-mt-24 pb-20 pt-8 sm:pb-28 lg:pt-20">
        <SectionHeading
          eyebrow="Recién llegados"
          title={settings.new_arrivals_title || "Novedades"}
          action={
            <Link to="/tienda?sort=newest" className="btn-outline">
              Ver todo <ArrowRight className="size-4" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
          {latest
            ? latest.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)
            : Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </section>

      {/* DESTACADOS */}
      {(featured === null || featured.length > 0) && (
        <section className="bg-stone-soft py-20 sm:py-28">
          <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <div data-reveal-img className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-stone">
                  <img src={mediaUrl("/media/static/editorial-1.webp")} alt="Editorial ÉTER Studio" loading="lazy" className="size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-ivory sm:p-8">
                    <p className="eyebrow text-ivory/70">Curaduría</p>
                    <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[0.95]">
                      {settings.featured_title || "Destacados"}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <p data-reveal className="mb-10 max-w-lg text-lg leading-relaxed text-ink/70">
                Las piezas que definen la temporada: elegidas por nuestro equipo para combinar entre sí y acompañarte más
                allá de la tendencia.
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5">
                {featured
                  ? featured.map((p) => <ProductCard key={p.id} p={p} />)
                  : Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
              </div>
              <Link to="/tienda?featured=1" data-reveal className="btn-dark mt-12">
                Ver selección completa <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* BANNER PROMOCIONAL */}
      {settings.promo_title && (
        <section className="relative overflow-hidden bg-ink text-ivory">
          <div className="absolute inset-0 overflow-hidden">
            {settings.promo_image_url && (
              <img
                data-parallax
                src={mediaUrl(settings.promo_image_url)}
                alt=""
                loading="lazy"
                className="absolute inset-x-0 top-[-20%] h-[140%] w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-ink/55" />
          </div>
          <div className="container-x relative flex min-h-[460px] flex-col items-start justify-center py-20 sm:min-h-[560px] lg:items-center lg:text-center">
            {settings.promo_eyebrow && (
              <p data-reveal className="eyebrow mb-5 rounded-full border border-ivory/30 px-4 py-2 text-ivory/90">
                {settings.promo_eyebrow}
              </p>
            )}
            <h2 data-split className="max-w-4xl text-[clamp(2.3rem,6vw,5.5rem)] font-semibold leading-[0.95]">
              <SplitText text={settings.promo_title} />
            </h2>
            {settings.promo_text && (
              <p data-reveal className="mt-6 max-w-xl text-base leading-relaxed text-ivory/80">
                {settings.promo_text}
              </p>
            )}
            <Link data-reveal to="/tienda?on_sale=1" className="btn-light mt-10">
              {settings.promo_cta || "Ver ofertas"} <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      )}

      {/* BENEFICIOS */}
      <section className="container-x py-20 sm:py-24">
        <div className="grid gap-px overflow-hidden rounded-[24px] border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Envíos a todo el país", text: "Moto en CABA y GBA, correo al resto del país. Gratis desde $150.000." },
            { icon: RefreshCcw, title: "Cambios sin cargo", text: "Tenés 30 días para cambiar tu prenda. El primer cambio corre por nuestra cuenta." },
            { icon: MessageCircle, title: "Atención personalizada", text: "Confirmamos tu pedido por WhatsApp y te asesoramos con talles y combinaciones." },
            { icon: ShieldCheck, title: "Calidad garantizada", text: "Materiales nobles y confección local en series cortas, revisadas una por una." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} data-reveal className="bg-ivory p-7 sm:p-8">
              <Icon className="size-6 stroke-[1.5]" />
              <h3 className="mt-8 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
