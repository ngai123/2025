import json
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Any, Dict
import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, not_
from sqlalchemy.exc import IntegrityError

from app import models, schemas
from app.database import get_db
from app.schemas.match import ChatSessionCreate,LikeDislikeCreate, LikeDislikeResponse, MatchResponse, ProfileResponse
from app.utils.notification_service import NotificationService
from app.utils.profile_completion import calculate_profile_completion
from app.schemas.preference import (
    UserPreferenceCreate,
    UserPreferenceResponse
)
from app.websocket import sio
# Assuming CRUD functions are available in app.crud.preferences
from app.crud.preferences import (
    upsert_user_preferences,
    get_user_preferences
)

router = APIRouter(
    prefix="/matches",
    tags=["matches"]
)

# --- Image Fetching Helper ---
def get_profile_image_url(db: Session, user_id: int) -> str:
    """
    Fetches the URL of the primary profile picture for a given user.
    'Primary' is defined as the one with the lowest ID (oldest/first uploaded).
    """
    # Query ProfilePicture model, filter by user_id, order by ID ascending, and take the first one.
    image_record = db.query(models.ProfilePicture).filter(
        models.ProfilePicture.user_id == user_id
    ).order_by(models.ProfilePicture.id.asc()).first()

    # Return the URL or a generic placeholder if no image is found
    if image_record:
        # Check if it's an external URL (mock data like pravatar)
        if image_record.image_url.startswith('http://') or image_record.image_url.startswith('https://'):
            # For external URLs (pravatar, placeholders, etc.), return directly
            if 'storage.googleapis.com' in image_record.image_url:
                # GCS URLs need proxy to avoid 403
                return f"/profile/me/pictures/{image_record.id}/image"
            else:
                # External mock URLs can be used directly
                return image_record.image_url
        else:
            # Relative or GCS paths use proxy
            return f"/profile/me/pictures/{image_record.id}/image"
    else:
        # Fallback placeholder image URL
        return "https://placehold.co/200x200/cccccc/333333?text=No+Photo"
# --- End Helper ---

# --- HELPER FUNCTION: Get Age from DOB ---
def calculate_age(dob_value) -> Optional[int]:
    """Calculates age from various DOB representations (date, datetime, ISO string)."""
    if not dob_value:
        return None
    try:
        # Normalize to date
        if isinstance(dob_value, datetime):
            dob = dob_value.date()
        elif isinstance(dob_value, date):
            dob = dob_value
        elif isinstance(dob_value, str):
            s = dob_value.strip()
            # Handle trailing 'Z' or timezone
            if s.endswith('Z'):
                s = s[:-1] + '+00:00'
            try:
                dt = datetime.fromisoformat(s)
                dob = dt.date()
            except Exception:
                # Fallback to simple date format
                try:
                    dob = datetime.strptime(s, '%Y-%m-%d').date()
                except Exception:
                    return None
        else:
            return None

        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return None


# --- HELPER FUNCTION: Get Seen/Swiped User IDs ---
def get_seen_user_ids(db: Session, user_id: int) -> set:
    """
    Get the set of user IDs that the current user has already swiped on.
    This is used to exclude already-seen profiles from suggestions.
    """
    seen_records = db.query(models.LikeDislike.liked_user_id).filter(
        models.LikeDislike.liker_id == user_id
    ).all()
    return {record.liked_user_id for record in seen_records}


# --- CRUD/LOGIC FUNCTION: Upsert Preferences (Integrated from app/crud/preferences.py) ---
# NOTE: This function is the one that received the JSON serialization fix.
def upsert_user_preferences(
    db: Session, preference_data: UserPreferenceCreate
) -> models.UserPreferences:
    """
    Creates or updates a user's preference record.
    Uses DELETE + INSERT to avoid persistent JSON serialization errors from old data.
    """
    user_id = preference_data.user_id
    
    # Prepare JSON object for JSONB column
    filter_by_obj = preference_data.filter_by.model_dump()

    # Check if a record already exists
    existing_prefs = db.query(models.UserPreferences).filter(
        models.UserPreferences.user_id == user_id
    ).first()

    if existing_prefs:
        existing_prefs.min_age = preference_data.min_age
        existing_prefs.max_age = preference_data.max_age
        existing_prefs.prefers_verified_only = preference_data.prefers_verified_only
        existing_prefs.filter_by = filter_by_obj
        db.add(existing_prefs)
        db.commit()
        db.refresh(existing_prefs)
        updated_prefs = existing_prefs
    else:
        db_prefs = models.UserPreferences(
            user_id=user_id,
            min_age=preference_data.min_age,
            max_age=preference_data.max_age,
            prefers_verified_only=preference_data.prefers_verified_only,
            filter_by=filter_by_obj,
        )
        db.add(db_prefs)
        db.commit()
        db.refresh(db_prefs)
        updated_prefs = db_prefs

    # 3. Prepare the response by deserializing filter_by back into a dict
    if updated_prefs.filter_by is None:
        updated_prefs.filter_by = {}
        
    return updated_prefs

# --- CRUD/LOGIC FUNCTION: Get Preferences (Integrated from app/crud/preferences.py) ---
def get_user_preferences(db: Session, user_id: int) -> Optional[UserPreferenceResponse]:
    """Retrieves user preferences and deserializes the filter_by JSON."""
    db_prefs = db.query(models.UserPreferences).filter(models.UserPreferences.user_id == user_id).first()
    
    if db_prefs:
        # Deserialize the JSON string back into a Python dictionary for the response
        if db_prefs.filter_by:
            # Check if filter_by is a string (if using String column) or already dict/JSONB
            if isinstance(db_prefs.filter_by, str):
                try:
                    db_prefs.filter_by = json.loads(db_prefs.filter_by)
                except Exception:
                    # Fallback to empty filters if stored JSON is corrupted
                    db_prefs.filter_by = {}
        else:
            db_prefs.filter_by = {}
        
        # NOTE: We return the SQLAlchemy object which FastAPI converts using the ResponseModel
        return db_prefs
        
    return None

@router.post("/create_chat_session")
def create_chat_session(data: ChatSessionCreate, db: Session = Depends(get_db)):
    """
    Create a new chat session between liker_id and liked_id.
    """

    # 1. Create new chat session
    new_session = models.ChatSession(created_at=datetime.now())
    db.add(new_session)
    db.flush()  # Assigns an ID before commit

    # 2. Add participants
    participants = [
        models.ChatParticipant(session_id=new_session.id, user_id=data.liker_id),
        models.ChatParticipant(session_id=new_session.id, user_id=data.liked_id),
    ]
    db.add_all(participants)
    db.commit()

    return {"result": "chat", "session": new_session.id}

@router.get("/check_user_premium/{uid}")
def check_is_premium(uid: int, db: Session = Depends(get_db)):
    premium_user = db.query(models.PremiumUser).filter(models.PremiumUser.user_id == uid).first()

    is_premium = premium_user and premium_user.is_active and premium_user.end_date > datetime.now(timezone.utc)
    return {"result": bool(is_premium)}

@router.get("/")
def read_matches_status():
    """
    A simple status check for the Matches API.
    Access via: GET /matches/
    """
    # This just confirms the router is loaded and the API is accessible
    return {"message": "Matches API is operational."}

# FastAPI Endpoint (Updated get_certain_profile function)

@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_certain_profile(user_id: int, db: Session = Depends(get_db)):

    if not user_id:
        raise HTTPException(status_code=404, detail="No new profiles found.")
    
    profile = (
        db.query(models.Profile)
        .join(models.User)
        .options(
            # Existing loads
            joinedload(models.Profile.user).joinedload(models.User.profile_pictures),
            joinedload(models.Profile.user).joinedload(models.User.user_prompts).joinedload(models.UserPrompt.prompt),
            joinedload(models.Profile.interests).joinedload(models.ProfileInterest.interest),
            joinedload(models.Profile.languages_selected).joinedload(models.ProfileLanguage.language),
            # NEW loads for reference tables
            joinedload(models.Profile.education),
            joinedload(models.Profile.employment),
            joinedload(models.Profile.industry),
            joinedload(models.Profile.my_goal),
            joinedload(models.Profile.relationship_status),
        )
        .filter(models.User.id == user_id)
        .first()
    )
    
    if profile:
        image_urls = []
        if profile.user.profile_pictures:
            for img in profile.user.profile_pictures:
                if "storage.googleapis.com" in img.image_url:
                    image_urls.append(f"/profile/me/pictures/{img.id}/image")
                else:
                    image_urls.append(img.image_url)

        prompts = [{"question": up.prompt.text, "answer": up.answer_text} for up in profile.user.user_prompts if up.prompt]
        
        # 3. Extract Age
        age = calculate_age(profile.user.date_of_birth) if profile.user and profile.user.date_of_birth else None
        
        # 4. Extract Languages
        languages = [pl.language.name for pl in profile.languages_selected] if profile.languages_selected else []
        
        # 5. Extract Interests
        interests = [
            {
                "name": pi.interest.name, 
                "icon": pi.interest.icon
            } 
            for pi in profile.interests
        ] if profile.interests else []

        # 6. Extract Foreign Key Names
        education_name = profile.education.name if profile.education else None
        employment_name = profile.employment.name if profile.employment else None
        industry_name = profile.industry.name if profile.industry else None
        my_goal_name = profile.my_goal.name if profile.my_goal else None
        relationship_status_name = profile.relationship_status.name if profile.relationship_status else None
        
        return ProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            full_name=profile.user.full_name,
            about_me=profile.about_me,
            gender=profile.user.gender, # Assuming gender_id is on the User model
            education_name=education_name,
            employment_name=employment_name,
            industry_name=industry_name,
            verified_status=profile.verified_status,
            profile_visibility=profile.profile_visibility,
            my_goal_name=my_goal_name,
            come_from=profile.come_from,
            relationship_status_name=relationship_status_name,
            height_cm=profile.height_cm,
            zodiac=profile.zodiac,
            interested_in=profile.interested_in,
            profile_views=profile.profile_views,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            images=image_urls,
            prompts=prompts,
            interests=interests,
            age=age,
            languages=languages,
        )
    raise HTTPException(status_code=404, detail="Profile not found.")

# --- 1. GET RANDOM UNSEEN PROFILE (SUGGESTION LOGIC) ---
@router.get("/suggest/{current_user_id}", response_model=ProfileResponse)
def get_random_unseen_profile(current_user_id: int, db: Session = Depends(get_db)):
    """
    Fetch a single random user profile that the current user has not yet interacted with,
    applying saved preferences for age range, gender, bio length, and relationship status.
    """
    prefs = get_user_preferences(db, current_user_id)
    fb = getattr(prefs, "filter_by", {}) or {}
    def norm(s): return (s or "").strip().lower().replace(" ", "_").replace("-", "_")
    min_age = int(fb.get("from_age", 18))
    max_age = int(fb.get("to_age", 60))
    gender_pref = fb.get("gender") or None
    bio_length_max = fb.get("bio_length_max") if fb.get("bio_length_max") is not None else fb.get("distance")
    try:
        bio_length_max = int(bio_length_max) if bio_length_max is not None else None
    except Exception:
        bio_length_max = None
    # Relationship filtering: support new multi-select and legacy single-select
    preferred_relationship_single = fb.get("relationship") or None
    relationship_all = bool(fb.get("relationship_all", False))
    relationship_statuses = fb.get("relationship_statuses") or None

    blocked_ids = set()
    try:
        q1 = db.query(models.UserBlock.blocked_id).filter(models.UserBlock.blocker_id == current_user_id).all()
        for r in q1:
            blocked_ids.add(r[0])
    except Exception:
        pass
    try:
        blocked_sessions = db.query(models.ChatParticipant.session_id).filter(
            models.ChatParticipant.user_id == current_user_id,
            models.ChatParticipant.blocked == True,
            models.ChatParticipant.left_at.is_(None)
        ).subquery()
        q2 = db.query(models.ChatParticipant.user_id).filter(
            models.ChatParticipant.session_id.in_(select(blocked_sessions.c.session_id)),
            models.ChatParticipant.user_id != current_user_id,
            models.ChatParticipant.left_at.is_(None)
        ).all()
        for r in q2:
            blocked_ids.add(r[0])
    except Exception:
        pass

    candidates = (
        db.query(models.Profile)
        .join(models.User)
        .options(
            joinedload(models.Profile.user).joinedload(models.User.profile_pictures),
            joinedload(models.Profile.user).joinedload(models.User.user_prompts).joinedload(models.UserPrompt.prompt),
            joinedload(models.Profile.interests).joinedload(models.ProfileInterest.interest),
            joinedload(models.Profile.languages_selected).joinedload(models.ProfileLanguage.language),
            joinedload(models.Profile.education),
            joinedload(models.Profile.employment),
            joinedload(models.Profile.industry),
            joinedload(models.Profile.my_goal),
            joinedload(models.Profile.relationship_status),
        )
        .filter(models.User.id != current_user_id)
        .all()
    )

    filtered = []
    for p in candidates:
        if p.user_id in blocked_ids:
            continue
        age = calculate_age(p.user.date_of_birth) if p.user and p.user.date_of_birth else None
        if age is not None and (age < min_age or age > max_age):
            continue
        if gender_pref and norm(gender_pref) not in ("all", "everyone"):
            user_gender = (p.user.gender or "").strip().lower() if p.user and p.user.gender else ""
            if user_gender and norm(gender_pref) != user_gender:
                continue
        if bio_length_max is not None:
            about = p.about_me or ""
            if len(about) > bio_length_max:
                continue
        # Apply relationship filters
        if not relationship_all:
            rel_name = p.relationship_status.name if p.relationship_status else None
            rel_key = norm(rel_name) if rel_name else None
            if relationship_statuses and isinstance(relationship_statuses, list):
                normalized_set = {norm(s) for s in relationship_statuses if isinstance(s, str)}
                if rel_key not in normalized_set:
                    continue
            elif preferred_relationship_single:
                if rel_key != norm(preferred_relationship_single):
                    continue
        filtered.append(p)

    if not filtered:
        raise HTTPException(status_code=404, detail="No new profiles found matching your filters.")

    # Get user IDs that the current user has already swiped on
    seen_user_ids = get_seen_user_ids(db, current_user_id)

    # Filter out already-seen profiles
    unseen_profiles = [p for p in filtered if p.user_id not in seen_user_ids]

    if not unseen_profiles:
        raise HTTPException(status_code=404, detail="No new profiles found. You've seen all available profiles.")

    # Calculate completion rate for each profile and sort descending (highest first)
    profiles_with_completion = []
    for p in unseen_profiles:
        completion_rate = calculate_profile_completion(
            profile=p,
            user=p.user,
            profile_pictures=p.user.profile_pictures or [],
            user_prompts=p.user.user_prompts or []
        )
        profiles_with_completion.append((p, completion_rate))

    # Sort by completion rate descending (most complete profiles first)
    profiles_with_completion.sort(key=lambda x: x[1], reverse=True)

    # Return the first (most complete) unseen profile
    profile, completion_rate = profiles_with_completion[0]

    if profile:
        image_urls = []
        if profile.user.profile_pictures:
            for img in profile.user.profile_pictures:
                if "storage.googleapis.com" in img.image_url:
                    image_urls.append(f"/profile/me/pictures/{img.id}/image")
                else:
                    image_urls.append(img.image_url)
                    
        prompts = [{"question": up.prompt.text, "answer": up.answer_text} for up in profile.user.user_prompts if up.prompt]
        interests = [
            {
                "name": pi.interest.name,
                "icon": pi.interest.icon
            }
            for pi in profile.interests
        ] if profile.interests else []
        age = calculate_age(profile.user.date_of_birth) if profile.user and profile.user.date_of_birth else None
        languages = [pl.language.name for pl in profile.languages_selected] if profile.languages_selected else []  

        # 6. Extract Foreign Key Names
        education_name = profile.education.name if profile.education else None
        employment_name = profile.employment.name if profile.employment else None
        industry_name = profile.industry.name if profile.industry else None
        my_goal_name = profile.my_goal.name if profile.my_goal else None
        relationship_status_name = profile.relationship_status.name if profile.relationship_status else None

        # --- Safety defaults to avoid response validation errors ---
        # Some seed data may leave certain fields null; ensure required fields are present
        full_name = profile.user.full_name or (
            f"{profile.first_name or ''} {profile.last_name or ''}".strip() or "Unknown"
        )
        verified_status = str(profile.verified_status) if profile.verified_status is not None else "unverified"
        profile_visibility = str(profile.profile_visibility) if profile.profile_visibility is not None else "public"
        profile_views = int(profile.profile_views or 0)
        created_at = profile.created_at or datetime.now()
        updated_at = profile.updated_at or datetime.now()

        return ProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            full_name=full_name,
            about_me=profile.about_me,
            gender=profile.user.gender, # Assuming gender_id is on the User model
            education_name=education_name,
            employment_name=employment_name,
            industry_name=industry_name,
            verified_status=verified_status,
            profile_visibility=profile_visibility,
            my_goal_name=my_goal_name,
            come_from=profile.come_from,
            relationship_status_name=relationship_status_name,
            height_cm=profile.height_cm,
            zodiac=profile.zodiac,
            interested_in=profile.interested_in,
            profile_views=profile_views,
            created_at=created_at,
            updated_at=updated_at,
            images=image_urls,
            prompts=prompts,
            interests=interests,
            age=age,
            languages=languages,
            completion_rate=completion_rate
        )
    raise HTTPException(status_code=404, detail="Profile not found.")

@router.get(
    "/check_match/{liker_id}/{liked_id}", # Changed path variables
    response_model=Dict[str, Any],
    summary="Checks if two users have a mutual match (i.e., an active chat session)."
)
def check_mutual_match(liker_id: int, liked_id: int, db: Session = Depends(get_db)): # Changed function parameters
    """
    Checks if a mutual match exists by querying for a ChatSession 
    that includes both users as participants.
    """
    if liker_id == liked_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User IDs must be different to check for a match."
        )

    # 1. Check for an existing ChatSession involving both users.
    # Get the session_ids for liker_id (User A)
    sessions_a = db.query(models.ChatParticipant.session_id).filter(
        models.ChatParticipant.user_id == liker_id # Using liker_id
    ).subquery()
    
    # Find the single session_id that is also associated with liked_id (User B)
    chat_participant_b = db.query(models.ChatParticipant).filter(
        models.ChatParticipant.user_id == liked_id, # Using liked_id
        models.ChatParticipant.session_id.in_(sessions_a)
    ).first()
    
    # 2. Process the result
    if chat_participant_b:
        # A match and chat session exists!
        session_id = chat_participant_b.session_id
        
        # We assign the variables for clarity in the response structure
        user1_id = liker_id
        user2_id = liked_id

        # Fetch basic user info for response
        user1_data = db.query(models.User.id, models.User.username).filter(models.User.id == user1_id).first()
        user2_data = db.query(models.User.id, models.User.username).filter(models.User.id == user2_id).first()
        
        # --- FETCH PROFILE PICTURES using your helper ---
        user1_image_url = get_profile_image_url(db, user1_id)
        user2_image_url = get_profile_image_url(db, user2_id)
        # --- END FETCH PROFILE PICTURES ---

        # 3. Return the match details
        return {
            "type": "match",
            "match_found": True,
            "session_id": session_id,
            "user1": { # Represents the liker_id (User A)
                "id": user1_data.id, 
                "username": user1_data.username, 
                "image_url": user1_image_url
            },
            "user2": { # Represents the liked_id (User B)
                "id": user2_data.id, 
                "username": user2_data.username, 
                "image_url": user2_image_url
            }
        }
    else:
        # 4. No match found
        return {
            "type": "no_match",
            "match_found": False
        }


@router.post(
    "/action", 
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Record a Like, Dislike, or other interaction. Returns match status."
)
async def create_like_dislike(like: LikeDislikeCreate, db: Session = Depends(get_db)):
    """
    Records a user action (like, dislike, superlike, etc.).
    If the status is 'like', it checks for a mutual match and creates a chat session.
    """
    liker_id = like.liker_id
    liked_id = like.liked_user_id

    if liker_id == liked_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user cannot interact with their own profile."
        )

    # Map numeric status codes to enum values
    status_map = {
        '1': 'dislike',
        '2': 'like',
        '3': 'super_like'
    }

    # Get the enum value, or use the status as-is if it's already a valid enum value
    db_status = status_map.get(like.status, like.status)
    IS_LIKE = db_status == 'like' or db_status == 'super_like'

    try:
        # 1. UPSERT the current action (User A -> User B)
        existing_action = db.query(models.LikeDislike).filter(
            models.LikeDislike.liker_id == liker_id,
            models.LikeDislike.liked_user_id == liked_id
        ).first()

        if existing_action:
            existing_action.status = db_status
            db.add(existing_action)
        else:
            db_action = models.LikeDislike(
                liker_id=liker_id,
                liked_user_id=liked_id,
                status=db_status
            )
            db.add(db_action)

        # If the action was a LIKE, check for a match
        if IS_LIKE:
            # 2. CHECK FOR MUTUAL LIKE (User B -> User A)
            mutual_like = db.query(models.LikeDislike).filter(
                models.LikeDislike.liker_id == liked_id,
                models.LikeDislike.liked_user_id == liker_id,
                models.LikeDislike.status.in_(['like', 'super_like']) # Check if the reverse is also a LIKE or SUPER_LIKE
            ).first()
            
            if mutual_like:
                # --- IT'S A MATCH! Check if chat session already exists ---
                # FIXED: Prevent duplicate chat sessions between same user pair
                existing_session = db.query(models.ChatSession).join(
                    models.ChatParticipant,
                    models.ChatSession.id == models.ChatParticipant.session_id
                ).filter(
                    models.ChatParticipant.user_id.in_([liker_id, liked_id]),
                    models.ChatSession.status == "ACTIVE"
                ).group_by(models.ChatSession.id).having(
                    func.count(models.ChatParticipant.user_id.distinct()) == 2
                ).first()

                if existing_session:
                    # Session already exists, use it instead of creating new one
                    print(f"[INFO] Match already has chat session {existing_session.id} for users {liker_id} <-> {liked_id}")
                    new_session = existing_session
                else:
                    # Create new chat session
                    new_session = models.ChatSession()
                    db.add(new_session)
                    db.flush()  # Ensure new_session gets an ID

                    # Insert Participants
                    db.add_all([
                        models.ChatParticipant(session_id=new_session.id, user_id=liker_id),
                        models.ChatParticipant(session_id=new_session.id, user_id=liked_id),
                    ])
                    print(f"[INFO] Created new chat session {new_session.id} for users {liker_id} <-> {liked_id}")
                
                # Fetch basic user info for response
                user1 = db.query(models.User).filter(models.User.id == liker_id).first()
                user2 = db.query(models.User).filter(models.User.id == liked_id).first()

                # --- FETCH PROFILE PICTURES ---
                user1_image_url = get_profile_image_url(db, liker_id)
                user2_image_url = get_profile_image_url(db, liked_id)
                # --- END FETCH PROFILE PICTURES ---

                # FINAL COMMIT FOR MATCH PATH
                db.commit()

                await sio.emit('match_created', {
                    'type': 'match',
                    'session_id': new_session.id,
                    'user1': {
                        'id': user1.id,
                        'username': user1.username,
                        'image_url': user1_image_url
                    },
                    'user2': {
                        'id': user2.id,
                        'username': user2.username,
                        'image_url': user2_image_url
                    }
                })

                # --- SEND MATCH NOTIFICATION EMAILS (Non-blocking) ---
                import asyncio
                try:
                    # Send email to user1 (liker)
                    asyncio.create_task(
                        NotificationService.notify_new_match(
                            db=db,
                            user_email=user1.email,
                            user_name=user1.full_name,
                            match_name=user2.full_name,
                            match_photo_url=user2_image_url if user2_image_url.startswith('http') else None
                        )
                    )
                    # Send email to user2 (liked)
                    asyncio.create_task(
                        NotificationService.notify_new_match(
                            db=db,
                            user_email=user2.email,
                            user_name=user2.full_name,
                            match_name=user1.full_name,
                            match_photo_url=user1_image_url if user1_image_url.startswith('http') else None
                        )
                    )
                except Exception as e:
                    # Don't fail the match if email fails
                    print(f"[WARNING] Failed to send match notification emails: {e}")
                # --- END EMAIL NOTIFICATIONS ---

                return {
                    "type": "match",
                    # Return the current user (liker) info as user1
                    "user1": {"id": user1.id, "username": user1.username, "image_url": user1_image_url},
                    # Return the matched user (liked) info as user2
                    "user2": {"id": user2.id, "username": user2.username, "image_url": user2_image_url},
                    "session_id": new_session.id
                }

        # FINAL COMMIT FOR NO MATCH/NON-LIKE PATH
        db.commit() 
        
        # 3. NO MATCH or non-LIKE action
        return {"type": "next"}

    except IntegrityError as e:
        db.rollback()
        # Simplified error checking
        if "foreign key" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both user IDs provided do not exist.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Database constraint violation.")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@router.get(
    "/check_match2/{liker_id}",
    response_model=Dict[str, Any],
    summary="Retrieves the single most recent unacknowledged mutual match for the specified user."
)
def get_latest_match(liker_id: int, db: Session = Depends(get_db)):
    """
    Finds the most recent chat session (by session_id) that the user is a participant in 
    and has *not* yet acknowledged (is_notified = '0'). 
    If found, it identifies the other participant (liked_id), updates the record to 
    is_notified = '1', and returns the match details.
    """
    try:
        latest_session_record = db.query(models.ChatParticipant).filter(
            models.ChatParticipant.user_id == liker_id,
            models.ChatParticipant.is_notified == '0'
        ).order_by(models.ChatParticipant.session_id.desc()).first()

        if not latest_session_record:
            return {"type": "no_match"}

        session_id = latest_session_record.session_id

        latest_session_record.is_notified = '1'
        db.commit()

        liked_id_record = db.query(models.ChatParticipant.user_id).filter(
            models.ChatParticipant.session_id == session_id,
            models.ChatParticipant.user_id != liker_id
        ).first()

        if not liked_id_record:
            return {"type": "no_match"}

        liked_id = liked_id_record.user_id

        user1_data = db.query(models.User.id, models.User.username).filter(models.User.id == liker_id).first()
        user2_data = db.query(models.User.id, models.User.username).filter(models.User.id == liked_id).first()

        if not user1_data or not user2_data:
            return {"type": "no_match"}

        user1_image_url = get_profile_image_url(db, liker_id)
        user2_image_url = get_profile_image_url(db, liked_id)

        return {
            "type": "match",
            "session_id": session_id,
            "user1": {"id": user1_data.id, "username": user1_data.username, "image_url": user1_image_url},
            "user2": {"id": user2_data.id, "username": user2_data.username, "image_url": user2_image_url}
        }
    except Exception as e:
        print(f"[Matches] check_match2 transient error: {e}")
        return {"type": "no_match"}

@router.post("/superlike/")
def create_chat_session(data: ChatSessionCreate, db: Session = Depends(get_db)):
    # Call check_is_premium internally
    premium_check = check_is_premium(data.liker_id, db)

    if premium_check["result"]:  # Correct way to check boolean in dict
        # 1. Create new chat session
        new_session = models.ChatSession(created_at=datetime.now())
        db.add(new_session)
        db.flush()  # Assigns ID before commit

        # 2. Add participants
        participants = [
            models.ChatParticipant(session_id=new_session.id, user_id=data.liker_id),
            models.ChatParticipant(session_id=new_session.id, user_id=data.liked_id),
        ]
        db.add_all(participants)
        db.commit()

        return {"result": "chat", "session": new_session.id}

    # If not premium, return result false
    return {"result": False}

# --- 3. PREFERENCES API ENDPOINTS ---

@router.post(
    "/preferences/set",
    response_model=UserPreferenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Creates or updates a user's filter preferences."
)
def set_user_preferences(
    preference_data: UserPreferenceCreate, 
    db: Session = Depends(get_db)
):
    """Creates or updates a user's filter preferences (age, gender, distance, etc.)."""
    try:
        # Use the fixed CRUD function
        saved_prefs = upsert_user_preferences(db, preference_data)
        return saved_prefs
    except Exception as e:
        db.rollback()
        # This will now show the detailed database error if the fix failed to cover everything
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save user preferences. Internal Error: {str(e)}"
        )

@router.get(
    "/preferences/{user_id}",
    response_model=UserPreferenceResponse,
    summary="Retrieves a user's currently saved filter preferences."
)
def get_preferences_by_user(user_id: int, db: Session = Depends(get_db)):
    """Retrieves a user's currently saved filter preferences."""
    prefs = get_user_preferences(db, user_id)
    if not prefs:
        # Return a default/empty response structure if no preferences are saved
        return UserPreferenceResponse(
            user_id=user_id,
            min_age=18,
            max_age=99,
            prefers_verified_only=False,
            filter_by={}
        )
    return prefs


# --- 4. RESET SEEN PROFILES ENDPOINT ---

@router.delete(
    "/reset-seen/{user_id}",
    response_model=Dict[str, Any],
    summary="Resets a user's seen profiles by clearing dislike records."
)
def reset_seen_profiles(user_id: int, db: Session = Depends(get_db)):
    """
    Clears all 'dislike' records for a user, allowing them to see
    previously swiped-left profiles again.

    Note: Likes and super_likes are preserved to maintain match history.
    """
    try:
        # Delete only dislike records (preserve likes/super_likes for match history)
        deleted_count = db.query(models.LikeDislike).filter(
            models.LikeDislike.liker_id == user_id,
            models.LikeDislike.status == 'dislike'
        ).delete(synchronize_session='fetch')

        db.commit()

        return {
            "success": True,
            "message": f"Reset {deleted_count} seen profiles. You can now discover them again!",
            "reset_count": deleted_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset seen profiles: {str(e)}"
        )