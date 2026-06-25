import os
from uuid import uuid4
from datetime import datetime
from google.cloud import storage
from app.database import get_settings
from urllib.parse import urlparse
from datetime import timedelta
from fastapi import UploadFile ,HTTPException, status

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Storage client (initialized once)
storage_client = storage.Client()

def get_bucket():
    """Get GCS bucket instance (lazy initialization)"""
    bucket_name = os.getenv("GCS_BUCKET_NAME", "project-aura-images")
    # Strip any whitespace that might have been added
    bucket_name = bucket_name.strip()
    print(f"[GCS] Using bucket: {bucket_name}")
    return storage_client.bucket(bucket_name)



async def upload_file_to_gcs(file: UploadFile, destination_blob_name: str) -> str:
    """Uploads a file to Google Cloud Storage."""
    try:
        bucket = get_bucket()
        blob = bucket.blob(destination_blob_name)
        contents = await file.read()
        blob.upload_from_string(contents, content_type=file.content_type)
        # blob.make_public() # <--- REMOVE OR COMMENT OUT THIS LINE
        return blob.public_url
    except Exception as e:
        # log the full exception for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error uploading file to GCS: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload to GCS: {e}")

async def delete_file_from_gcs(blob_name: str):
    """Deletes a file from Google Cloud Storage."""
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_name)
        if blob.exists():
            blob.delete()
            print(f"[GCS] Successfully deleted blob: {blob_name}")
        else:
            # File doesn't exist - may have been deleted already
            print(f"[GCS] Blob not found (already deleted?): {blob_name}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error deleting file from GCS: {e}", exc_info=True)
        print(f"[GCS] Error deleting blob {blob_name}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete from GCS: {e}")
    

async def upload_profile_image_to_gcs(upload_file, user_id: int) -> str:
    """
    Uploads an image (FastAPI UploadFile) to GCS using:
      {GCS_UPLOAD_PREFIX}/{user_id}/{timestamp-uuid}.{ext}
    Returns the object path (blob path) within the bucket.
    """
    settings = get_settings()
    bucket_name = settings.gcs_bucket_name
    prefix = (settings.gcs_upload_prefix or "profile-pictures").strip("/")

    if not bucket_name:
        raise RuntimeError("GCS bucket name is not configured")

    client = storage.Client()
    bucket = client.bucket(bucket_name)

    _, ext = os.path.splitext(upload_file.filename or "")
    ext = (ext or "").lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        ext = ""  # optional: enforce allowed extensions

    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid4().hex}{ext}"
    blob_path = f"{prefix}/{user_id}/{filename}"

    blob = bucket.blob(blob_path)
    data = upload_file.file.read()
    content_type = upload_file.content_type or "application/octet-stream"

    blob.upload_from_string(data, content_type=content_type)
    # Do not attempt ACL operations under uniform bucket-level access
    return blob_path


async def upload_chat_attachment_to_gcs(upload_file, user_id: int, chat_session_id: int) -> str:
    """
    Uploads a chat attachment (FastAPI UploadFile) to GCS using:
      chat_attachments/{chat_session_id}/{user_id}/{timestamp-uuid}.{ext}
    Returns the object path (blob path) within the bucket.
    """
    settings = get_settings()
    bucket_name = settings.gcs_bucket_name

    if not bucket_name:
        raise RuntimeError("GCS bucket name is not configured")

    client = storage.Client()
    bucket = client.bucket(bucket_name)

    _, ext = os.path.splitext(upload_file.filename or "")
    ext = (ext or "").lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        ext = ""  # optional: enforce allowed extensions

    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid4().hex}{ext}"
    # Store in chat_attachments/{chat_session_id}/{user_id}/{filename}
    blob_path = f"chat_attachments/{chat_session_id}/{user_id}/{filename}"

    blob = bucket.blob(blob_path)
    data = upload_file.file.read()
    content_type = upload_file.content_type or "application/octet-stream"

    blob.upload_from_string(data, content_type=content_type)
    # Do not attempt ACL operations under uniform bucket-level access
    return blob_path


async def generate_signed_url_for_path(blob_path: str, expires_in_seconds: int = 3600) -> str:
    """Generate a V4 signed URL for a GCS object path within the configured bucket."""
    settings = get_settings()
    bucket_name = settings.gcs_bucket_name
    if not bucket_name:
        raise RuntimeError("GCS bucket name is not configured")

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    # Check if running in Cloud Run (metadata service available) or local (with service account key)
    environment = os.getenv("ENVIRONMENT", "local")

    try:
        if environment == "production" or environment == "staging":
            # Cloud Run: Use IAM-based signing (no private key needed)
            from google.auth import compute_engine
            from google.auth.transport import requests as google_requests

            signing_credentials = compute_engine.IDTokenCredentials(
                google_requests.Request(),
                "",
                service_account_email=os.getenv("SERVICE_ACCOUNT_EMAIL", "847374621719-compute@developer.gserviceaccount.com")
            )

            return blob.generate_signed_url(
                expiration=timedelta(seconds=expires_in_seconds),
                method="GET",
                version="v4",
                credentials=signing_credentials,
                service_account_email=os.getenv("SERVICE_ACCOUNT_EMAIL", "847374621719-compute@developer.gserviceaccount.com")
            )
        else:
            # Local development: Use default credentials (service account key)
            return blob.generate_signed_url(
                expiration=timedelta(seconds=expires_in_seconds),
                method="GET",
                version="v4"
            )
    except Exception as e:
        # Fallback: try default signing, if that fails return public URL
        try:
            return blob.generate_signed_url(
                expiration=timedelta(seconds=expires_in_seconds),
                method="GET",
                version="v4"
            )
        except Exception as fallback_error:
            print(f"Warning: Could not generate signed URL, using public URL: {fallback_error}")
            return blob.public_url


async def generate_signed_url_from_canonical_url(canonical_url: str, expires_in_seconds: int = 3600) -> str:
    """Generate a V4 signed URL from a canonical storage URL like
    https://storage.googleapis.com/<bucket>/<path/to/object>.
    """
    parsed = urlparse(canonical_url)
    parts = parsed.path.lstrip("/").split("/", 1)
    if len(parts) < 2:
        raise ValueError("Invalid canonical URL for GCS object")

    bucket_from_url = parts[0]
    blob_path = parts[1]

    client = storage.Client()
    bucket = client.bucket(bucket_from_url)
    blob = bucket.blob(blob_path)

    # Check if running in Cloud Run or local
    environment = os.getenv("ENVIRONMENT", "local")

    try:
        if environment == "production" or environment == "staging":
            # Cloud Run: Use IAM-based signing (no private key needed)
            from google.auth import compute_engine
            from google.auth.transport import requests as google_requests

            signing_credentials = compute_engine.IDTokenCredentials(
                google_requests.Request(),
                "",
                service_account_email=os.getenv("SERVICE_ACCOUNT_EMAIL", "847374621719-compute@developer.gserviceaccount.com")
            )

            return blob.generate_signed_url(
                expiration=timedelta(seconds=expires_in_seconds),
                method="GET",
                version="v4",
                credentials=signing_credentials,
                service_account_email=os.getenv("SERVICE_ACCOUNT_EMAIL", "847374621719-compute@developer.gserviceaccount.com")
            )
        else:
            # Local development: Use default credentials (service account key)
            return blob.generate_signed_url(
                expiration=timedelta(seconds=expires_in_seconds),
                method="GET",
                version="v4"
            )
    except Exception as e:
        # Fallback: try default signing, if that fails return public URL
        try:
            return blob.generate_signed_url(
                expiration=timedelta(seconds=expires_in_seconds),
                method="GET",
                version="v4"
            )
        except Exception as fallback_error:
            print(f"Warning: Could not generate signed URL, using public URL: {fallback_error}")
            return blob.public_url
    
    
    





