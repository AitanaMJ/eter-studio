import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { discardUpload, SingleImageUploader } from "../../components/admin/ImageUploader";
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Pill, Textarea, Toggle } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError, mediaUrl } from "../../lib/api";
import type { AdminCategory } from "../../lib/types";
import { useAdminError, useAdminMeta } from "./adminContext";

interface Draft {
  id?: number;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
}

const EMPTY: Draft = { name: "", slug: "", description: "", image_url: null, is_active: true };

export default function Categories() {
  const { isDemo } = useAuth();
  const toast = useToast();
  const onError = useAdminError();
  const { maxMb } = useAdminMeta();
  const [cats, setCats] = useState<AdminCategory[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const uploaded = useRef<Set<string>>(new Set());

  const load = useCallback(() => {
    api.get<AdminCategory[]>("/api/admin/categories").then(setCats).catch(onError);
  }, [onError]);
  useEffect(load, [load]);

  function closeModal() {
    uploaded.current.forEach((u) => void discardUpload(u));
    uploaded.current.clear();
    setDraft(null);
    setError(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (draft.name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setSaving(true);
    setError(null);
    const body = { name: draft.name.trim(), slug: draft.slug.trim() || null, description: draft.description.trim(), image_url: draft.image_url, is_active: draft.is_active };
    try {
      if (draft.id) await api.put(`/api/admin/categories/${draft.id}`, body);
      else await api.post("/api/admin/categories", body);
      uploaded.current.clear();
      toast(draft.id ? "Categoría actualizada" : "Categoría creada");
      setDraft(null);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) setError(err.message);
      else onError(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: AdminCategory) {
    try {
      const u = await api.patch<AdminCategory>(`/api/admin/categories/${c.id}/status`, { is_active: !c.is_active });
      setCats((cs) => cs?.map((x) => (x.id === c.id ? u : x)) ?? null);
      toast(u.is_active ? "Categoría activada" : "Categoría desactivada: sus productos dejan de verse en la tienda");
    } catch (e) {
      onError(e);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!cats) return;
    const next = [...cats];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setCats(next);
    try {
      setCats(await api.put<AdminCategory[]>("/api/admin/categories/order/apply", { ids: next.map((c) => c.id) }));
    } catch (e) {
      onError(e);
      load();
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/api/admin/categories/${toDelete.id}`);
      toast("Categoría eliminada");
      setToDelete(null);
      load();
    } catch (e) {
      onError(e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organizan el catálogo y los filtros de la tienda. El orden se refleja en la portada."
        actions={
          <Button onClick={() => setDraft({ ...EMPTY })} className="w-full sm:w-auto">
            <Plus className="size-4" /> Nueva categoría
          </Button>
        }
      />

      {cats && cats.length === 0 && <EmptyState title="Todavía no hay categorías" action={<Button onClick={() => setDraft({ ...EMPTY })}>Crear la primera</Button>} />}

      <ul className="space-y-3">
        {(cats ?? []).map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/[0.08] bg-white p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
            <div className="flex shrink-0 flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="inline-flex size-9 items-center justify-center rounded-md text-ink/50 hover:bg-ink/5 hover:text-ink disabled:opacity-25 sm:size-7" aria-label={`Subir ${c.name}`}>
                <ArrowUp className="size-4" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === cats!.length - 1} className="inline-flex size-9 items-center justify-center rounded-md text-ink/50 hover:bg-ink/5 hover:text-ink disabled:opacity-25 sm:size-7" aria-label={`Bajar ${c.name}`}>
                <ArrowDown className="size-4" />
              </button>
            </div>
            {c.image_url ? (
              <img src={mediaUrl(c.image_url)} alt="" className="h-16 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="h-16 w-14 shrink-0 rounded-lg bg-[#f1f0ec]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium [overflow-wrap:anywhere]">{c.name}</p>
              <p className="truncate text-xs text-ink/50">/{c.slug}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Pill>{c.product_count} productos</Pill>
                {!c.is_active && <Pill tone="warning">Oculta</Pill>}
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-2 border-t border-ink/[0.06] pt-3 sm:w-auto sm:border-0 sm:pt-0">
              <Toggle checked={c.is_active} onChange={() => toggle(c)} label={c.is_active ? "Activa" : "Inactiva"} />
              <div className="flex">
                <button
                  onClick={() => setDraft({ id: c.id, name: c.name, slug: c.slug, description: c.description, image_url: c.image_url, is_active: c.is_active })}
                  className="inline-flex size-11 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 hover:text-ink sm:size-9"
                  aria-label={`Editar ${c.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => setToDelete(c)}
                  disabled={isDemo || c.product_count > 0}
                  title={isDemo ? "La cuenta demo no puede eliminar" : c.product_count > 0 ? "Tiene productos asociados: reasignalos o desactivá la categoría" : "Eliminar"}
                  className="inline-flex size-11 items-center justify-center rounded-lg text-ink/60 sm:size-9 hover:bg-[#f7e1dc] hover:text-[#b4321f] disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={`Eliminar ${c.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
        {!cats && Array.from({ length: 4 }, (_, i) => <li key={i} className="skeleton h-24 rounded-2xl" />)}
      </ul>

      <Modal
        open={!!draft}
        onClose={closeModal}
        title={draft?.id ? "Editar categoría" : "Nueva categoría"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="cat-form" loading={saving}>Guardar</Button>
          </>
        }
      >
        {draft && (
          <form id="cat-form" onSubmit={save} className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]" noValidate>
            <div className="space-y-4">
              <Field label="Nombre *" htmlFor="c-name">
                <Input id="c-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />
              </Field>
              <Field label="Slug" htmlFor="c-slug" hint="Opcional: se genera a partir del nombre">
                <Input id="c-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} maxLength={100} />
              </Field>
              <Field label="Descripción" htmlFor="c-desc">
                <Textarea id="c-desc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={600} />
              </Field>
              <Toggle checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} label="Activa" description="Si se desactiva, sus productos no se muestran en la tienda" />
            </div>
            <Field label="Imagen">
              <SingleImageUploader kind="category" value={draft.image_url} onChange={(u) => setDraft({ ...draft, image_url: u })} onUploaded={(u) => uploaded.current.add(u)} maxMb={maxMb} />
            </Field>
            {error && <p className="rounded-xl bg-[#f7e1dc] px-3 py-2 text-sm text-[#9a2a1a] sm:col-span-2">{error}</p>}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Eliminar categoría"
        message={<>¿Eliminar <strong>{toDelete?.name}</strong>? Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={remove}
      />
    </>
  );
}
