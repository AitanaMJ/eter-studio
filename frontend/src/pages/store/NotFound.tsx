import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[80vh] flex-col items-start justify-center pt-24">
      <p className="eyebrow text-olive">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(4rem,18vw,14rem)] font-bold leading-[0.8] tracking-[-0.06em]">Perdido.</h1>
      <p className="mt-6 max-w-md text-lg text-ink/60">La página o el producto que buscás no existe o ya no está disponible.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/tienda" className="btn-dark">Ir a la tienda</Link>
        <Link to="/" className="btn-outline"><ArrowLeft className="size-4" /> Volver al inicio</Link>
      </div>
    </div>
  );
}
