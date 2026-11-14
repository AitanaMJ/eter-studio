import { ArrowLeft, Copy, Eye, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { discardUpload, MultiImageUploader } from "../../components/admin/ImageUploader";
import { Button, Card, ConfirmDialog, Field, Input, Modal, PageHeader, Pill, SaveBar, Select, Textarea, Toggle } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import { discountPercent, formatPrice } from "../../lib/format";
import type { AdminCategory, AdminProduct } from "../../lib/types";
import { useAdminError, useAdminMeta } from "./adminContext";

interface VariantRow {
  key: string;
  id?: number;
  size: string;
  color: string;
  color_hex: string;
  stock: string;
}

interface FormState {
  name: string;
  slug: string;
  sku: string;
  description: string;
  category_id: string;
  price: string;
  compare_at_price: string;
  is_active: boolean;
  is_featured: boolean;
  images: { url: string; alt?: string }[];
  variants: VariantRow[];
}

const PALETTE: { name: string; hex: string }[] = [
  { name: "Negro", hex: "#111111" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Marfil", hex: "#F5F3EE" },
  { name: "Piedra", hex: "#D9D6CF" },
  { name: "Oliva", hex: "#858579" },
  { name: "Camel", hex: "#B08B5E" },
  { name: "Arena", hex: "#CDBA9A" },
  { name: "Gris melange", hex: "#A7A7A2" },
  { name: "Índigo", hex: "#2F3E5C" },
  { name: "Celeste denim", hex: "#8FA9C4" },
  { name: "Chocolate", hex: "#5A3E2B" },
  { name: "Suela", hex: "#8A5A3B" },
  { name: "Azul noche", hex: "#1F2638" },
  { name: "Rosa empolvado", hex: "#D9B8B0" },
  { name: "Plata", hex: "#C4C6C8" },
  { name: "Dorado", hex: "#C8A964" },
];

let seq = 0;
const normalize = (f: FormState) => JSON.stringify({ ...f, variants: f.variants.map(({ key: _k, ...r }) => r) });
const rowKey = () => `r${++seq}`;
const emptyRow = (): VariantRow => ({ key: rowKey(), size: "", color: "", color_hex: "#111111", stock: "0" });

const EMPTY: FormState = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  category_id: "",
  price: "",
  compare_at_price: "",
  is_active: true,
  is_featured: false,
  images: [],
  variants: [emptyRow()],
};

function fromProduct(p: AdminProduct): FormState {
  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    category_id: String(p.category.id),
    price: String(p.price),
    compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "",
    is_active: p.is_active,
    is_featured: p.is_featured,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    variants: p.variants.map((v) => ({
      key: rowKey(),
      id: v.id,
      size: v.size,
      color: v.color,
      color_hex: v.color_hex ?? "#111111",
      stock: String(v.stock),
    })),
  };
}

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const onError = useAdminError();
  const { maxMb } = useAdminMeta();
  const { isDemo } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<"duplicate" | "delete" | null>(null);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [initial, setInitial] = useState<string>(JSON.stringify(EMPTY));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [saved, setSaved] = useState<AdminProduct | null>(null);
  const uploaded = useRef<Set<string>>(new Set());

  useEffect(() => {
    api.get<AdminCategory[]>("/api/admin/categories").then((c) => {
      setCats(c);
      if (isNew && c[0]) setForm((f) => (f.category_id ? f : { ...f, category_id: String(c[0].id) }));
    }).catch(onError);
  }, [isNew, onError]);

  useEffect(() => {
    if (isNew) {
      setForm((f) => ({ ...EMPTY, category_id: f.category_id }));
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<AdminProduct>(`/api/admin/products/${id}`)
      .then((p) => {
        const f = fromProduct(p);
        setForm(f);
        setInitial(JSON.stringify(f));
        setSaved(p);
      })
      .catch((e) => {
        onError(e);
        if (e instanceof ApiError && e.status === 404) navigate("/admin/productos", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, isNew, navigate, onError]);

  // Descartar imágenes subidas que no llegaron a guardarse (el backend no borra las que siguen en uso)
  useEffect(
    () => () => {
      uploaded.current.forEach((u) => void discardUpload(u));
    },
    [],
  );

  const dirty = useMemo(() => normalize(form) !== normalize(JSON.parse(initial) as FormState), [form, initial]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const { [k as string]: _omit, ...rest } = e;
      return rest;
    });
  };
  const setRow = (key: string, patch: Partial<VariantRow>) =>
    set("variants", form.variants.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const totalStock = form.variants.reduce((a, v) => a + (parseInt(v.stock) || 0), 0);
  const price = parseInt(form.price) || 0;
  const compare = parseInt(form.compare_at_price) || 0;
  const off = discountPercent(price, compare);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Ingresá un nombre (mín. 2 caracteres)";
    if (!form.category_id) e.category_id = "Elegí una categoría";
    if (!price || price <= 0) e.price = "El precio debe ser mayor a 0";
    if (form.compare_at_price && compare <= price) e.compare_at_price = "Debe ser mayor al precio actual";
    if (!form.variants.length) e.variants = "Agregá al menos una variante";
    const combos = new Set<string>();
    for (const v of form.variants) {
      const k = `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`;
      if (combos.has(k)) e.variants = `Variante repetida: ${v.size || "único"} / ${v.color || "sin color"}`;
      combos.add(k);
      if (!/^\d+$/.test(v.stock) || parseInt(v.stock) > 100000) e.variants = "El stock debe ser un número entero entre 0 y 100.000";
    }
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError("Revisá los campos marcados.");
      return;
    }
    const body = {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      sku: form.sku.trim() || null,
      description: form.description.trim(),
      category_id: parseInt(form.category_id),
      price,
      compare_at_price: compare || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      images: form.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
      variants: form.variants.map((v) => ({
        id: v.id,
        size: v.size.trim(),
        color: v.color.trim(),
        color_hex: v.color.trim() ? v.color_hex : null,
        stock: parseInt(v.stock) || 0,
      })),
    };
    setSaving(true);
    try {
      const p = isNew ? await api.post<AdminProduct>("/api/admin/products", body) : await api.put<AdminProduct>(`/api/admin/products/${id}`, body);
      uploaded.current.clear();
      const f = fromProduct(p);
      setForm(f);
      setInitial(JSON.stringify(f));
      setSaved(p);
      toast(isNew ? "Producto creado" : "Cambios guardados");
      if (isNew) navigate(`/admin/productos/${p.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        const fe: Record<string, string> = {};
        err.errors.forEach((x) => (fe[x.field.split(".")[0] || "form"] = x.message));
        setErrors(fe);
      }
      if (err instanceof ApiError && err.status !== 401) setFormError(err.message);
      else onError(err);
    } finally {
      setSaving(false);
    }
  }

  async function duplicate() {
    if (!saved) return;
    setBusy("duplicate");
    try {
      const copy = await api.post<AdminProduct>(`/api/admin/products/${saved.id}/duplicate`);
      toast(dirty ? "Se duplicó la versión guardada. La copia quedó inactiva." : "Producto duplicado. La copia quedó inactiva para que la revises.");
      navigate(`/admin/productos/${copy.id}`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!saved) return;
    setBusy("delete");
    try {
      await api.del(`/api/admin/products/${saved.id}`);
      toast(`“${saved.name}” eliminado`);
      navigate("/admin/productos", { replace: true });
    } catch (e) {
      onError(e);
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-72 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="pb-36 sm:pb-28">
      <Link to="/admin/productos" className="-mt-2 mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink/55 hover:text-ink">
        <ArrowLeft className="size-4" /> Productos
      </Link>
      <PageHeader
        title={isNew ? "Nuevo producto" : form.name || "Editar producto"}
        description={isNew ? "Completá la información y guardá para publicarlo." : `SKU ${form.sku}`}
        actions={
          saved ? (
            <>
              {saved.is_active && (
                <a href={`/producto/${saved.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-white px-4 text-sm font-medium hover:border-ink/40">
                  <Eye className="size-4" /> Ver en tienda
                </a>
              )}
              <Button type="button" variant="secondary" onClick={duplicate} loading={busy === "duplicate"}>
                {busy !== "duplicate" && <Copy className="size-4" />} Duplicar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={isDemo}
                title={isDemo ? "La cuenta demo no puede eliminar" : "Eliminar producto"}
                className="text-[#b4321f] hover:bg-[#f7e1dc] hover:text-[#9a2a1a]"
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Información general">
            <div className="grid gap-4">
              <Field label="Nombre *" htmlFor="name" error={errors.name}>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="Ej: Remera Essential" />
              </Field>
              <Field label="Descripción" htmlFor="desc" hint={`${form.description.length}/4000`}>
                <Textarea id="desc" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} placeholder="Material, calce, detalles de confección…" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoría *" htmlFor="cat" error={errors.category_id}>
                  <Select id="cat" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                    <option value="" disabled>Elegí una categoría</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.is_active ? "" : " (inactiva)"}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="SKU" htmlFor="sku" hint="Se genera automáticamente si lo dejás vacío" error={errors.sku}>
                  <Input id="sku" value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} maxLength={40} placeholder="ETR-REM-009" />
                </Field>
              </div>
              <Field label="URL (slug)" htmlFor="slug" hint="Se genera a partir del nombre si lo dejás vacío" error={errors.slug}>
                <div className="flex min-w-0 items-center rounded-xl border border-ink/12 bg-[#fafaf8] pl-3.5 focus-within:border-ink">
                  <span className="shrink-0 text-sm text-ink/40">/producto/</span>
                  <input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    maxLength={140}
                    className="h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none sm:text-sm"
                  />
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Imágenes" description="La primera imagen es la principal. Arrastrá o usá las flechas para reordenar.">
            <MultiImageUploader
              kind="product"
              images={form.images}
              onChange={(imgs) => set("images", imgs)}
              onUploaded={(u) => uploaded.current.add(u)}
              maxMb={maxMb}
            />
          </Card>

          <Card
            title="Variantes y stock"
            description="Cada combinación de talle y color tiene su propio stock. Dejá el talle vacío para productos de talle único."
            actions={
              <div className="flex w-full gap-2 xs:w-auto [&>*]:flex-1 xs:[&>*]:flex-none">
                <Button type="button" variant="secondary" size="sm" onClick={() => setGenOpen(true)}>
                  <Wand2 className="size-4" /> Generar
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => set("variants", [...form.variants, emptyRow()])}>
                  <Plus className="size-4" /> Agregar
                </Button>
              </div>
            }
          >
            {errors.variants && <p className="mb-3 rounded-xl bg-[#f7e1dc] px-3 py-2 text-sm text-[#9a2a1a]">{errors.variants}</p>}
            <div className="hidden grid-cols-[1fr_1.4fr_110px_40px] gap-2 px-1 pb-2 text-xs font-medium uppercase tracking-wider text-ink/45 sm:grid">
              <span>Talle</span>
              <span>Color</span>
              <span>Stock</span>
              <span />
            </div>
            <ul className="space-y-2">
              {form.variants.map((v, idx) => (
                <li
                  key={v.key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] items-end gap-x-2 gap-y-2.5 rounded-xl border border-ink/[0.08] p-3 sm:grid-cols-[1fr_1.4fr_110px_40px] sm:items-center sm:gap-y-2 sm:border-0 sm:p-0"
                >
                  <p className="col-span-3 -mb-1 text-xs font-medium text-ink/45 sm:hidden">Variante {idx + 1}</p>
                  <label className="min-w-0">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink/45 sm:hidden">Talle</span>
                    <Input aria-label="Talle" value={v.size} onChange={(e) => setRow(v.key, { size: e.target.value.toUpperCase() })} placeholder="Único" maxLength={20} className="h-11 sm:h-10" />
                  </label>
                  <div className="order-last col-span-3 min-w-0 sm:order-none sm:col-span-1">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink/45 sm:hidden">Color</span>
                    <div className="flex items-center gap-2">
                    <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-ink/12 sm:size-10" title="Elegir color">
                      <span className="absolute inset-0" style={{ background: v.color_hex }} />
                      <input type="color" value={v.color_hex} onChange={(e) => setRow(v.key, { color_hex: e.target.value.toUpperCase() })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Color hexadecimal" />
                    </label>
                    <Input
                      aria-label="Nombre del color"
                      list="palette"
                      value={v.color}
                      onChange={(e) => {
                        const match = PALETTE.find((p) => p.name.toLowerCase() === e.target.value.toLowerCase());
                        setRow(v.key, { color: e.target.value, ...(match ? { color_hex: match.hex } : {}) });
                      }}
                      placeholder="Sin color"
                      maxLength={40}
                      className="h-11 sm:h-10"
                    />
                    </div>
                  </div>
                  <label className="min-w-0">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink/45 sm:hidden">Stock</span>
                    <Input aria-label="Stock" type="number" inputMode="numeric" min={0} max={100000} value={v.stock} onChange={(e) => setRow(v.key, { stock: e.target.value.replace(/[^\d]/g, "") })} className="h-11 tabular-nums sm:h-10" />
                  </label>
                  <button
                    type="button"
                    onClick={() => set("variants", form.variants.filter((r) => r.key !== v.key))}
                    disabled={form.variants.length === 1}
                    className="inline-flex h-11 w-10 items-center justify-center rounded-xl text-ink/50 hover:bg-[#f7e1dc] hover:text-[#b4321f] disabled:opacity-30 sm:size-10"
                    aria-label="Quitar variante"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <datalist id="palette">
              {PALETTE.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-[#fafaf8] px-4 py-3 text-sm">
              <span className="text-ink/60">{form.variants.length} variantes</span>
              <span>
                Stock total: <strong className="tabular-nums">{totalStock}</strong>{" "}
                {totalStock === 0 ? <Pill tone="danger">Agotado</Pill> : totalStock <= 5 ? <Pill tone="warning">Bajo</Pill> : null}
              </span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Precio">
            <div className="grid gap-4">
              <Field label="Precio (ARS) *" htmlFor="price" error={errors.price}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/40">$</span>
                  <Input id="price" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} className="pl-7 tabular-nums" placeholder="28900" />
                </div>
              </Field>
              <Field label="Precio anterior (opcional)" htmlFor="compare" hint="Si es mayor al precio, se muestra como oferta" error={errors.compare_at_price}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/40">$</span>
                  <Input id="compare" inputMode="numeric" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value.replace(/[^\d]/g, ""))} className="pl-7 tabular-nums" placeholder="—" />
                </div>
              </Field>
              {price > 0 && (
                <div className="rounded-xl bg-[#fafaf8] px-4 py-3 text-sm">
                  <span className="text-ink/55">Vista previa: </span>
                  <span className={off ? "font-medium text-sale" : "font-medium"}>{formatPrice(price)}</span>
                  {off > 0 && (
                    <>
                      <s className="ml-2 text-ink/40">{formatPrice(compare)}</s> <Pill tone="danger">−{off}%</Pill>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title="Visibilidad">
            <div className="space-y-5">
              <Toggle checked={form.is_active} onChange={(v) => set("is_active", v)} label="Activo" description="Visible en la tienda pública" />
              <Toggle checked={form.is_featured} onChange={(v) => set("is_featured", v)} label="Destacado" description="Aparece en la sección de destacados de la portada" />
            </div>
          </Card>

          {saved && (
            <Card title="Información">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-ink/55">Creado</dt><dd>{new Date(saved.created_at).toLocaleDateString("es-AR")}</dd></div>
                <div className="flex justify-between gap-2"><dt className="shrink-0 text-ink/55">Actualizado</dt><dd className="text-right">{new Date(saved.updated_at).toLocaleString("es-AR")}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink/55">Etiqueta “Nuevo”</dt><dd>{saved.is_new ? "Sí" : "No"}</dd></div>
              </dl>
            </Card>
          )}
        </div>
      </div>

      <SaveBar
        status={formError ? <span className="text-[#b4321f]">{formError}</span> : dirty ? <span className="text-ink/60">Tenés cambios sin guardar</span> : <span className="text-ink/40">Sin cambios</span>}
      >
        <Button type="button" variant="secondary" onClick={() => navigate("/admin/productos")}>Cancelar</Button>
        <Button type="submit" loading={saving} disabled={!dirty && !isNew}>
          {isNew ? "Crear producto" : "Guardar cambios"}
        </Button>
      </SaveBar>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Eliminar producto"
        message={
          <>
            ¿Seguro que querés eliminar <strong>{saved?.name}</strong>? Se borrarán sus variantes e imágenes. Esta acción no se puede deshacer.
            <span className="mt-2 block text-xs text-ink/50">Si sólo querés ocultarlo de la tienda, desactivalo.</span>
          </>
        }
        confirmLabel="Eliminar"
        loading={busy === "delete"}
        onConfirm={remove}
      />

      <VariantGenerator
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onApply={(rows, mode) => {
          set("variants", mode === "replace" ? rows : [...form.variants.filter((r) => r.size || r.color || r.stock !== "0"), ...rows]);
          setGenOpen(false);
        }}
      />
    </form>
  );
}

function VariantGenerator({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (rows: VariantRow[], mode: "replace" | "append") => void }) {
  const [sizes, setSizes] = useState("XS, S, M, L, XL");
  const [colors, setColors] = useState<string[]>(["Negro"]);
  const [stock, setStock] = useState("10");
  const sizeList = sizes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const count = Math.max(1, sizeList.length) * Math.max(1, colors.length);

  function build(): VariantRow[] {
    const ss = sizeList.length ? sizeList : [""];
    const cs = colors.length ? colors : [""];
    return cs.flatMap((c) =>
      ss.map((s) => ({ key: rowKey(), size: s, color: c, color_hex: PALETTE.find((p) => p.name === c)?.hex ?? "#111111", stock: stock || "0" })),
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generar variantes"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onApply(build(), "append")}>Agregar a las existentes</Button>
          <Button onClick={() => onApply(build(), "replace")}><Sparkles className="size-4" /> Reemplazar ({count})</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Talles (separados por coma)" hint="Ej: XS, S, M, L, XL · 36, 38, 40 · dejá vacío para talle único">
          <Input value={sizes} onChange={(e) => setSizes(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {[["XS, S, M, L, XL", "Ropa"], ["36, 38, 40, 42, 44", "Jeans"], ["", "Talle único"]].map(([v, l]) => (
            <button key={l} type="button" onClick={() => setSizes(v)} className="min-h-9 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs hover:border-ink">{l}</button>
          ))}
        </div>
        <Field label="Colores">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((p) => {
              const on = colors.includes(p.name);
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setColors((c) => (on ? c.filter((x) => x !== p.name) : [...c, p.name]))}
                  className={"inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs " + (on ? "border-ink bg-ink text-white" : "border-ink/15 hover:border-ink")}
                >
                  <span className="size-3.5 rounded-full ring-1 ring-ink/20" style={{ background: p.hex }} />
                  {p.name}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Stock inicial por variante">
          <Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className="max-w-[140px]" />
        </Field>
        <p className="rounded-xl bg-[#fafaf8] px-4 py-3 text-sm text-ink/65">Se generarán <strong>{count}</strong> variantes.</p>
      </div>
    </Modal>
  );
}
