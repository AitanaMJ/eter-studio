import { AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, FolderTree, Image, PackageX, Palette, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader, Pill } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { useAdminError } from "./adminContext";

interface Stats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  out_of_stock: number;
  low_stock: number;
  total_categories: number;
  featured_products: number;
  low_stock_threshold: number;
  low_stock_items: { id: number; name: string; sku: string; stock: number }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const onError = useAdminError();
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>("/api/admin/dashboard").then(setS).catch(onError);
  }, [onError]);

  const cards = s
    ? [
        { label: "Productos", value: s.total_products, icon: Boxes, hint: `${s.inactive_products} inactivos`, to: "/admin/productos" },
        { label: "Activos", value: s.active_products, icon: CheckCircle2, hint: "Visibles en la tienda", to: "/admin/productos?status=active" },
        { label: "Agotados", value: s.out_of_stock, icon: PackageX, hint: "Sin stock en ninguna variante", to: "/admin/productos?stock=out", tone: s.out_of_stock ? "danger" : undefined },
        { label: "Stock bajo", value: s.low_stock, icon: AlertTriangle, hint: `≤ ${s.low_stock_threshold} unidades`, to: "/admin/productos?stock=low", tone: s.low_stock ? "warning" : undefined },
        { label: "Categorías", value: s.total_categories, icon: FolderTree, hint: "Organizan el catálogo", to: "/admin/categorias" },
        { label: "Destacados", value: s.featured_products, icon: Star, hint: "En la portada", to: "/admin/productos?featured=1" },
      ]
    : [];

  return (
    <>
      <PageHeader
        title={`Hola${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Resumen del catálogo y accesos rápidos."
        actions={
          <Link to="/admin/productos/nuevo" className="inline-flex h-11 w-full items-center justify-center gap-2 sm:w-auto rounded-xl bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft">
            <Plus className="size-4" /> Nuevo producto
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {s
          ? cards.map(({ label, value, icon: Icon, hint, to, tone }) => (
              <Link
                key={label}
                to={to}
                className="group flex min-w-0 flex-col rounded-2xl border border-ink/[0.08] bg-white p-3.5 transition-shadow hover:shadow-[0_12px_30px_-18px_rgba(17,17,17,.35)] xs:p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      "flex size-9 shrink-0 items-center justify-center rounded-xl " +
                      (tone === "danger" ? "bg-[#f7e1dc] text-[#9a2a1a]" : tone === "warning" ? "bg-[#f8ecd6] text-[#8a5a12]" : "bg-[#f1f0ec] text-ink")
                    }
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-ink/30 transition group-hover:text-ink" />
                </div>
                <p className="mt-3 font-display text-[28px] font-semibold leading-tight tabular-nums sm:mt-4 sm:text-4xl">{value}</p>
                <p className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">{label}</p>
                <p className="text-xs leading-snug text-ink/50 [overflow-wrap:anywhere]">{hint}</p>
              </Link>
            ))
          : Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[150px] rounded-2xl" />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5 [&>*]:min-w-0">
        <Card title="Accesos rápidos" className="lg:col-span-2">
          <div className="grid gap-2">
            {[
              { to: "/admin/productos/nuevo", label: "Cargar un producto nuevo", icon: Plus },
              { to: "/admin/personalizacion", label: "Editar portada y textos", icon: Palette },
              { to: "/admin/personalizacion#destacados", label: "Elegir productos destacados", icon: Star },
              { to: "/admin/categorias", label: "Gestionar categorías", icon: FolderTree },
              { to: "/admin/personalizacion#imagenes", label: "Cambiar banner principal", icon: Image },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex min-h-12 items-center gap-3 rounded-xl border border-ink/[0.08] px-3.5 py-3 text-sm font-medium hover:border-ink/30">
                <Icon className="size-4 shrink-0 text-olive" /> <span className="min-w-0">{label}</span>
                <ArrowUpRight className="ml-auto size-4 shrink-0 text-ink/30" />
              </Link>
            ))}
          </div>
        </Card>

        <Card
          title="Reposición sugerida"
          description="Productos con pocas unidades disponibles."
          className="lg:col-span-3"
          actions={
            <Link to="/admin/productos?stock=low" className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline sm:min-h-0">
              Ver todos
            </Link>
          }
        >
          {s && s.low_stock_items.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink/55">No hay productos con stock bajo. 🎉</p>
          ) : (
            <ul className="divide-y divide-ink/[0.06]">
              {(s?.low_stock_items ?? []).map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/productos/${p.id}`} className="flex min-h-12 items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-ink/50">{p.sku}</p>
                    </div>
                    <Pill tone="warning">{p.stock} u.</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
