import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import StoreLayout from "./components/store/StoreLayout";
import About from "./pages/store/About";
import Collections from "./pages/store/Collections";
import Contact from "./pages/store/Contact";
import Home from "./pages/store/Home";
import NotFound from "./pages/store/NotFound";
import Product from "./pages/store/Product";
import Shop from "./pages/store/Shop";

// El panel se carga por separado: no suma peso a la tienda pública
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
      <div className="size-8 animate-spin rounded-full border-2 border-ink/15 border-t-ink" aria-label="Cargando" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="tienda" element={<Shop />} />
        <Route path="colecciones" element={<Collections />} />
        <Route path="producto/:slug" element={<Product />} />
        <Route path="nosotros" element={<About />} />
        <Route path="contacto" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<Loader />}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  );
}
