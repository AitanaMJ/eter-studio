import { ImageOff } from "lucide-react";
import { useCallback, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { mediaUrl } from "../../lib/api";
import { classNames } from "../../lib/format";
import { useSettings } from "../../context/SettingsContext";

/** Imagen con carga diferida, fundido al cargar y fallback si falla (nunca se ve un ícono roto). */
export function Img({
  src,
  alt,
  className,
  wrapperClassName,
  eager,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null; wrapperClassName?: string; eager?: boolean }) {
  // El estado se asocia a la URL: así una imagen en caché (que carga antes de los efectos) nunca queda oculta
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && el.complete && el.naturalWidth > 0) setLoaded(src ?? null);
    },
    [src],
  );
  const state = failed === src ? "error" : loaded === src ? "ok" : "loading";
  if (!src || state === "error") {
    return (
      <div className={classNames("flex items-center justify-center bg-stone-soft text-ink/30", wrapperClassName, className)}>
        <ImageOff className="size-6" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <img
      ref={ref}
      src={mediaUrl(src)}
      alt={alt ?? ""}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setLoaded(src)}
      onError={() => setFailed(src)}
      className={classNames("transition-opacity duration-700", state === "ok" ? "opacity-100" : "opacity-0", className)}
      {...rest}
    />
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  const { settings } = useSettings();
  if (settings.logo_url) {
    return (
      <img
        src={mediaUrl(settings.logo_url)}
        alt={settings.store_name}
        className={classNames("h-8 w-auto max-w-[160px] object-contain", light && "brightness-0 invert", className)}
      />
    );
  }
  const [first, ...rest] = settings.store_name.split(" ");
  return (
    <span className={classNames("flex items-baseline gap-1.5 leading-none", className)}>
      <span className="font-display text-[22px] font-bold tracking-[-0.04em]">{first}</span>
      {rest.length > 0 && (
        <span className="font-display text-[10px] font-medium uppercase tracking-[0.3em] opacity-70">{rest.join(" ")}</span>
      )}
    </span>
  );
}

/** Divide un texto en palabras enmascaradas para animarlas con data-split. */
export function SplitText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(/\s+/).map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span className="split-word inline-block will-change-transform">{w}&nbsp;</span>
        </span>
      ))}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-12", className)}>
      <div>
        {eyebrow && (
          <p className="eyebrow mb-3 text-olive" data-reveal>
            {eyebrow}
          </p>
        )}
        <h2 data-split className="text-[clamp(2rem,5vw,4rem)] font-semibold leading-[0.95]">
          <SplitText text={title} />
        </h2>
      </div>
      {action && <div data-reveal>{action}</div>}
    </div>
  );
}

export function Marquee({ text, className }: { text: string; className?: string }) {
  const items = Array.from({ length: 8 }, () => text);
  return (
    <div className={classNames("overflow-hidden whitespace-nowrap", className)} aria-hidden>
      <div className="marquee-track inline-flex">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-6 font-display text-sm font-medium uppercase tracking-[0.3em]">
            {t}
            <span className="inline-block size-1.5 rounded-full bg-current opacity-60" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Swatch({ hex, name, size = 14 }: { hex: string | null; name: string; size?: number }) {
  return (
    <span
      title={name}
      className="inline-block rounded-full ring-1 ring-ink/15 ring-offset-1 ring-offset-transparent"
      style={{ width: size, height: size, background: hex ?? "#ccc" }}
    />
  );
}
