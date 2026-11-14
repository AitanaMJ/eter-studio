"""Guarda la contraseña de PostgreSQL en backend/.env sin mostrarla en pantalla.

Uso (desde la carpeta backend):
    .\\.venv\\Scripts\\python scripts\\set_db_password.py

- La contraseña se pide con entrada oculta (no se ve al escribir ni queda en el historial).
- Se codifica para URL, así funcionan caracteres especiales (@ : / # % ?).
- Sólo modifica la línea DATABASE_URL de backend/.env (archivo excluido de git).
- Verifica la conexión al servidor sin imprimir la contraseña.
"""

import getpass
import re
import sys
from pathlib import Path
from urllib.parse import quote

ENV = Path(__file__).resolve().parent.parent / ".env"
HOST, PORT, USER, DB = "localhost", 5433, "postgres", "eter_studio"


def main() -> int:
    if not ENV.exists():
        print(f"No existe {ENV}. Copiá .env.example a .env primero.")
        return 1
    user = input(f"Usuario de PostgreSQL [{USER}]: ").strip() or USER
    pwd = getpass.getpass(f"Contraseña de '{user}' (no se mostrará): ")
    if not pwd:
        print("Contraseña vacía: no se modificó nada.")
        return 1

    # Verificar la conexión antes de guardar
    try:
        import psycopg

        with psycopg.connect(host=HOST, port=PORT, user=user, password=pwd, dbname="postgres", connect_timeout=5):
            pass
    except Exception as e:  # el mensaje de psycopg no incluye la contraseña
        print("No se pudo conectar con esas credenciales:", type(e).__name__)
        print(str(e).splitlines()[0] if str(e) else "")
        return 1

    url = f"postgresql+psycopg://{quote(user, safe='')}:{quote(pwd, safe='')}@{HOST}:{PORT}/{DB}"
    text = ENV.read_text(encoding="utf-8")
    if re.search(r"^DATABASE_URL=.*$", text, flags=re.M):
        text = re.sub(r"^DATABASE_URL=.*$", lambda _: f"DATABASE_URL={url}", text, flags=re.M)
    else:
        text += f"\nDATABASE_URL={url}\n"
    ENV.write_text(text, encoding="utf-8")
    print(f"Conexión OK. DATABASE_URL actualizado en {ENV} (usuario '{user}', base '{DB}', puerto {PORT}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
