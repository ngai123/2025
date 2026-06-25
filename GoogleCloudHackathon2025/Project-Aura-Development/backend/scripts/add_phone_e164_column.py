import os
import sys
from sqlalchemy import text

# Ensure parent directory (backend root) is on sys.path so `app` can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import engine


def main():
    statements = [
        # 1) Add the new column if it doesn't exist
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_e164 VARCHAR(20)",

        # 2) Backfill from existing country_code + phone_number when both are present
        """
        UPDATE users
        SET phone_e164 = country_code || phone_number
        WHERE phone_e164 IS NULL AND country_code IS NOT NULL AND phone_number IS NOT NULL
        """,

        # 3) Optionally add a check constraint to enforce E.164 format
        #    If the constraint already exists, drop then re-add to ensure correctness
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS phone_e164_format",
        "ALTER TABLE users ADD CONSTRAINT phone_e164_format CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\\+[1-9][0-9]{1,14}$')",
    ]

    with engine.begin() as conn:
        for s in statements:
            conn.execute(text(s))

    # Verify the column exists
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='phone_e164'"
        ))
        found = result.fetchone() is not None
    print(f"phone_e164 column present: {found}")


if __name__ == "__main__":
    main()