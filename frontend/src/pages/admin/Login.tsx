import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Field, Input } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { mediaUrl } from "../../lib/api";

export default function Login() {
  const { user, login, checking } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || "/admin";

  if (!checking && user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Completá correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[#f7f7f5] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        {settings.hero_image_url && <img src={mediaUrl(settings.hero_image_url)} alt="" className="absolute inset-0 size-full object-cover opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-ivory">
          <p className="font-display text-5xl font-semibold leading-[0.95] tracking-tight">{settings.store_name}</p>
          <p className="eyebrow mt-4 text-ivory/70">{settings.slogan}</p>
          <p className="mt-10 max-w-sm text-sm text-ivory/60">Panel de administración del catálogo · desarrollado por GAP Programming</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <Link to="/" className="mb-10 inline-flex items-center gap-1.5 text-sm text-ink/55 hover:text-ink">
            <ArrowLeft className="size-4" /> Volver a la tienda
          </Link>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-ink text-white">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Ingresar al panel</h1>
          <p className="mt-2 text-sm text-ink/55">Administrá productos, categorías y la apariencia de tu tienda.</p>

          <div className="mt-8 space-y-4">
            <Field label="Correo electrónico" htmlFor="email">
              <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Contraseña" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink/50 hover:text-ink"
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          </div>
          {error && (
            <p className="mt-4 rounded-xl bg-[#f7e1dc] px-3.5 py-2.5 text-sm text-[#9a2a1a]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="mt-6 w-full">
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
}
