import { ArrowUpRight, Instagram, Mail, MapPin, RefreshCcw, Truck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { WhatsAppIcon } from "../../components/store/CartDrawer";
import { SplitText } from "../../components/store/primitives";
import { useSettings } from "../../context/SettingsContext";
import { useReveal } from "../../lib/motion";
import { whatsappUrl } from "../../lib/whatsapp";

export default function Contact() {
  const { settings } = useSettings();
  const { hash } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  useReveal(root, []);

  useEffect(() => {
    if (hash) window.setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, [hash]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || msg.trim().length < 5) {
      setError("Completá tu nombre y un mensaje de al menos 5 caracteres.");
      return;
    }
    if (!settings.whatsapp) {
      setError("La tienda no tiene un WhatsApp configurado.");
      return;
    }
    setError(null);
    const text = `¡Hola ${settings.store_name}! Soy ${name.trim()}.\n\n${msg.trim()}`;
    window.open(whatsappUrl(settings.whatsapp, text), "_blank", "noopener");
  }

  const channels = [
    settings.whatsapp && { icon: WhatsAppIcon, label: "WhatsApp", value: `+${settings.whatsapp}`, href: `https://wa.me/${settings.whatsapp}` },
    settings.email && { icon: Mail, label: "Correo", value: settings.email, href: `mailto:${settings.email}` },
    settings.instagram && { icon: Instagram, label: "Instagram", value: `@${settings.instagram}`, href: `https://instagram.com/${settings.instagram}` },
    settings.address && { icon: MapPin, label: "Showroom", value: settings.address, href: undefined },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <div ref={root} className="pb-24 pt-28 sm:pt-36">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow mb-4 text-olive">Contacto</p>
          <h1 data-split className="text-[clamp(2.8rem,8vw,6.5rem)] font-semibold leading-[0.88] tracking-[-0.05em]">
            <SplitText text="Hablemos." />
          </h1>
          <p data-reveal className="mt-6 max-w-md text-lg leading-relaxed text-ink/65">
            Consultas sobre talles, stock o envíos: respondemos por WhatsApp de lunes a sábado de 10 a 19 h.
          </p>
          <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
            {channels.map(({ icon: Icon, label, value, href }) => (
              <li key={label} data-reveal>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="group flex items-center gap-4 py-5">
                    <Icon className="size-5 shrink-0" />
                    <span className="w-24 shrink-0 text-sm text-ink/50">{label}</span>
                    <span className="min-w-0 flex-1 break-words font-medium">{value}</span>
                    <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                ) : (
                  <div className="flex items-center gap-4 py-5">
                    <Icon className="size-5 shrink-0" />
                    <span className="w-24 shrink-0 text-sm text-ink/50">{label}</span>
                    <span className="min-w-0 flex-1 font-medium">{value}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} data-reveal className="self-start rounded-[28px] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(17,17,17,.25)] sm:p-10 lg:col-span-5 lg:col-start-8" noValidate>
          <h2 className="text-2xl font-semibold">Envianos un mensaje</h2>
          <p className="mt-2 text-sm text-ink/60">Se abrirá WhatsApp con tu consulta lista para enviar.</p>
          <label className="mt-8 block text-sm font-medium" htmlFor="c-name">Nombre</label>
          <input id="c-name" className="field mt-2 h-12" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
          <label className="mt-5 block text-sm font-medium" htmlFor="c-msg">Mensaje</label>
          <textarea id="c-msg" className="field mt-2 resize-none" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={800} />
          {error && <p className="mt-3 text-sm text-sale" role="alert">{error}</p>}
          <button className="btn-dark mt-6 w-full py-4">
            <WhatsAppIcon className="size-5" /> Enviar por WhatsApp
          </button>
        </form>
      </div>

      <div className="container-x mt-24 grid gap-5 md:grid-cols-2">
        <section id="envios" className="scroll-mt-28 rounded-[24px] bg-stone-soft p-8 sm:p-10" data-reveal>
          <Truck className="size-6 stroke-[1.5]" />
          <h2 className="mt-8 text-2xl font-semibold">Envíos</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-ink/65">{settings.shipping_info}</p>
        </section>
        <section id="cambios" className="scroll-mt-28 rounded-[24px] bg-stone-soft p-8 sm:p-10" data-reveal>
          <RefreshCcw className="size-6 stroke-[1.5]" />
          <h2 className="mt-8 text-2xl font-semibold">Cambios y devoluciones</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-ink/65">{settings.returns_info}</p>
        </section>
      </div>
    </div>
  );
}
