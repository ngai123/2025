import os
import sys
from sqlalchemy import text

# Ensure backend root is importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import engine, Base

# IMPORTANT: import models so SQLAlchemy knows all tables
from app import models  # noqa: F401


def main(drop_first: bool = False):
    # Try to enable CITEXT if available (safe no-op if not supported)
    with engine.begin() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        except Exception:
            # Managed DBs may restrict extension creation; continue gracefully
            pass

    if drop_first:
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)

    print("Creating all tables from models...")
    Base.metadata.create_all(bind=engine)
    print("Done. Database schema is up-to-date with models.")


if __name__ == "__main__":
    # Optional flag: --drop-first to drop tables before re-creating
    drop_flag = any(arg in ("--drop-first", "--drop", "-D") for arg in sys.argv[1:])
    main(drop_first=drop_flag)