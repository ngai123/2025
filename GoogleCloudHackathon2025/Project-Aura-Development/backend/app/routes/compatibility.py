"""
File: compatibility.py
Description: API routes for profile compatibility analysis.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.compatibility import CompatibilityResponse
from app.crud import compatibility as crud_compatibility

router = APIRouter(prefix="/compatibility", tags=["Compatibility"])


@router.get(
    "/compare/{current_user_id}/{target_user_id}",
    response_model=CompatibilityResponse
)
def get_compatibility_summary(
    current_user_id: int,
    target_user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get AI-powered compatibility summary between two users.

    This endpoint analyzes both users' profiles including:
    - Shared interests
    - Relationship goals
    - Personality traits (if available)

    And generates a friendly, personalized compatibility insight.

    Args:
        current_user_id: ID of the user viewing the profile
        target_user_id: ID of the profile being viewed

    Returns:
        CompatibilityResponse with summary, shared interests, and highlights
    """
    if current_user_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot compare a user with themselves"
        )

    try:
        result = crud_compatibility.get_compatibility_analysis(
            db, current_user_id, target_user_id
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        print(f"[Compatibility Route] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate compatibility analysis"
        )
