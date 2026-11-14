import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import SessionLocal
from .media import cleanup_orphans, media_root
from .routers import admin_categories, admin_misc, admin_products, auth, public

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("eter")
settings = get_settings()


async def _demo_reset_loop(minutes: int) -> None:
    from .seed.seed import run_seed

    while True:
        await asyncio.sleep(minutes * 60)
        try:
            with SessionLocal() as db:
                run_seed(db, reset=True)
            admin_misc.mark_reset(datetime.now().astimezone())
            log.info("Datos demo restaurados automáticamente")
        except Exception:  # pragma: no cover - sólo log
            log.exception("Fallo el reinicio automático de la demo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.is_production and settings.secret_key == "change-me-in-env":
        raise RuntimeError("Definí SECRET_KEY en el entorno antes de iniciar en producción")
    media_root()
    if settings.environment != "test":
        with suppress(Exception), SessionLocal() as db:
            cleanup_orphans(db)
    task = None
    if settings.demo_mode and settings.demo_reset_interval_minutes > 0:
        task = asyncio.create_task(_demo_reset_loop(settings.demo_reset_interval_minutes))
    yield
    if task:
        task.cancel()


app = FastAPI(
    title="ÉTER Studio API",
    description="API del catálogo autoadministrable ÉTER Studio — GAP Programming.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-Eter-Client"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    if request.url.path.startswith("/api/admin") or request.url.path.startswith("/api/auth"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = []
    for e in exc.errors():
        loc = ".".join(str(x) for x in e.get("loc", []) if x not in ("body", "query"))
        msg = str(e.get("msg", "")).removeprefix("Value error, ")
        errors.append({"field": loc, "message": msg})
    first = errors[0]["message"] if errors else "Datos inválidos"
    return JSONResponse(status_code=422, content={"detail": first, "errors": errors})


app.include_router(auth.router)
app.include_router(public.router)
app.include_router(admin_products.router)
app.include_router(admin_categories.router)
app.include_router(admin_misc.router)


@app.get("/api/health", tags=["Sistema"])
def health():
    return {"status": "ok"}


app.mount(settings.media_url, StaticFiles(directory=media_root()), name="media")

# Servir el build del frontend desde el mismo proceso (opcional, útil para demo en un solo servidor)
if settings.frontend_dist and Path(settings.frontend_dist).is_dir():
    dist = Path(settings.frontend_dist).resolve()
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = (dist / full_path).resolve()
        if full_path and dist in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(dist / "index.html")
