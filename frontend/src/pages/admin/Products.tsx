import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, ConfirmDialog, EmptyState, PageHeader, Pill, Select, Toggle } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, mediaUrl } from "../../lib/api";
import { classNames, formatPrice } from "../../lib/format";
import { useDebounced } from "../../lib/hooks";
import type { AdminCategory, AdminProduct, Page } from "../../lib/types";
import { useAdminError } from "./adminContext";

const LOW = 5;

function StockPill({ stock }: { stock: number }) {
  if (stock === 0) return <Pill tone="danger">Agotado</Pill>;
  if (stock <= LOW) return <Pill tone="warning">{stock} u. · bajo</Pill>;
  return <Pill tone="success">{stock} u.</Pill>;
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const { isDemo } = useAuth();
  const toast = useToast();
  const onError = useAdminError();
  const navigate = useNavigate();
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [data, setData] = useState<Page<AdminProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDebounced(q.trim(), 300);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const filters = {
    category_id: params.get("category_id") ?? "",
    status: params.get("status") ?? "",
    stock: params.get("stock") ?? "",
    featured: params.get("featured") === "1" ? "true" : "",
    sort: params.get("sort") ?? "newest",
    page: Number(params.get("page")) || 1,
  };

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== "page") n.delete("page");
    setParams(n, { replace: true });
  };

  useEffect(() => {
    if (dq !== (params.get("q") ?? "")) set("q", dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  useEffect(() => {
    api.get<AdminCategory[]>("/api/admin/categories").then(setCats).catch(onError);
  }, [onError]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Page<AdminProduct>>("/api/admin/products", {
        q: params.get("q") ?? "",
        category_id: filters.category_id,
        status: filters.status,
        stock: filters.stock,
        featured: filters.featured,
        sort: filters.sort,
        page: filters.page,
        page_size: 12,
      })
      .then(setData)
      .catch(onError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, onError]);

  useEffect(load, [load]);

  const replace = (p: AdminProduct) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === p.id ? p : x)) } : d));

  async function toggleActive(p: AdminProduct) {
    setBusy(p.id);
    try {
      replace(await api.patch<AdminProduct>(`/api/admin/products/${p.id}/status`, { is_active: !p.is_active }));
      toast(p.is_active ? `“${p.name}” desactivado` : `“${p.name}” activado`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  async function toggleFeatured(p: AdminProduct) {
    setBusy(p.id);
    try {
      replace(await api.patch<AdminProduct>(`/api/admin/products/${p.id}/featured`, { is_featured: !p.is_featured }));
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  async function duplicate(p: AdminProduct) {
    setBusy(p.id);
    try {
      const copy = await api.post<AdminProduct>(`/api/admin/products/${p.id}/duplicate`);
      toast("Producto duplicado. La copia quedó inactiva para que la revises.");
      navigate(`/admin/productos/${copy.id}`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/api/admin/products/${toDelete.id}`);
      toast(`“${toDelete.name}” eliminado`);
      setToDelete(null);
      load();
    } catch (e) {
      onError(e);
    } finally {
      setDeleting(false);
    }
  }

  const actions = (p: AdminProduct) => (
    <div className="flex items-center justify-end gap-0.5 md:gap-0.5">
      <IconAction label={p.is_featured ? "Quitar de destacados" : "Destacar"} onClick={() => toggleFeatured(p)} disabled={busy === p.id}>
        <Star className={classNames("size-4", p.is_featured && "fill-[#c8a964] text-[#c8a964]")} />
      </IconAction>
      <IconAction label="Duplicar" onClick={() => duplicate(p)} disabled={busy === p.id}>
        <Copy className="size-4" />
      </IconAction>
      <Link to={`/admin/productos/${p.id}`} className="inline-flex size-10 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 hover:text-ink md:size-9" aria-label="Editar" title="Editar">
        <Pencil className="size-4" />
      </Link>
      <IconAction
        label={isDemo ? "La cuenta demo no puede eliminar" : "Eliminar"}
        onClick={() => setToDelete(p)}
        disabled={isDemo}
        danger
      >
        <Trash2 className="size-4" />
      </IconAction>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Productos"
        description={data ? `${data.total} productos en el catálogo` : "Cargando…"}
        actions={
          <Link to="/admin/productos/nuevo" className="inline-flex h-11 w-full items-center justify-center gap-2 sm:w-auto rounded-xl bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft">
            <Plus className="size-4" /> Nuevo producto
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-ink/[0.08] bg-white p-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] [&>*]:min-w-0">
        <label className="relative col-span-2 lg:col-span-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Buscar por nombre o SKU"
            className="h-11 w-full rounded-xl border border-ink/12 pl-9 pr-3 text-base outline-none focus:border-ink sm:text-sm"
          />
        </label>
        <Select aria-label="Categoría" value={filters.category_id} onChange={(e) => set("category_id", e.target.value)}>
          <option value="">Categoría</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select aria-label="Estado" value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">Estado</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
        <Select aria-label="Stock" value={filters.stock} onChange={(e) => set("stock", e.target.value)}>
          <option value="">Stock</option>
          <option value="available">Con stock</option>
          <option value="low">Stock bajo</option>
          <option value="out">Agotados</option>
        </Select>
        <Select aria-label="Ordenar" value={filters.sort} onChange={(e) => set("sort", e.target.value)}>
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="name_asc">Nombre A–Z</option>
          <option value="price_asc">Precio ↑</option>
          <option value="price_desc">Precio ↓</option>
        </Select>
      </div>
      {filters.featured && (
        <div className="mb-4">
          <button onClick={() => set("featured", "")} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs text-white">
            Sólo destacados ✕
          </button>
        </div>
      )}

      {data && data.items.length === 0 && !loading ? (
        <EmptyState
          title="No se encontraron productos"
          text="Probá con otra búsqueda o cambiá los filtros."
          action={<Button variant="secondary" onClick={() => { setQ(""); setParams({}); }}>Limpiar filtros</Button>}
        />
      ) : (
        <div className={classNames("transition-opacity", loading && "opacity-60")}>
          {/* Tabla (tablet / desktop) */}
          <div className="hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-ink/[0.08] bg-white md:block">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-ink/[0.08] bg-[#fafaf8] text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="py-3 pl-4 pr-2 font-medium">Producto</th>
                  <th className="hidden px-2 py-3 font-medium xl:table-cell">Categoría</th>
                  <th className="px-2 py-3 font-medium">Precio</th>
                  <th className="px-2 py-3 font-medium">Stock</th>
                  <th className="px-2 py-3 font-medium">Activo</th>
                  <th className="py-3 pl-2 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {(data?.items ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-[#fafaf8]">
                    <td className="min-w-[200px] py-3 pl-4 pr-2">
                      <Link to={`/admin/productos/${p.id}`} className="flex min-w-0 items-center gap-3">
                        <Thumb url={p.images[0]?.url} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.name}</span>
                          <span className="block text-xs text-ink/45">{p.sku}<span className="xl:hidden"> · {p.category.name}</span></span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden whitespace-nowrap px-2 py-3 text-ink/70 xl:table-cell">{p.category.name}</td>
                    <td className="whitespace-nowrap px-2 py-3 tabular-nums">
                      {formatPrice(p.price)}
                      {p.compare_at_price && <s className="block text-xs text-ink/40 xl:ml-1.5 xl:inline">{formatPrice(p.compare_at_price)}</s>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3"><StockPill stock={p.stock} /></td>
                    <td className="px-2 py-3">
                      <Toggle checked={p.is_active} onChange={() => toggleActive(p)} disabled={busy === p.id} />
                    </td>
                    <td className="py-3 pl-2 pr-4">{actions(p)}</td>
                  </tr>
                ))}
                {!data && Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}><td colSpan={6} className="p-4"><div className="skeleton h-10 rounded-lg" /></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas (mobile) */}
          <ul className="space-y-3 md:hidden">
            {(data?.items ?? []).map((p) => (
              <li key={p.id} className="rounded-2xl border border-ink/[0.08] bg-white p-3">
                <Link to={`/admin/productos/${p.id}`} className="flex gap-3">
                  <Thumb url={p.images[0]?.url} large />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug [overflow-wrap:anywhere]">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink/45">{p.sku} · {p.category.name}</p>
                    <p className="mt-1 text-sm tabular-nums">
                      {formatPrice(p.price)}
                      {p.compare_at_price && <s className="ml-1.5 text-xs text-ink/40">{formatPrice(p.compare_at_price)}</s>}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <StockPill stock={p.stock} />
                      {!p.is_active && <Pill>Inactivo</Pill>}
                    </div>
                  </div>
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-ink/[0.06] pt-3">
                  <Toggle checked={p.is_active} onChange={() => toggleActive(p)} label={p.is_active ? "Activo" : "Inactivo"} disabled={busy === p.id} />
                  {actions(p)}
                </div>
              </li>
            ))}
            {!data && Array.from({ length: 4 }, (_, i) => <li key={i} className="skeleton h-32 rounded-2xl" />)}
          </ul>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-ink/55">Página {data.page} de {data.pages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={data.page <= 1} onClick={() => set("page", String(data.page - 1))}>
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            <Button variant="secondary" size="sm" disabled={data.page >= data.pages} onClick={() => set("page", String(data.page + 1))}>
              Siguiente <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Eliminar producto"
        message={
          <>
            ¿Seguro que querés eliminar <strong>{toDelete?.name}</strong>? Se borrarán sus variantes e imágenes. Esta acción no se puede deshacer.
            <br />
            <span className="mt-2 block text-xs text-ink/50">Si sólo querés ocultarlo de la tienda, desactivalo.</span>
          </>
        }
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function Thumb({ url, large }: { url?: string; large?: boolean }) {
  return url ? (
    <img src={mediaUrl(url)} alt="" loading="lazy" className={classNames("shrink-0 rounded-lg bg-[#f1f0ec] object-cover", large ? "h-20 w-16" : "h-12 w-10")} />
  ) : (
    <span className={classNames("shrink-0 rounded-lg bg-[#f1f0ec]", large ? "h-20 w-16" : "h-12 w-10")} />
  );
}

function IconAction({ children, label, onClick, disabled, danger }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={classNames(
        "inline-flex size-10 items-center justify-center rounded-lg text-ink/60 transition-colors disabled:opacity-30 md:size-9",
        danger ? "hover:bg-[#f7e1dc] hover:text-[#b4321f]" : "hover:bg-ink/5 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
