from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import AdminUser
from .security import decode_access_token

CSRF_HEADER = "x-eter-client"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def require_client_header(request: Request) -> None:
    """Protección CSRF: las peticiones que modifican datos deben incluir un header propio.

    Un formulario de otro sitio no puede enviar headers personalizados y CORS bloquea
    las peticiones cross-origin con headers no permitidos.
    """
    if request.method not in SAFE_METHODS and request.headers.get(CSRF_HEADER) != "web":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Petición rechazada (falta header de cliente)")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    token = request.cookies.get(get_settings().cookie_name)
    payload = decode_access_token(token) if token else None
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión no válida o expirada")
    user = db.get(AdminUser, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión no válida o expirada")
    if user.role == "demo" and not get_settings().demo_mode:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "La cuenta demo está deshabilitada")
    return user


def staff_user(
    request: Request, user: AdminUser = Depends(get_current_user)
) -> AdminUser:
    """Usuario autenticado (admin o demo) + verificación CSRF para escrituras."""
    require_client_header(request)
    return user


def admin_only(user: AdminUser = Depends(staff_user)) -> AdminUser:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acción no disponible en la cuenta demo")
    return user
