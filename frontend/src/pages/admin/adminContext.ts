import { createContext, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError } from "../../lib/api";

export interface Meta {
  maxMb: number;
  demoMode: boolean;
  resetInterval: number;
}
export const MetaContext = createContext<Meta>({ maxMb: 8, demoMode: false, resetInterval: 0 });
export const useAdminMeta = () => useContext(MetaContext);

/** Maneja errores de la API en el panel: sesión vencida → login; resto → aviso. */
export function useAdminError() {
  const toast = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();
  return useCallback(
    (e: unknown, fallback = "Ocurrió un error inesperado") => {
      if (e instanceof ApiError && e.status === 401) {
        void logout();
        toast("Tu sesión expiró. Ingresá nuevamente.", "info");
        navigate("/admin/login", { replace: true });
        return;
      }
      toast(e instanceof Error ? e.message : fallback, "error");
    },
    [toast, navigate, logout],
  );
}
