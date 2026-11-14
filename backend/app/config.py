from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"  # development | production | test
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/eter_studio"

    # Seguridad
    secret_key: str = Field(default="change-me-in-env", min_length=16)
    access_token_minutes: int = 60 * 8
    cookie_name: str = "eter_session"
    cookie_secure: bool = False  # True en producción (HTTPS)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    login_max_attempts: int = 5
    login_window_seconds: int = 300

    # Usuarios iniciales (se crean/actualizan con el seed)
    admin_email: str = "admin@eterstudio.com"
    admin_password: str = ""
    admin_name: str = "Administrador"

    # Modo demostración
    demo_mode: bool = True
    demo_email: str = "demo@eterstudio.com"
    demo_password: str = ""
    demo_reset_interval_minutes: int = 0  # 0 = sin reinicio automático

    # Archivos
    media_dir: Path = BASE_DIR / "uploads"
    media_url: str = "/media"
    max_upload_mb: float = 8.0
    demo_max_upload_mb: float = 3.0
    frontend_dist: Path | None = None  # si se define, FastAPI sirve el build del frontend

    low_stock_threshold: int = 5

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
