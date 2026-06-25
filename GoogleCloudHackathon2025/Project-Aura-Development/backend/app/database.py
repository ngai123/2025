from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os
import time
from dotenv import load_dotenv
from urllib.parse import quote_plus
from fastapi import HTTPException, status

load_dotenv() # This loads environment variables from .env

class Settings(BaseSettings):
    database_host: str
    database_port: int = 5432
    database_name: str
    database_user: str
    database_password: str
    secret_key: str = "temporary-dev-key-change-later"  # Default value
    environment: str = "development"
    
    # GCS Configuration
    gcs_bucket_name: str = "project-aura-images"
    gcs_upload_prefix: str = "profile-pictures"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

@lru_cache()
def get_settings():
    settings_instance = Settings()
    # Strip whitespace from all string fields (fixes Secret Manager newline issues)
    settings_instance.database_host = settings_instance.database_host.strip()
    settings_instance.database_name = settings_instance.database_name.strip()
    settings_instance.database_user = settings_instance.database_user.strip()
    settings_instance.database_password = settings_instance.database_password.strip()
    settings_instance.secret_key = settings_instance.secret_key.strip()
    settings_instance.gcs_bucket_name = settings_instance.gcs_bucket_name.strip()
    return settings_instance

settings = get_settings()

# URL-encode the password to handle special characters
encoded_password = quote_plus(settings.database_password)

# Check if running in Cloud Run with Cloud SQL Unix socket
cloud_sql_connection = os.getenv("CLOUD_SQL_CONNECTION_NAME")
if cloud_sql_connection and os.path.exists(f"/cloudsql/{cloud_sql_connection}"):
    # Use Unix socket connection for Cloud Run
    DATABASE_URL = f"postgresql+psycopg2://{settings.database_user}:{encoded_password}@/{settings.database_name}?host=/cloudsql/{cloud_sql_connection}"
    print(f"[Database] Using Cloud SQL Unix socket: /cloudsql/{cloud_sql_connection}")
    print(f"[Database] Connecting to database: {settings.database_name} as {settings.database_user}")
else:
    # Use TCP connection for local development
    DATABASE_URL = f"postgresql+psycopg2://{settings.database_user}:{encoded_password}@{settings.database_host}:{settings.database_port}/{settings.database_name}"
    print(f"[Database] Using TCP connection: {settings.database_user}@{settings.database_host}:{settings.database_port}/{settings.database_name}")

print(f"[Database] Environment: {settings.environment}")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
    connect_args={"connect_timeout": 10}  # Add timeout for faster failure
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def _get_session_with_retry(max_attempts: int = 3, delay_sec: float = 0.2):
    attempts = 0
    last_err = None
    while attempts < max_attempts:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            return db
        except Exception as e:
            last_err = e
            print(f"[Database] Session init error (attempt {attempts + 1}/{max_attempts}): {e}")
            try:
                db.close()
            except Exception:
                pass
            time.sleep(delay_sec)
            attempts += 1
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not connect to the database."
    )

def get_db():
    db = None
    try:
        db = _get_session_with_retry()
        yield db
    except HTTPException:
        # Bubble up HTTPException as-is
        raise
    except Exception as e:
        print(f"[Database] Error during DB dependency: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database operation failed."
        )
    finally:
        if db:
            try:
                db.close()
            except Exception:
                pass