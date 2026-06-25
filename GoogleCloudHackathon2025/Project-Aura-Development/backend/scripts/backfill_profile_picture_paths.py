"""
Backfill script: Convert canonical URLs in profile_pictures.image_path to GCS object paths.

- Detects entries where image_path starts with "http" or "gs://".
- Parses and replaces with the blob/object path (e.g., "profile-pictures/<user_id>/<filename>").

Usage:
    python backend/scripts/backfill_profile_picture_paths.py

Requires database settings in backend/.env.
"""
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import SessionLocal
from app.models import ProfilePicture


def canonical_to_path(value: str) -> str:
    # Supports https://storage.googleapis.com/<bucket>/<path> and gs://<bucket>/<path>
    if value.startswith("gs://"):
        # gs://bucket/path/to/blob
        without_scheme = value[len("gs://") :]
        parts = without_scheme.split("/", 1)
        if len(parts) == 2:
            return parts[1]
        else:
            raise ValueError("Invalid gs:// URL: missing path")

    parsed = urlparse(value)
    # Expect path like /<bucket>/<blob_path>
    parts = parsed.path.lstrip("/").split("/", 1)
    if len(parts) == 2:
        return parts[1]
    raise ValueError("Invalid canonical URL: missing bucket/path")


def main():
    db: Session = SessionLocal()
    try:
        pictures = db.query(ProfilePicture).all()
        updates = 0
        for pic in pictures:
            val = pic.image_path
            if not isinstance(val, str):
                continue
            if val.startswith("http") or val.startswith("gs://"):
                try:
                    new_path = canonical_to_path(val)
                except Exception as e:
                    print(f"Skipping id={pic.id}: parse error: {e}")
                    continue
                # Only update if changed
                if new_path != val:
                    pic.image_path = new_path
                    updates += 1
        if updates:
            db.commit()
        print(f"Backfill complete. Updated {updates} rows.")
    finally:
        db.close()


if __name__ == "__main__":
    main()