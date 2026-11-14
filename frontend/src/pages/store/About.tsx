import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { SplitText } from "../../components/store/primitives";
import { useSettings } from "../../context/SettingsContext";
import { mediaUrl } from "../../lib/api";
import { useReveal } from "../../lib/motion";

const VALUES = [
  { n: "01", title: "Diseño atemporal", text: "Siluetas limpias y una paleta neutra que se combina temporada tras temporada." },
  { n: "02", title: "Producción local", text: "Trabajamos con talleres de Buenos Aires en series cortas y con trato justo." },
  { n: "03", title: "Materiales nobles", text: "Algodón peinado, lino, lana y cuero curtido al vegetal, elegidos por su durabilidad." },
];

export default function About() {
  const { settings, loaded } = useSettings();
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, [loaded]);
  const paragraphs = (settings.about_text || "").split(/\n{2,}/).filter(Boolean);

  return (
    <div ref={root} className="pb-24 pt-28 sm:pt-36">
      <header className="container-x">
        <p className="eyebrow mb-4 text-olive">Nosotros</p>
        {loaded && (
          <h1 data-split className="max-w-[16ch] text-[clamp(2.8rem,8vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.05em]">
            <SplitText text={settings.about_title || settings.store_name} />
          </h1>
        )}
      </header>

      <section className="container-x mt-16 grid gap-6 sm:grid-cols-12">
        <div data-reveal-img className="overflow-hidden rounded-[24px] bg-stone-soft sm:col-span-7">
          <img src={mediaUrl("/media/static/editorial-4.webp")} alt="Interior del showroom" loading="lazy" className="aspect-[4/5] size-full object-cover sm:aspect-auto" />
        </div>
        <div className="flex flex-col justify-end gap-6 sm:col-span-5">
          <div data-reveal-img className="overflow-hidden rounded-[24px] bg-stone-soft">
            <img src={mediaUrl("/media/static/editorial-2.webp")} alt="Prendas de la colección" loading="lazy" className="aspect-[4/5] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="container-x mt-20 grid gap-10 lg:grid-cols-12">
        <p data-reveal className="eyebrow text-ink/50 lg:col-span-3">Nuestra historia</p>
        <div className="space-y-6 lg:col-span-8">
          {paragraphs.map((t, i) => (
            <p key={i} data-reveal className={i === 0 ? "font-display text-[clamp(1.4rem,2.6vw,2.2rem)] leading-[1.2] tracking-tight" : "max-w-2xl text-lg leading-relaxed text-ink/65"}>
              {t}
            </p>
          ))}
        </div>
      </section>

      <section className="container-x mt-24 grid gap-px overflow-hidden rounded-[24px] bg-ink/10 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.n} data-reveal className="bg-ivory p-8">
            <span className="font-display text-5xl font-semibold text-olive">{v.n}</span>
            <h3 className="mt-10 text-xl font-semibold">{v.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/60">{v.text}</p>
          </div>
        ))}
      </section>

      <section className="container-x mt-24">
        <div className="relative overflow-hidden rounded-[28px] bg-ink text-ivory">
          <img src={mediaUrl("/media/static/editorial-3.webp")} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-50" />
          <div className="relative flex min-h-[380px] flex-col items-start justify-end p-8 sm:p-14">
            <h2 data-split className="max-w-2xl text-[clamp(2rem,5vw,4rem)] font-semibold leading-[0.95]">
              <SplitText text={settings.slogan} />
            </h2>
            <Link data-reveal to="/tienda" className="btn-light mt-8">
              Explorar la tienda <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
