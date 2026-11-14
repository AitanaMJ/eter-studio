import { Check, ExternalLink, Lock, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { discardUpload, SingleImageUploader } from "../../components/admin/ImageUploader";
import { Button, Card, Field, Input, PageHeader, SaveBar, Textarea } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError, mediaUrl } from "../../lib/api";
import { classNames, formatPrice } from "../../lib/format";
import type { AdminProduct, Page, StoreSettings } from "../../lib/types";
import { useAdminError, useAdminMeta } from "./adminContext";

const SECTIONS = [
  { id: "identidad", label: "Identidad" },
  { id: "imagenes", label: "Portada" },
  { id: "secciones", label: "Secciones" },
  { id: "promo", label: "Banner" },
  { id: "destacados", label: "Destacados" },
  { id: "contacto", label: "Contacto" },
  { id: "politicas", label: "Envíos y cambios" },
  { id: "nosotros", label: "Nosotros" },
];

export default function Customize() {
  const { isDemo } = useAuth();
  const { reload } = useSettings();
  const { maxMb } = useAdminMeta();
  const toast = useToast();
  const onError = useAdminError();
  const [s, setS] = useState<StoreSettings | null>(null);
  const [initial, setInitial] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [featured, setFeatured] = useState<number[]>([]);
  const [initialFeatured, setInitialFeatured] = useState<number[]>([]);
  const [pq, setPq] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const uploaded = useRef<Set<string>>(new Set());
  const [active, setActive] = useState(SECTIONS[0].id);
  const tabs = useRef<HTMLElement>(null);
  const lockSpy = useRef(0);

  useEffect(() => {
    api
      .get<StoreSettings>("/api/admin/settings")
      .then((d) => {
        setS(d);
        setInitial(JSON.stringify(d));
      })
      .catch(onError);
    api
      .get<Page<AdminProduct>>("/api/admin/products", { page_size: 100, sort: "name_asc" })
      .then((r) => {
        setProducts(r.items);
        const f = r.items.filter((p) => p.is_featured).map((p) => p.id);
        setFeatured(f);
        setInitialFeatured(f);
      })
      .catch(onError);
    return () => uploaded.current.forEach((u) => void discardUpload(u));
  }, [onError]);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h && s) window.setTimeout(() => document.getElementById(h)?.scrollIntoView({ behavior: "smooth" }), 200);
  }, [s]);

  // Pestaña activa según la sección visible (scroll-spy)
  useEffect(() => {
    if (!s) return;
    const els = SECTIONS.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[];
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockSpy.current) return;
      const root = document.documentElement;
      let cur = els[0]?.id ?? SECTIONS[0].id;
      // la última sección cuyo borde superior ya entró en el tercio superior de la pantalla
      const line = Math.max(160, window.innerHeight * 0.35);
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) cur = els[els.length - 1]?.id ?? cur;
      setActive(cur);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [s]);

  // Mantener visible la pestaña activa dentro de la barra desplazable (sin mover la página)
  useEffect(() => {
    const nav = tabs.current;
    const el = nav?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!nav || !el) return;
    const left = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  const dirty = useMemo(
    () => !!s && (JSON.stringify(s) !== initial || [...featured].sort().join() !== [...initialFeatured].sort().join()),
    [s, initial, featured, initialFeatured],
  );

  if (!s) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => {
    setS((x) => (x ? { ...x, [k]: v } : x));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const text = (k: keyof StoreSettings, max: number, props: { rows?: number; placeholder?: string; disabled?: boolean } = {}) =>
    props.rows ? (
      <Textarea id={k} rows={props.rows} value={(s[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as never)} maxLength={max} placeholder={props.placeholder} disabled={props.disabled} />
    ) : (
      <Input id={k} value={(s[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as never)} maxLength={max} placeholder={props.placeholder} disabled={props.disabled} />
    );

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    setErrors({});
    try {
      const out = await api.put<StoreSettings>("/api/admin/settings", { ...s, featured_product_ids: featured });
      setS(out);
      setInitial(JSON.stringify(out));
      setInitialFeatured(featured);
      uploaded.current.clear();
      await reload();
      toast("Personalización guardada. Los cambios ya se ven en la tienda.");
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        const fe: Record<string, string> = {};
        err.errors.forEach((x) => (fe[x.field] = x.message));
        setErrors(fe);
      }
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(pq.toLowerCase()) || p.sku.toLowerCase().includes(pq.toLowerCase()));

  return (
    <form onSubmit={save} className="pb-36 sm:pb-28" noValidate>
      <PageHeader
        title="Personalización"
        description="Textos, imágenes y datos de contacto de la tienda pública."
        actions={
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-white px-4 text-sm font-medium hover:border-ink/40">
            <ExternalLink className="size-4" /> Ver tienda
          </a>
        }
      />

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 mb-6 border-b border-ink/[0.06] bg-[#f7f7f5]/95 backdrop-blur sm:-mx-8 lg:top-0 lg:mx-0 lg:border-0">
        <nav
          ref={tabs}
          className="no-scrollbar flex snap-x scroll-px-4 gap-1 overflow-x-auto overscroll-x-contain px-4 py-2 sm:px-8 lg:px-0 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-24px),transparent)] xl:[mask-image:none]"
          aria-label="Secciones"
        >
          {SECTIONS.map((x) => (
            <a
              key={x.id}
              data-tab={x.id}
              href={`#${x.id}`}
              aria-current={active === x.id ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                lockSpy.current = Date.now() + 900;
                setActive(x.id);
                document.getElementById(x.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={classNames(
                "inline-flex min-h-10 shrink-0 snap-start items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors",
                active === x.id ? "bg-ink text-white" : "text-ink/60 hover:bg-white hover:text-ink",
              )}
            >
              {x.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        <div id="identidad" className="scroll-mt-32 lg:scroll-mt-20">
          <Card title="Identidad de marca">
            <div className="grid gap-5 md:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                <Field label="Nombre de la tienda *" htmlFor="store_name" error={errors.store_name}>{text("store_name", 80)}</Field>
                <Field label="Eslogan" htmlFor="slogan" error={errors.slogan}>{text("slogan", 120)}</Field>
              </div>
              <Field label="Logo" hint="Si no subís un logo, se usa el nombre como logotipo. Preferí PNG con fondo transparente.">
                <SingleImageUploader kind="logo" value={s.logo_url} onChange={(u) => set("logo_url", u)} onUploaded={(u) => uploaded.current.add(u)} maxMb={maxMb} dark />
              </Field>
            </div>
          </Card>
        </div>

        <div id="imagenes" className="scroll-mt-32 lg:scroll-mt-20">
          <Card title="Portada (hero)" description="Primera sección que ve el visitante.">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <Field label="Texto superior" htmlFor="hero_eyebrow">{text("hero_eyebrow", 120, { placeholder: "Colección Otoño · Invierno" })}</Field>
                <Field label="Título principal" htmlFor="hero_title" hint="Si está vacío se usa el eslogan">{text("hero_title", 160)}</Field>
                <Field label="Subtítulo" htmlFor="hero_subtitle">{text("hero_subtitle", 600, { rows: 3 })}</Field>
                <Field label="Texto del botón" htmlFor="hero_cta">{text("hero_cta", 60)}</Field>
              </div>
              <Field label="Imagen principal">
                <SingleImageUploader kind="hero" value={s.hero_image_url} onChange={(u) => set("hero_image_url", u)} onUploaded={(u) => uploaded.current.add(u)} maxMb={maxMb} />
              </Field>
            </div>
          </Card>
        </div>

        <div id="secciones" className="scroll-mt-32 lg:scroll-mt-20">
          <Card title="Títulos de secciones">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Field label="Categorías" htmlFor="categories_title">{text("categories_title", 120)}</Field>
              <Field label="Novedades" htmlFor="new_arrivals_title">{text("new_arrivals_title", 120)}</Field>
              <Field label="Destacados" htmlFor="featured_title">{text("featured_title", 120)}</Field>
            </div>
          </Card>
        </div>

        <div id="promo" className="scroll-mt-32 lg:scroll-mt-20">
          <Card title="Banner promocional" description="Se muestra en la portada si tiene título.">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <Field label="Etiqueta" htmlFor="promo_eyebrow">{text("promo_eyebrow", 120)}</Field>
                <Field label="Título" htmlFor="promo_title">{text("promo_title", 160)}</Field>
                <Field label="Texto" htmlFor="promo_text">{text("promo_text", 600, { rows: 3 })}</Field>
                <Field label="Texto del botón" htmlFor="promo_cta">{text("promo_cta", 60)}</Field>
              </div>
              <Field label="Imagen del banner">
                <SingleImageUploader kind="banner" value={s.promo_image_url} onChange={(u) => set("promo_image_url", u)} onUploaded={(u) => uploaded.current.add(u)} maxMb={maxMb} />
              </Field>
            </div>
          </Card>
        </div>

        <div id="destacados" className="scroll-mt-32 lg:scroll-mt-20">
          <Card title="Productos destacados" description={`${featured.length} seleccionados · se muestran hasta 4 en la portada y todos en “Ver selección completa”.`}>
            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
              <input type="search" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Buscar producto" aria-label="Buscar producto destacado" className="h-11 w-full rounded-xl border border-ink/12 pl-9 pr-3 text-base outline-none focus:border-ink sm:h-10 sm:text-sm" />
            </label>
            <ul className="grid max-h-[420px] gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2">
              {filtered.map((p) => {
                const on = featured.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setFeatured((f) => (on ? f.filter((x) => x !== p.id) : f.length >= 24 ? f : [...f, p.id]))}
                      aria-pressed={on}
                      className={classNames("flex min-h-14 w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors", on ? "border-ink bg-ink/[0.03]" : "border-ink/[0.08] hover:border-ink/30")}
                    >
                      {p.images[0] ? <img src={mediaUrl(p.images[0].url)} alt="" className="h-12 w-10 shrink-0 rounded-md object-cover" /> : <span className="h-12 w-10 shrink-0 rounded-md bg-[#f1f0ec]" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block text-xs text-ink/50">{formatPrice(p.price)}{!p.is_active && " · inactivo"}</span>
                      </span>
                      <span className={classNames("flex size-5 shrink-0 items-center justify-center rounded-md border", on ? "border-ink bg-ink text-white" : "border-ink/25")}>
                        {on && <Check className="size-3.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div id="contacto" className="scroll-mt-32 lg:scroll-mt-20">
          <Card
            title="Contacto y redes"
            description="El número de WhatsApp recibe los pedidos del carrito."
            actions={isDemo ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ebebe4] px-3 py-1 text-xs text-olive-dark"><Lock className="size-3" /> Bloqueado en demo</span> : undefined}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp" htmlFor="whatsapp" hint="Código de país + área + número, sin espacios. Ej: 5491122334455" error={errors.whatsapp}>
                {text("whatsapp", 30, { disabled: isDemo, placeholder: "5491122334455" })}
              </Field>
              <Field label="Instagram" htmlFor="instagram" hint="Usuario sin @" error={errors.instagram}>{text("instagram", 120, { disabled: isDemo })}</Field>
              <Field label="Correo de contacto" htmlFor="email" error={errors.email}>{text("email", 255, { disabled: isDemo })}</Field>
              <Field label="Dirección / showroom" htmlFor="address">{text("address", 200)}</Field>
            </div>
          </Card>
        </div>

        <div id="politicas" className="scroll-mt-32 lg:scroll-mt-20">
          <Card title="Envíos, cambios y devoluciones" description="Se muestran en el detalle de producto y en Contacto.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Información de envíos" htmlFor="shipping_info">{text("shipping_info", 3000, { rows: 5 })}</Field>
              <Field label="Cambios y devoluciones" htmlFor="returns_info">{text("returns_info", 3000, { rows: 5 })}</Field>
            </div>
          </Card>
        </div>

        <div id="nosotros" className="scroll-mt-32 lg:scroll-mt-20">
          <Card title="Página Nosotros">
            <div className="grid gap-4">
              <Field label="Título" htmlFor="about_title">{text("about_title", 160)}</Field>
              <Field label="Texto" htmlFor="about_text" hint="Separá párrafos con una línea en blanco">{text("about_text", 3000, { rows: 7 })}</Field>
            </div>
          </Card>
        </div>
      </div>

      <SaveBar status={<span className="text-ink/55">{dirty ? "Tenés cambios sin guardar" : "Todo guardado"}</span>}>
        <Button type="submit" loading={saving} disabled={!dirty}>Guardar cambios</Button>
      </SaveBar>
    </form>
  );
}
