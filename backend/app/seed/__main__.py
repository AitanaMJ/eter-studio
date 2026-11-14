"""CLI del seed.

    python -m app.seed                 # carga datos demo faltantes (idempotente)
    python -m app.seed --reset         # restaura TODOS los datos de catálogo a la demo (pide confirmación)
    python -m app.seed --users-only    # sólo crea usuarios definidos en .env
    python -m app.seed --set-password email@dominio.com   # cambia la contraseña (la pide por consola)
"""

import argparse
import getpass
import json
import sys

from ..database import SessionLocal
from .seed import ensure_users, reset_password, run_seed


def main() -> int:
    ap = argparse.ArgumentParser(prog="python -m app.seed")
    ap.add_argument("--reset", action="store_true", help="Borra el catálogo y restaura los datos demo")
    ap.add_argument("--yes", action="store_true", help="No pedir confirmación en --reset")
    ap.add_argument("--users-only", action="store_true")
    ap.add_argument("--set-password", metavar="EMAIL")
    args = ap.parse_args()

    with SessionLocal() as db:
        if args.set_password:
            pwd = getpass.getpass("Nueva contraseña: ")
            if len(pwd) < 10:
                print("La contraseña debe tener al menos 10 caracteres")
                return 1
            ok = reset_password(db, args.set_password, pwd)
            print("Contraseña actualizada" if ok else "Usuario no encontrado")
            return 0 if ok else 1
        if args.users_only:
            print("Usuarios creados:", ensure_users(db))
            return 0
        if args.reset and not args.yes:
            ans = input("Esto reemplaza productos, categorías y configuración por los datos demo. ¿Continuar? [s/N] ")
            if ans.strip().lower() not in ("s", "si", "sí", "y", "yes"):
                print("Cancelado")
                return 1
        result = run_seed(db, reset=args.reset)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
