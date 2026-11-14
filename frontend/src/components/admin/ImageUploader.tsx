import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Info, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { api, ApiError, mediaUrl } from "../../lib/api";
import { classNames } from "../../lib/format";
import { useToast } from "../../context/ToastContext";

export type UploadKind = "product" | "category" | "hero" | "banner" | "logo";

export const RECOMMENDED: Record<UploadKind, { w: number; h: number; label: string; aspect: string }> = {
  product: { w: 1000, h: 1250, label: "Producto", aspect: "aspect-[4/5]" },
  category: { w: 800, h: 1000, label: "Categoría", aspect: "aspect-[4/5]" },
  hero: { w: 1920, h: 900, label: "Hero / banner principal", aspect: "aspect-[1920/900]" },
  banner: { w: 1600, h: 600, label: "Banner secundario", aspect: "aspect-[16/6]" },
  logo: { w: 400, h: 120, label: "Logo", aspect: "aspect-[10/3]" },
};

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

interface UploadResult {
  url: string;
  width: number;
  height: number;
  size_kb: number;
}

export async function uploadImage(file: File, kind: UploadKind, maxMb: number): Promise<UploadResult> {
  if (!ACCEPT.includes(file.type)) throw new ApiError(415, `“${file.name}”: formato no permitido (usar JPG, PNG o WEBP).`);
  if (file.size > maxMb * 1024 * 1024) throw new ApiError(413, `“${file.name}” supera ${maxMb} MB.`);
  const fd = new FormData();
  fd.append("kind", kind);
  fd.append("file", file);
  return api.post<UploadResult>("/api/admin/uploads", fd);
}

/** Descarta del servidor una imagen subida que finalmente no se guardó. */
export function discardUpload(url: string) {
  return api.del("/api/admin/uploads", { url }).catch(() => {});
}

export function RecommendedHint({ kind }: { kind: UploadKind }) {
  const r = RECOMMENDED[kind];
  return (
    <p className="flex items-start gap-1.5 text-xs text-ink/55">
      <Info className="mt-px size-3.5 shrink-0" />
      <span>
        Recomendado: <strong className="font-medium text-ink/75">{r.w} × {r.h} px</strong> · JPG, PNG o WEBP. Se optimiza automáticamente a WebP y se
        mantienen las proporciones.
      </span>
    </p>
  );
}

interface MultiProps {
  kind: UploadKind;
  images: { url: string; alt?: string }[];
  onChange: (imgs: { url: string; alt?: string }[]) => void;
  onUploaded?: (url: string) => void;
  maxMb: number;
  max?: number;
}

/** Galería con carga múltiple, vista previa, reordenamiento (drag & drop o flechas) y eliminación. */
export function MultiImageUploader({ kind, images, onChange, onUploaded, maxMb, max = 8 }: MultiProps) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ id: string; preview: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const r = RECOMMENDED[kind];

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, Math.max(0, max - images.length));
    if (!list.length) {
      toast(`Máximo ${max} imágenes por producto`, "info");
      return;
    }
    const items = list.map((f) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, preview: URL.createObjectURL(f), file: f }));
    setPending((p) => [...p, ...items.map(({ id, preview }) => ({ id, preview }))]);
    const added: { url: string; alt?: string }[] = [];
    for (const it of items) {
      try {
        const res = await uploadImage(it.file, kind, maxMb);
        added.push({ url: res.url, alt: "" });
        onUploaded?.(res.url);
        const ratio = res.width / res.height;
        if (Math.abs(ratio - r.w / r.h) > 0.12) toast(`“${it.file.name}” no tiene la proporción recomendada (${r.w}×${r.h}). Se verá recortada en algunas vistas.`, "info");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Error al subir la imagen", "error");
      } finally {
        URL.revokeObjectURL(it.preview);
        setPending((p) => p.filter((x) => x.id !== it.id));
      }
    }
    if (added.length) onChange([...images, ...added]);
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <div
            key={img.url}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragIdx !== null) move(dragIdx, i);
              setDragIdx(null);
            }}
            onDragEnd={() => setDragIdx(null)}
            className={classNames(
              "group relative overflow-hidden rounded-xl border bg-[#f1f0ec]",
              r.aspect,
              dragIdx === i ? "border-ink opacity-50" : "border-ink/10",
            )}
          >
            <img src={mediaUrl(img.url)} alt={`Imagen ${i + 1}`} className="size-full object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold">
              {i === 0 ? "Principal" : i + 1}
            </span>
            <span className="absolute right-2 top-2 hidden cursor-grab rounded-full bg-white/90 p-1 sm:block" title="Arrastrar para reordenar">
              <GripVertical className="size-3.5" />
            </span>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/70 to-transparent p-1.5 sm:p-2">
              <div className="flex gap-1">
                <IconBtn label="Mover a la izquierda" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowLeft className="size-3.5" />
                </IconBtn>
                <IconBtn label="Mover a la derecha" disabled={i === images.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowRight className="size-3.5" />
                </IconBtn>
              </div>
              <IconBtn label="Quitar imagen" onClick={() => onChange(images.filter((_, j) => j !== i))}>
                <Trash2 className="size-3.5" />
              </IconBtn>
            </div>
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.id} className={classNames("relative overflow-hidden rounded-xl border border-ink/10", r.aspect)}>
            <img src={p.preview} alt="" className="size-full object-cover opacity-50" />
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </span>
          </div>
        ))}
        {images.length + pending.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
            }}
            className={classNames(
              "flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center text-xs text-ink/60 transition-colors",
              r.aspect,
              dragOver ? "border-ink bg-ink/5" : "border-ink/15 hover:border-ink/40",
            )}
          >
            <ImagePlus className="size-6" />
            <span className="font-medium text-ink">Subir imágenes</span>
            <span className="hidden sm:inline">Arrastrá o hacé click</span><span className="sm:hidden">Tocá para elegir</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="mt-3 space-y-1">
        <RecommendedHint kind={kind} />
        <p className="text-xs text-ink/45">Máx. {maxMb} MB por imagen · hasta {max} imágenes · la primera es la principal y la segunda se muestra al pasar el mouse.</p>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full bg-white/95 sm:size-7 text-ink transition hover:bg-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}

interface SingleProps {
  kind: UploadKind;
  value: string | null;
  onChange: (url: string | null) => void;
  onUploaded?: (url: string) => void;
  maxMb: number;
  label?: string;
  dark?: boolean;
}

/** Imagen única con vista previa, reemplazo y eliminación. */
export function SingleImageUploader({ kind, value, onChange, onUploaded, maxMb, dark }: SingleProps) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const r = RECOMMENDED[kind];

  async function handle(file: File) {
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const res = await uploadImage(file, kind, maxMb);
      onUploaded?.(res.url);
      onChange(res.url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al subir la imagen", "error");
    } finally {
      URL.revokeObjectURL(local);
      setPreview(null);
    }
  }

  const shown = preview ?? (value ? mediaUrl(value) : null);
  return (
    <div>
      <div
        className={classNames(
          "relative overflow-hidden rounded-xl border border-ink/10",
          kind === "logo" ? "flex h-28 items-center justify-center p-4" : r.aspect,
          dark ? "bg-ink" : "bg-[#f1f0ec]",
          kind !== "logo" && "max-h-[340px] w-full",
        )}
      >
        {shown ? (
          <img src={shown} alt="Vista previa" className={classNames(kind === "logo" ? "max-h-full max-w-full object-contain" : "size-full object-cover", preview && "opacity-50")} />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className={classNames("flex size-full min-h-28 flex-col items-center justify-center gap-2 text-xs", dark ? "text-white/70 hover:text-white" : "text-ink/55 hover:text-ink")}>
            <ImagePlus className="size-6" />
            Subir imagen
          </button>
        )}
        {preview && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-ink" />
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3.5 sm:h-9 sm:px-3 text-[13px] font-medium hover:border-ink/40">
          <RefreshCw className="size-3.5" /> {value ? "Reemplazar" : "Subir"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-medium text-[#b4321f] sm:h-9 sm:px-3 hover:bg-[#f7e1dc]">
            <Trash2 className="size-3.5" /> Quitar
          </button>
        )}
      </div>
      <div className="mt-2">
        <RecommendedHint kind={kind} />
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(",")}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
