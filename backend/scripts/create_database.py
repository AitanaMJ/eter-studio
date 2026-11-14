"""Crea la base de datos indicada en DATABASE_URL si no existe. No toca ninguna otra base.

Uso: .\\.venv\\Scripts\\python scripts\\create_database.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg  # noqa: E402
from psycopg import sql  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app.config import get_settings  # noqa: E402


def main() -> int:
    url = make_url(get_settings().database_url)
    name = url.database
    if not name:
        print("DATABASE_URL no indica una base de datos")
        return 1
    params = dict(host=url.host, port=url.port or 5432, user=url.username, password=url.password, connect_timeout=5)
    with psycopg.connect(dbname="postgres", autocommit=True, **params) as conn:
        exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,)).fetchone()
        if exists:
            print(f"La base '{name}' ya existe: no se hizo ningún cambio.")
        else:
            conn.execute(sql.SQL("CREATE DATABASE {} ENCODING 'UTF8' TEMPLATE template0").format(sql.Identifier(name)))
            print(f"Base '{name}' creada en {url.host}:{url.port}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
