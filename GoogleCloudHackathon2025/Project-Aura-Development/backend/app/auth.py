"""
Authentication Module
====================
Handles JWT token generation, validation, and user authentication.
"""

from datetime import datetime, timedelta
from typing import Optional
import logging
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db, settings
from app.models import User

# Setup logging
logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing context - must match crud/user.py for consistency
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], default="bcrypt_sha256", deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing claims to encode in the token
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer credentials containing the JWT token
        db: Database session

    Returns:
        User object if authentication is successful

    Raises:
        HTTPException: If authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = decode_access_token(token)

        if payload is None:
            raise credentials_exception

        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

        # Convert string back to integer
        user_id: int = int(user_id_str)

    except JWTError:
        raise credentials_exception
    except (ValueError, TypeError):
        # Handle invalid user_id conversion
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> int:
    """
    Dependency to get the current authenticated user's ID from JWT token.

    This is a lighter-weight version that only returns the user ID
    without loading the full user object.

    Args:
        credentials: HTTP Bearer credentials containing the JWT token
        db: Database session

    Returns:
        User ID if authentication is successful

    Raises:
        HTTPException: If authentication fails
    """
    user = await get_current_user(credentials, db)
    return user.id


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user with email and password.

    Args:
        db: Database session
        email: User's email
        password: User's plain text password

    Returns:
        User object if authentication is successful, None otherwise
    """
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def create_user_token(user_id: int) -> str:
    """
    Create an access token for a user.

    Args:
        user_id: User's ID

    Returns:
        JWT access token string
    """
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_id)},  # Convert to string - JWT spec requires sub to be a string
        expires_delta=access_token_expires
    )
    return access_token
