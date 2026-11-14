import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { MetaContext, type Meta } from "./adminContext";
import Categories from "./Categories";
import Customize from "./Customize";
import Dashboard from "./Dashboard";
import Login from "./Login";
import ProductForm from "./ProductForm";
import Products from "./Products";

function Protected() {
  const { user, checking } = useAuth();
  const location = useLocation();
  const [meta, setMeta] = useState<Meta>({ maxMb: 8, demoMode: false, resetInterval: 0 });

  useEffect(() => {
    if (!user) return;
    api.get<{ max_mb: number }>("/api/admin/uploads/rules").then((r) => setMeta((m) => ({ ...m, maxMb: r.max_mb }))).catch(() => {});
    api
      .get<{ demo_mode: boolean; reset_interval_minutes: number }>("/api/admin/demo")
      .then((r) => setMeta((m) => ({ ...m, demoMode: r.demo_mode, resetInterval: r.reset_interval_minutes })))
      .catch(() => {});
  }, [user]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="size-8 animate-spin rounded-full border-2 border-ink/15 border-t-ink" aria-label="Cargando" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  return (
    <MetaContext.Provider value={meta}>
      <AdminLayout>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Products />} />
          <Route path="productos/nuevo" element={<ProductForm />} />
          <Route path="productos/:id" element={<ProductForm />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="personalizacion" element={<Customize />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminLayout>
    </MetaContext.Provider>
  );
}

export default function AdminApp() {
  useEffect(() => {
    document.title = "Panel — ÉTER Studio";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="*" element={<Protected />} />
      </Routes>
    </AuthProvider>
  );
}
