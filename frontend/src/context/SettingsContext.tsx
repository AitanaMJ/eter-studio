import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { StoreSettings } from "../lib/types";

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: "ÉTER Studio",
  slogan: "WEAR YOUR IDENTITY.",
  logo_url: null,
  hero_eyebrow: "",
  hero_title: "",
  hero_subtitle: "",
  hero_cta: "Explorar colección",
  hero_image_url: null,
  categories_title: "Comprá por categoría",
  new_arrivals_title: "Novedades",
  featured_title: "Destacados",
  promo_eyebrow: "",
  promo_title: "",
  promo_text: "",
  promo_cta: "",
  promo_image_url: null,
  about_title: "",
  about_text: "",
  whatsapp: "",
  instagram: "",
  email: "",
  address: "",
  shipping_info: "",
  returns_info: "",
};

interface Ctx {
  settings: StoreSettings;
  loaded: boolean;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, reload: async () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      setSettings(await api.get<StoreSettings>("/api/settings"));
    } catch {
      /* se mantienen los valores por defecto */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    document.title = `${settings.store_name} — ${settings.slogan.replace(/\.$/, "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}`;
  }, [settings.store_name, settings.slogan]);

  return <SettingsContext.Provider value={{ settings, loaded, reload }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
