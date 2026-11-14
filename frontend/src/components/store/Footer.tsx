import { ArrowUpRight, Instagram, Mail, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { api } from "../../lib/api";
import type { Category } from "../../lib/types";
import { WhatsAppIcon } from "./CartDrawer";
import { Marquee } from "./primitives";

export default function Footer() {
  const { settings } = useSettings();
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCats).catch(() => {});
  }, []);
  const year = new Date().getFullYear();
  const [first, ...rest] = settings.store_name.split(" ");

  return (
    <footer className="bg-ink text-ivory">
      <Marquee text={settings.slogan} className="border-b border-ivory/10 py-5 text-ivory/70" />
      <div className="container-x grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <p className="font-display text-3xl font-semibold leading-tight">
            Ropa con intención.
            <br />
            <span className="text-olive">Hecha para durar.</span>
          </p>
          {settings.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="btn mt-8 border border-ivory/20 text-ivory hover:border-ivory"
            >
              <WhatsAppIcon className="size-4" /> Escribinos
            </a>
          )}
        </div>
        <div className="lg:col-span-2 lg:col-start-6">
          <p className="eyebrow mb-5 text-ivory/40">Tienda</p>
          <ul className="space-y-3 text-sm text-ivory/80">
            <li><Link className="link-underline" to="/tienda">Ver todo</Link></li>
            {cats.map((c) => (
              <li key={c.id}>
                <Link className="link-underline" to={`/tienda?category=${c.slug}`}>{c.name}</Link>
              </li>
            ))}
            <li><Link className="link-underline" to="/tienda?on_sale=1">Ofertas</Link></li>
          </ul>
        </div>
        <div className="lg:col-span-2">
          <p className="eyebrow mb-5 text-ivory/40">Ayuda</p>
          <ul className="space-y-3 text-sm text-ivory/80">
            <li><Link className="link-underline" to="/contacto#envios">Envíos</Link></li>
            <li><Link className="link-underline" to="/contacto#cambios">Cambios y devoluciones</Link></li>
            <li><Link className="link-underline" to="/nosotros">Nosotros</Link></li>
            <li><Link className="link-underline" to="/contacto">Contacto</Link></li>
          </ul>
        </div>
        <div className="lg:col-span-3">
          <p className="eyebrow mb-5 text-ivory/40">Contacto</p>
          <ul className="space-y-3 text-sm text-ivory/80">
            {settings.whatsapp && (
              <li>
                <a className="inline-flex items-center gap-2 hover:text-ivory" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer">
                  <WhatsAppIcon className="size-4" /> +{settings.whatsapp}
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a className="inline-flex items-center gap-2 break-all hover:text-ivory" href={`mailto:${settings.email}`}>
                  <Mail className="size-4 shrink-0" /> {settings.email}
                </a>
              </li>
            )}
            {settings.instagram && (
              <li>
                <a className="inline-flex items-center gap-2 hover:text-ivory" href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">
                  <Instagram className="size-4" /> @{settings.instagram} <ArrowUpRight className="size-3 opacity-50" />
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {settings.address}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="container-x overflow-hidden">
        <p
          aria-hidden
          className="select-none whitespace-nowrap font-display text-[clamp(4.5rem,21vw,20rem)] font-bold leading-[0.78] tracking-[-0.06em] text-ivory/[0.06]"
        >
          {first}
          <span className="ml-[0.08em] text-[0.3em] tracking-[0.2em]">{rest.join(" ").toUpperCase()}</span>
        </p>
      </div>
      <div className="container-x flex flex-col gap-2 border-t border-ivory/10 py-6 text-xs text-ivory/45 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} {settings.store_name}. Todos los derechos reservados.</p>
        <p>
          Catálogo autoadministrable por <span className="text-ivory/70">GAP Programming</span>
        </p>
      </div>
    </footer>
  );
}
