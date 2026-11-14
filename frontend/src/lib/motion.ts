import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
gsap.defaults({ ease: "expo.out", duration: 1 });

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Anima, dentro de `scope`, los elementos marcados con:
 *  - data-reveal       → aparición suave desde abajo (en lote al entrar en pantalla)
 *  - data-reveal-img   → revelado de imagen con máscara + leve zoom
 *  - data-split        → títulos con palabras que suben desde una máscara (ver <SplitText/>)
 * Con prefers-reduced-motion no se anima nada y todo queda visible.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const root = scope.current;
        if (!root) return;

        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]:not([data-revealed])", root);
        items.forEach((el) => el.setAttribute("data-revealed", ""));
        if (items.length) {
          gsap.set(items, { autoAlpha: 0, y: 40 });
          ScrollTrigger.batch(items, {
            start: "top 92%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, overwrite: true }),
          });
        }

        gsap.utils.toArray<HTMLElement>("[data-reveal-img]:not([data-revealed])", root).forEach((el) => {
          el.setAttribute("data-revealed", "");
          const img = el.querySelector("img");
          gsap.fromTo(
            el,
            { clipPath: "inset(12% 8% 12% 8%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.5,
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
          if (img)
            gsap.fromTo(
              img,
              { scale: 1.18 },
              { scale: 1, duration: 1.8, scrollTrigger: { trigger: el, start: "top 88%", once: true } },
            );
        });

        gsap.utils.toArray<HTMLElement>("[data-split]:not([data-revealed])", root).forEach((el) => {
          el.setAttribute("data-revealed", "");
          gsap.fromTo(
            el.querySelectorAll(".split-word"),
            { yPercent: 110 },
            {
              yPercent: 0,
              duration: 1.2,
              stagger: 0.06,
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies: deps, revertOnUpdate: false },
  );
}

export { gsap, ScrollTrigger, useGSAP };
