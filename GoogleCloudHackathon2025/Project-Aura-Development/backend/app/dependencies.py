# app/dependencies.py
from fastapi import Header, HTTPException, status
from typing import Optional

async def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated: X-User-ID header missing"
        )
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-User-ID header format"
        )