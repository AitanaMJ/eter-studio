import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "../../lib/motion";
import CartDrawer from "./CartDrawer";
import Footer from "./Footer";
import Header from "./Header";

export default function StoreLayout() {
  const { pathname, hash } = useLocation();
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "auto" });
    // recalcula posiciones de ScrollTrigger cuando cambia la página
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);

  // Transición suave entre páginas
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(main.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power2.out", clearProps: "opacity,visibility" });
      });
    },
    { dependencies: [pathname] },
  );

  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" ref={main} className="min-h-[70vh]">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
