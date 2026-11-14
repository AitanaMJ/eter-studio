from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user, require_client_header
from ..models import AdminUser
from ..schemas import LoginIn, UserOut
from ..security import create_access_token, hash_password, login_limiter, needs_rehash, verify_password

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=UserOut, summary="Iniciar sesión (cookie httpOnly)")
def login(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    require_client_header(request)
    s = get_settings()
    key = f"{_client_ip(request)}|{data.email.lower()}"
    if login_limiter.is_blocked(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados intentos. Probá nuevamente en unos minutos.")

    user = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == data.email.lower()))
    ok = verify_password(data.password, user.password_hash if user else None)
    if not user or not ok or not user.is_active or (user.role == "demo" and not s.demo_mode):
        login_limiter.hit(key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")

    login_limiter.reset(key)
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
    user.last_login_at = datetime.now(UTC)
    db.commit()

    response.set_cookie(
        s.cookie_name,
        create_access_token(user.id, user.role),
        max_age=s.access_token_minutes * 60,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        path="/",
    )
    return user


@router.post("/logout", status_code=204, summary="Cerrar sesión")
def logout(request: Request) -> Response:
    require_client_header(request)
    s = get_settings()
    response = Response(status_code=204)
    response.delete_cookie(s.cookie_name, path="/", httponly=True, secure=s.cookie_secure, samesite="lax")
    return response


@router.get("/me", response_model=UserOut, summary="Usuario autenticado")
def me(user: AdminUser = Depends(get_current_user)):
    return user


@router.get("/session", summary="Estado de la sesión (no falla si no hay sesión)")
def session(request: Request, db: Session = Depends(get_db)):
    try:
        user = get_current_user(request, db)
    except HTTPException:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": UserOut.model_validate(user)}
