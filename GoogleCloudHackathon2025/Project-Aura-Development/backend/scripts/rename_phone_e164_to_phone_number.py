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
    statements = [
        # 1) Drop legacy columns if present
        "ALTER TABLE users DROP COLUMN IF EXISTS country_code",
        "ALTER TABLE users DROP COLUMN IF EXISTS phone_number",

        # 2) Drop old constraints related to phone fields
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS country_code_format",
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS phone_e164_format",

        # 3) Rename phone_e164 to phone_number (this is the new E.164 field)
        "ALTER TABLE users RENAME COLUMN phone_e164 TO phone_number",

        # 4) Add new E.164 check constraint on phone_number
        "ALTER TABLE users ADD CONSTRAINT phone_number_format CHECK (phone_number IS NULL OR phone_number ~ '^\\+[1-9][0-9]{1,14}$')",
    ]

    with engine.begin() as conn:
        for s in statements:
            conn.execute(text(s))

    # Verify the column exists under the new name
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='phone_number'"
        ))
        found = result.fetchone() is not None
    print(f"phone_number column present (renamed from phone_e164): {found}")


if __name__ == "__main__":
    main()