import { ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, Package, Palette, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/api";
import { classNames } from "../../lib/format";
import { useBodyLock, useEscape } from "../../lib/hooks";
import { useAdminMeta } from "../../pages/admin/adminContext";
import { ConfirmDialog } from "./ui";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/categorias", label: "Categorías", icon: FolderTree },
  { to: "/admin/personalizacion", label: "Personalización", icon: Palette },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout, isDemo } = useAuth();
  const { settings, reload } = useSettings();
  const meta = useAdminMeta();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  useBodyLock(open);
  useEscape(open, () => setOpen(false));
  useEffect(() => setOpen(false), [pathname]);
  // Al pasar a escritorio el menú móvil deja de tener sentido
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const h = () => mq.matches && setOpen(false);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? "Panel";

  async function doReset() {
    setResetting(true);
    try {
      await api.post("/api/admin/demo/reset");
      await reload();
      toast("Datos de demostración restaurados");
      setConfirmReset(false);
      navigate("/admin", { replace: true });
      window.setTimeout(() => window.location.reload(), 300);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo restaurar", "error");
    } finally {
      setResetting(false);
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link to="/admin" className="flex items-baseline gap-1.5">
          <span className="font-display text-xl font-bold tracking-[-0.04em]">{settings.store_name.split(" ")[0]}</span>
          <span className="rounded-md bg-ink px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white">Admin</span>
        </Link>
        <button className="-mr-1 inline-flex size-11 items-center justify-center rounded-full hover:bg-ink/5 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="size-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Panel">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              classNames(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:min-h-0",
                isActive ? "bg-ink text-white" : "text-ink/65 hover:bg-ink/5 hover:text-ink",
              )
            }
          >
            <Icon className="size-[18px]" /> {label}
          </NavLink>
        ))}
        <a href="/" target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 lg:min-h-0 text-sm font-medium text-ink/65 hover:bg-ink/5 hover:text-ink">
          <ExternalLink className="size-[18px]" /> Ver tienda
        </a>
      </nav>
      {meta.demoMode && (
        <div className="mx-3 mb-3 rounded-2xl bg-[#ebebe4] p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-olive-dark">
            <Sparkles className="size-3.5" /> Modo demostración
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink/60">
            Podés probar todo libremente. {meta.resetInterval ? `Los datos se restauran cada ${meta.resetInterval} min.` : "Restaurá los datos cuando quieras."}
          </p>
          <button
            onClick={() => {
              setOpen(false);
              setConfirmReset(true);
            }}
            className="-mx-1 mt-2 inline-flex min-h-11 items-center gap-1.5 px-1 text-xs font-semibold text-ink hover:underline lg:min-h-9"
          >
            <RotateCcw className="size-3.5" /> Restaurar datos demo
          </button>
        </div>
      )}
      <div className="shrink-0 border-t border-ink/[0.08] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
            {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-ink/50" title={user?.email}>{isDemo ? "Cuenta demo" : user?.email}</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate("/admin/login", { replace: true });
            }}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink lg:size-9"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div data-admin className="min-h-screen bg-[#f7f7f5] font-sans text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink/[0.08] bg-white lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
          <div className="absolute inset-0 animate-[fade_.2s_ease] bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 h-dvh w-[280px] max-w-[85vw] animate-[slide_.35s_cubic-bezier(.16,1,.3,1)] bg-white pt-[env(safe-area-inset-top)] shadow-2xl">{sidebar}</aside>
          <style>{`@keyframes slide{from{transform:translateX(-100%)}}@keyframes fade{from{opacity:0}}`}</style>
        </div>
      )}

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-ink/[0.08] bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
          <div className="grid h-14 grid-cols-[44px_minmax(0,1fr)_44px] items-center px-2 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ink/5"
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>
          <span className="truncate text-center font-display font-bold tracking-tight">{current}</span>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ink/5" aria-label="Ver tienda">
            <ExternalLink className="size-4" />
          </a>
          </div>
        </header>
        {isDemo && (
          <div className="border-b border-[#e3e0d2] bg-[#f4f2e8] px-4 py-2 text-center text-xs text-olive-dark sm:px-8">
            Estás usando la <strong>cuenta demo</strong>: algunas acciones (eliminar y cambiar datos de contacto) están deshabilitadas.
          </div>
        )}
        <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Restaurar datos de demostración"
        message="Se reemplazarán productos, categorías, imágenes y configuración por los datos originales de la demo. Los usuarios no se modifican."
        confirmLabel="Restaurar"
        loading={resetting}
        onConfirm={doReset}
      />
    </div>
  );
}
