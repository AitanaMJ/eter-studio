import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { classNames } from "../../lib/format";
import { useBodyLock, useEscape } from "../../lib/hooks";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: "bg-ink text-white hover:bg-ink-soft",
    secondary: "border border-ink/15 bg-white text-ink hover:border-ink/40",
    ghost: "text-ink/70 hover:bg-ink/5 hover:text-ink",
    danger: "bg-[#b4321f] text-white hover:bg-[#9a2a1a]",
  };
  return (
    <button
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50",
        size === "sm" ? "h-9 px-3 text-[13px]" : "h-11 px-4 text-sm",
        styles[variant],
        className,
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className, title, description, actions }: { children: ReactNode; className?: string; title?: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={classNames("rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(17,17,17,.04)] sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-56">
            {title && <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-1 text-[13px] text-ink/55">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, error, children, className, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={classNames("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink/80">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-[#b4321f]">{error}</p> : hint ? <p className="mt-1.5 text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
}

const inputCls = "w-full min-w-0 rounded-xl border border-ink/12 bg-white px-3.5 text-base text-ink sm:text-sm outline-none transition focus:border-ink focus:ring-4 focus:ring-ink/5 placeholder:text-ink/35 disabled:bg-ink/[0.03]";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames(inputCls, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={classNames(inputCls, "py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={classNames(inputCls, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22><path d=%22M2 4l4 4 4-4%22 fill=%22none%22 stroke=%22%23111%22 stroke-width=%221.5%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  return (
    <label className={classNames("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={classNames("relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-ink" : "bg-ink/15")}
      >
        <span className={classNames("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium">{label}</span>}
          {description && <span className="block text-xs text-ink/55">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "olive"; children: ReactNode }) {
  const tones = {
    neutral: "bg-ink/[0.06] text-ink/70",
    success: "bg-[#e6efdf] text-[#3d5a2a]",
    warning: "bg-[#f8ecd6] text-[#8a5a12]",
    danger: "bg-[#f7e1dc] text-[#9a2a1a]",
    olive: "bg-[#ebebe4] text-olive-dark",
  };
  return <span className={classNames("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "md" | "lg" }) {
  useBodyLock(open);
  useEscape(open, onClose);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-[fade_.25s_ease] bg-ink/40" onClick={onClose} />
      <div
        ref={ref}
        className={classNames(
          "relative flex max-h-[92vh] max-h-[92dvh] w-full min-w-0 animate-[pop_.35s_cubic-bezier(.16,1,.3,1)] flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/[0.08] py-3 pl-5 pr-3 sm:py-4 sm:pl-6 sm:pr-4">
          <h2 className="min-w-0 font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-ink/5" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-ink/[0.08] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6 sm:pb-4 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes fade{from{opacity:0}}@keyframes pop{from{opacity:0;transform:translateY(24px) scale(.98)}}`}</style>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f7e1dc] text-[#b4321f]">
            <AlertTriangle className="size-5" />
          </span>
        )}
        <div className="text-sm leading-relaxed text-ink/70">{message}</div>
      </div>
    </Modal>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0 sm:flex-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink/55 [overflow-wrap:anywhere]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Barra de acciones fija al pie (guardar/cancelar), siempre accesible y respetando el área segura. */
export function SaveBar({ status, children }: { status: ReactNode; children: ReactNode }) {
  return (
    <div data-savebar className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/[0.08] bg-white/95 backdrop-blur lg:left-64">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8 sm:pb-3">
        <p className="min-w-0 text-center text-xs sm:text-left sm:text-sm" aria-live="polite">{status}</p>
        <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink/15 px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink/55">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
