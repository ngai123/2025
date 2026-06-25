"""
One-time migration: Rename column image_url -> image_path on table profile_pictures (PostgreSQL).

Usage:
    python backend/scripts/rename_image_url_to_image_path.py

Requires database settings in backend/.env and appropriate privileges.
"""
from sqlalchemy import inspect, text
from app.database import engine


def main():
    inspector = inspect(engine)
    cols = [c["name"] for c in inspector.get_columns("profile_pictures")]

    if "image_path" in cols:
        print("Column already renamed: image_path exists. No action taken.")
        return

    if "image_url" not in cols:
        print("Neither image_url nor image_path found on profile_pictures; aborting.")
        return

    with engine.begin() as conn:
        print("Renaming column image_url -> image_path on profile_pictures...")
        conn.execute(text("ALTER TABLE profile_pictures RENAME COLUMN image_url TO image_path;"))
        print("Done.")


if __name__ == "__main__":
    main()