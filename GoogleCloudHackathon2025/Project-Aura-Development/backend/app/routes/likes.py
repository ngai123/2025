from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timezone

from app.database import get_db
from app.crud.user import get_user_by_id
from app.crud.like import create_like as crud_create_like, check_if_like_exists, get_users_who_liked_me, get_users_i_liked
from app.schemas.like import LikeCreate, LikeResponse, ProfileDisplay
from app.models import User, PremiumUser, ProfilePicture # Ensure these are imported for helper functions
from app.utils.notification_service import NotificationService

router = APIRouter(
    prefix="/likes",
    tags=["likes"]
)

def _calculate_age(dob: Optional[date]) -> Optional[int]:
    if dob:
        today = datetime.now().date()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return None

# <--- MUST-HAVE FIX: Modified _get_profile_picture_url logic
def _get_profile_picture_url(profile_pictures: List[ProfilePicture]) -> Optional[str]:
    if not profile_pictures:
        return None # No pictures available

    def get_url(pic):
        """Helper to return correct URL format based on image source"""
        # Check if it's an external URL (mock data like pravatar)
        if pic.image_url.startswith('http://') or pic.image_url.startswith('https://'):
            if 'storage.googleapis.com' in pic.image_url:
                # GCS URLs need proxy to avoid 403
                return f"/profile/me/pictures/{pic.id}/image"
            else:
                # External mock URLs can be used directly
                return pic.image_url
        else:
            # Relative or GCS paths use proxy
            return f"/profile/me/pictures/{pic.id}/image"

    # 1. Prioritize 'profile' category
    for pic in profile_pictures:
        if pic.category == 'profile':
            return get_url(pic)

    # 2. Fallback to 'Fun' or 'Casual' category
    for pic in profile_pictures:
        if pic.category in ['Fun', 'Casual']:
            return get_url(pic)

    # 3. If no specific category found, return the first available picture
    if profile_pictures:
        return get_url(profile_pictures[0])
    return None

def _check_is_premium(premium_user: Optional[PremiumUser]) -> bool:
    if premium_user and premium_user.is_active and premium_user.end_date > datetime.now(timezone.utc):
        return True
    return False

@router.post("/", response_model=LikeResponse, status_code=status.HTTP_201_CREATED)
def create_like(like: LikeCreate, liker_id: int, db: Session = Depends(get_db)):
    """Create a new like."""
    liker = get_user_by_id(db, user_id=liker_id)
    liked = get_user_by_id(db, user_id=like.liked_id)

    if not liker:
        raise HTTPException(status_code=404, detail="Liker user not found")
    if not liked:
        raise HTTPException(status_code=404, detail="Liked user not found")

    if check_if_like_exists(db, liker_id=liker_id, liked_id=like.liked_id):
        raise HTTPException(status_code=400, detail="Like already exists")

    result = crud_create_like(db=db, liker_id=liker_id, liked_id=like.liked_id)

    # --- SEND LIKE NOTIFICATION EMAIL (Non-blocking) ---
    import asyncio
    try:
        # Check if it's a super like (assuming LikeCreate has action field)
        is_super_like = hasattr(like, 'action') and like.action == 'super_like'

        # Send email notification to the liked user
        asyncio.create_task(
            NotificationService.notify_like_received(
                db=db,
                recipient_email=liked.email,
                recipient_name=liked.full_name,
                liker_name=liker.full_name,
                is_super_like=is_super_like
            )
        )
    except Exception as e:
        # Don't fail the like if email fails
        print(f"[WARNING] Failed to send like notification email: {e}")
    # --- END EMAIL NOTIFICATION ---

    return result

@router.get("/me/likes-me", response_model=List[ProfileDisplay])
def get_likes_me(user_id: int, db: Session = Depends(get_db)):
    """Get all users who have liked the current user (for 'Likes Me' page)."""
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    users_who_liked_me = get_users_who_liked_me(db, user_id=user_id)
    
    response_profiles = []
    for u in users_who_liked_me:
        first_name = u.profile.first_name if u.profile else u.full_name
        response_profiles.append(ProfileDisplay(
            id=u.id,
            nickname=first_name,
            age=_calculate_age(u.date_of_birth),
            profile_picture_url=_get_profile_picture_url(u.profile_pictures), # Uses the updated logic
            verified=(getattr(u, 'profile', None) is not None and getattr(u.profile, 'verified_status', None) == 'verified'),
            is_premium=_check_is_premium(u.premium)
        ))
    return response_profiles

@router.get("/me/my-likes", response_model=List[ProfileDisplay])
def get_my_likes(user_id: int, db: Session = Depends(get_db)):
    """Get all users that the current user has liked (for 'My Likes' page)."""
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    users_i_liked = get_users_i_liked(db, user_id=user_id)
    
    response_profiles = []
    for u in users_i_liked:
        first_name = u.profile.first_name if u.profile else u.full_name
        response_profiles.append(ProfileDisplay(
            id=u.id,
            nickname=first_name,
            age=_calculate_age(u.date_of_birth),
            profile_picture_url=_get_profile_picture_url(u.profile_pictures), # Uses the updated logic
            verified=(getattr(u, 'profile', None) is not None and getattr(u.profile, 'verified_status', None) == 'verified'),
            is_premium=_check_is_premium(u.premium)
        ))
        
    return response_profiles
