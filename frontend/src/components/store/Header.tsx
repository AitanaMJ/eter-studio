import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { classNames } from "../../lib/format";
import { useBodyLock, useEscape } from "../../lib/hooks";
import { gsap, MOTION_OK, useGSAP } from "../../lib/motion";
import { Logo } from "./primitives";

export const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda" },
  { to: "/colecciones", label: "Colecciones" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
];

export default function Header() {
  const { pathname } = useLocation();
  const { count, open: openCart, bump } = useCart();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const overHero = pathname === "/" && !scrolled && !menuOpen;

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (y > 400 && y > last + 4) setHidden(true);
      else if (y < last - 4 || y <= 400) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);
  useBodyLock(menuOpen);
  useEscape(menuOpen, () => setMenuOpen(false));

  // Feedback al agregar al carrito: rebote del contador
  useGSAP(
    () => {
      if (!bump || !badgeRef.current) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(badgeRef.current, { scale: 1.8 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.4)" });
      });
    },
    { dependencies: [bump] },
  );

  return (
    <>
      <header
        className={classNames(
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,border-color] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
          hidden && !menuOpen ? "-translate-y-full" : "translate-y-0",
          overHero
            ? "border-b border-transparent bg-transparent text-ivory"
            : menuOpen
              ? "border-b border-transparent bg-transparent text-ivory"
              : "border-b border-ink/10 bg-ivory/85 text-ink backdrop-blur-xl",
        )}
      >
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center sm:h-[72px]">
          <div className="flex items-center gap-1">
            <button
              className="-ml-2 inline-flex size-10 items-center justify-center rounded-full lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === "/"} className="link-underline py-1 text-[13px] font-medium tracking-wide">
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <Link to="/" aria-label={`${settings.store_name} — inicio`} className="justify-self-center">
            <Logo light={overHero || menuOpen} />
          </Link>

          <div className="flex items-center justify-end gap-1">
            <Link
              to="/tienda?focus=search"
              className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-current/10"
              aria-label="Buscar productos"
            >
              <Search className="size-[18px]" />
            </Link>
            <button
              onClick={openCart}
              className="relative -mr-2 inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-current/10"
              aria-label={`Abrir carrito (${count} productos)`}
            >
              <ShoppingBag className="size-[18px]" />
              <span
                ref={badgeRef}
                className={classNames(
                  "absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-[18px] transition-opacity",
                  overHero || menuOpen ? "bg-ivory text-ink" : "bg-ink text-ivory",
                  count ? "opacity-100" : "opacity-0",
                )}
              >
                {count}
              </span>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !mounted) return;
      const links = el.querySelectorAll("[data-menu-item]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (open) {
        if (reduced) {
          gsap.set(el, { clipPath: "inset(0 0 0% 0)" });
          gsap.set(links, { yPercent: 0, autoAlpha: 1 });
          return;
        }
        gsap
          .timeline()
          .fromTo(el, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "expo.inOut" })
          .fromTo(links, { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.06, duration: 0.9 }, "-=0.35");
      } else {
        if (reduced) {
          setMounted(false);
          return;
        }
        gsap.to(el, {
          clipPath: "inset(0 0 100% 0)",
          duration: 0.6,
          ease: "expo.inOut",
          onComplete: () => setMounted(false),
        });
      }
    },
    { dependencies: [open, mounted] },
  );

  if (!mounted) return null;
  return (
    <div
      id="mobile-menu"
      ref={ref}
      className="fixed inset-0 z-40 flex flex-col bg-ink pt-24 text-ivory lg:hidden"
      style={{ clipPath: "inset(0 0 100% 0)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
    >
      <nav className="container-x flex flex-1 flex-col gap-1">
        {NAV.map((n, i) => (
          <div key={n.to} className="overflow-hidden">
            <NavLink
              to={n.to}
              end={n.to === "/"}
              onClick={onClose}
              data-menu-item
              className="flex items-baseline gap-4 py-2 font-display text-[clamp(2.4rem,11vw,4rem)] font-semibold leading-none tracking-tight aria-[current=page]:text-olive"
            >
              <span className="font-sans text-xs font-normal text-ivory/40">0{i + 1}</span>
              {n.label}
            </NavLink>
          </div>
        ))}
      </nav>
      <div className="container-x pb-10" data-menu-item>
        <p className="eyebrow text-ivory/50">{settings.slogan}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ivory/70">
          {settings.instagram && (
            <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">
              @{settings.instagram}
            </a>
          )}
          {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
        </div>
      </div>
    </div>
  );
}
