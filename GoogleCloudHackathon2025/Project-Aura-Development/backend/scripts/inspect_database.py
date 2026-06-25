import os
import sys
from sqlalchemy import text

# Ensure backend root is importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import engine


def list_tables():
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            ORDER BY table_name;
        """))
        tables = [row[0] for row in res.fetchall()]
    print("Tables in public schema:")
    for t in tables:
        print(f" - {t}")
    return tables


def describe_table(table_name: str):
    print(f"\n=== {table_name} ===")
    with engine.connect() as conn:
        cols = conn.execute(text("""
            SELECT ordinal_position, column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name=:t
            ORDER BY ordinal_position;
        """), {"t": table_name}).fetchall()
        print("Columns:")
        for pos, name, dtype, nullable in cols:
            print(f" - {pos}: {name} {dtype} NULLABLE={nullable}")

        constraints = conn.execute(text("""
            SELECT conname, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = ('public.' || :t)::regclass;
        """), {"t": table_name}).fetchall()
        if constraints:
            print("Constraints:")
            for cname, cdef in constraints:
                print(f" - {cname}: {cdef}")
        else:
            print("Constraints: (none)")

        try:
            count = conn.execute(text(f"SELECT COUNT(*) FROM public.{table_name}"))
            rowcount = count.scalar() or 0
            print(f"Row count: {rowcount}")
        except Exception as e:
            print(f"Row count: error: {e}")


def main():
    tables = list_tables()
    for t in ("user", "users"):
        if t in tables:
            describe_table(t)
        else:
            print(f"\n=== {t} ===\n(Table not found)")


if __name__ == "__main__":
    main()