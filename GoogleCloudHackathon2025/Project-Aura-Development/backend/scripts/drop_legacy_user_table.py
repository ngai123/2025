import os
import sys
from sqlalchemy import text

# Ensure backend root is importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import engine


def main():
    with engine.connect() as conn:
        # Check if table exists
        exists = conn.execute(text(
            """
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='user'
            );
            """
        )).scalar()

        if not exists:
            print("Table public.user does not exist; nothing to drop.")
            return

        # Check row count
        rowcount = conn.execute(text("SELECT COUNT(*) FROM public.user")).scalar() or 0
        print(f"public.user row count: {rowcount}")

        # Drop the table with CASCADE to remove legacy dependencies
        conn.execute(text("DROP TABLE public.user CASCADE"))
        conn.commit()
        print("Dropped table public.user")


if __name__ == "__main__":
    main()