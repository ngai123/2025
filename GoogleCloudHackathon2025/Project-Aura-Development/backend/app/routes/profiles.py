from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import uuid
import os
import mimetypes
from urllib.parse import urlparse
from google.cloud import storage

from app.database import get_db
from app.auth import get_current_user_id  # Import authentication dependency
from app.schemas.profile import (
    ProfileCreate, ProfileUpdate, ProfileFullResponse, # Using revised schemas
    ProfilePictureResponse,  ProfilePictureUpload, # Using revised schemas
    EmergencyContactCreate, EmergencyContactResponse,
    UserPreferencesUpdate, UserPreferencesResponse,
    UserPromptItem, # Using revised schema for prompts
    LoveStyleResponse # Using revised schemas
)
from app.models import ProfilePicture # Import ProfilePicture model for delete endpoint
from app.schemas.common import SuccessResponse
from app.crud import profile as crud_profile
from app.utils.gcs import (
    upload_profile_image_to_gcs,
    generate_signed_url_for_path,
    generate_signed_url_from_canonical_url,
    upload_file_to_gcs, delete_file_from_gcs # Import GCS services
)



router = APIRouter(prefix="/profile", tags=["Profile"]) # Changed prefix to /profile for /me/profile

logger = logging.getLogger(__name__)

# --- HELPER FUNCTION: Get Age from DOB ---
def calculate_age(dob_value) -> Optional[int]:
    """Calculates age from various DOB representations (date, datetime, ISO string)."""
    from datetime import date, datetime
    if not dob_value:
        return None
    today = date.today()
    if isinstance(dob_value, datetime):
        dob = dob_value.date()
    elif isinstance(dob_value, date):
        dob = dob_value
    elif isinstance(dob_value, str):
        s = dob_value.strip()
        try:
            dt = datetime.fromisoformat(s)
            dob = dt.date()
        except Exception:
            try:
                dob = datetime.strptime(s, '%Y-%m-%d').date()
            except Exception:
                return None
    else:
        return None
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

# --- Profile Endpoints ---

# This endpoint is typically for initial profile creation during user registration.
# It's not directly used by EditProfile.jsx for existing users.
@router.post("/", response_model=ProfileFullResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: ProfileCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id) # Ensure authenticated user creates their own profile
):
    """
    Create a new profile for the authenticated user.
    This is typically called during user registration.
    """

    existing = crud_profile.get_profile_by_user_id(db, current_user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists for this user"
        )
    # Ensure the profile is created for the current_user_id
    db_profile = crud_profile.create_profile(db, current_user_id, profile_in)
    # Fetch the full profile to return, including related data
    full_profile = crud_profile.get_profile_by_user_id(db, current_user_id)
    if not full_profile: # Should not happen if creation was successful
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve created profile")
    return _build_profile_full_response(full_profile)


@router.get("/me", response_model=ProfileFullResponse) # Changed path to /me
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id) # Get user ID from authentication
):
    """Get the authenticated user's profile"""
    full_profile = crud_profile.get_profile_by_user_id(db, current_user_id)
    if not full_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for this user"
        )

    return await _build_profile_full_response(full_profile)


@router.put("/me", response_model=ProfileFullResponse)
async def update_my_profile(
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Update the authenticated user's profile""" 
    # crud_profile.update_profile now raises HTTPException directly, so no need for 'if not profile' check here
    crud_profile.update_profile(db, current_user_id, profile_update)
    
    # Fetch the full profile again to ensure all relationships are updated and returned
    full_profile = crud_profile.get_profile_by_user_id(db, current_user_id)
    if not full_profile: # This should ideally not happen if update was successful
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve updated profile")
    
    # Construct the response explicitly, similar to GET /me
    return await _build_profile_full_response(full_profile)


# --- Helper function to build ProfileFullResponse ---
async def _build_profile_full_response(profile: crud_profile.Profile) -> ProfileFullResponse:
    """
    Helper function to construct ProfileFullResponse from a SQLAlchemy Profile object.
    This ensures all nested fields and relationships are correctly mapped to the Pydantic schema.
    """
    # Ensure profile.user is loaded
    if not profile.user:
        # This case should ideally be handled by get_profile_by_user_id's eager loading,
        # but as a safeguard, we can raise an error or fetch it.
        # For now, assume it's loaded.
        pass

    # Handle potential None for relationships if they are optional
    user_prompts_data = []
    if profile.user and profile.user.user_prompts:
        for prompt in profile.user.user_prompts:
            user_prompts_data.append({
                "question": prompt.prompt.text if prompt.prompt else "",
                "answer": prompt.answer_text
            })

    profile_pictures_data = []
    if profile.user and profile.user.profile_pictures:
        for pic in profile.user.profile_pictures:
            profile_pictures_data.append({
                "id": pic.id,
                "image_url": pic.image_url,
                "upload_date": pic.upload_date
            })

    love_style_data = None
    if profile.user and profile.user.love_style:
        love_style_data = {
            "type": profile.user.love_style.type,
            "archetype": profile.user.love_style.archetype,
            "icon": profile.user.love_style.icon,
            "compatibility": profile.user.love_style.compatibility,
            "description": profile.user.love_style.description,
            "traits": [
                {"trait": trait.trait}
                for trait in profile.user.love_style.traits
            ]
        }

    profile_pictures_data = []
    if profile.user and profile.user.profile_pictures:
        # Create a dictionary to hold the latest picture for each category
        latest_pictures_by_category = {}
        for pic in profile.user.profile_pictures:
            # If a picture for this category doesn't exist yet, or if this one is newer
            if pic.category not in latest_pictures_by_category or \
               pic.upload_date > latest_pictures_by_category[pic.category].upload_date:
                latest_pictures_by_category[pic.category] = pic

        # Convert back to a list for the response, ensuring category is included
        # Use backend proxy URLs to avoid 403 errors with private GCS bucket
        for category_pic in latest_pictures_by_category.values():
            # Check if it's an external URL (mock data like pravatar)
            if category_pic.image_url.startswith('http://') or category_pic.image_url.startswith('https://'):
                if 'storage.googleapis.com' in category_pic.image_url:
                    # GCS URLs need proxy to avoid 403
                    image_url = f"/profile/me/pictures/{category_pic.id}/image"
                else:
                    # External mock URLs can be used directly
                    image_url = category_pic.image_url
            else:
                # Relative or GCS paths use proxy
                image_url = f"/profile/me/pictures/{category_pic.id}/image"

            profile_pictures_data.append({
                "id": category_pic.id,
                "image_url": image_url,
                "category": category_pic.category,
                "upload_date": category_pic.upload_date
            })
        # Optional: Sort the final list by category for consistent display order in the UI
        profile_pictures_data.sort(key=lambda x: x['category'] or '')


    print(f"DEBUG: Inside _build_profile_full_response for user_id: {profile.user_id}")
    print(f"DEBUG: Profile object relationship_id: {profile.relationship_id}")
    if profile.relationship_status:
        print(f"DEBUG: Profile object relationship_status.name: {profile.relationship_status.name}")
    else:
        print(f"DEBUG: Profile object relationship_status is None")
        
    return ProfileFullResponse(
        id=profile.id,
        user_id=profile.user_id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        # REMOVED: dob and gender_id - now accessed from User table
        # dob is now date_of_birth in User table
        # gender_id is now gender in User table
        # ✅ NEW: Map education_id to education.name
        education_id=profile.education.name if profile.education else None,
        # ✅ NEW: Map employment_id to employment.name
        employment_id=profile.employment.name if profile.employment else None,
        # ✅ NEW: Map industry_id to industry.name
        industry_id=profile.industry.name if profile.industry else None,
        height_cm=profile.height_cm,
        zodiac=profile.zodiac,
        come_from=profile.come_from,
        about_me=profile.about_me,
        interested_in=profile.interested_in,
        profile_visibility=profile.profile_visibility,
         # ✅ NEW: Map my_goal_id to my_goal.name
        my_goal_id=profile.my_goal.name if profile.my_goal else None,
        verified_status=profile.verified_status,
        created_at=profile.created_at,
        updated_at=profile.updated_at,

        # User fields
        full_name=profile.user.full_name if profile.user else None,
        email=profile.user.email if profile.user else None,
        is_active=profile.user.is_active if profile.user else False,
        is_verified=True if profile and getattr(profile, 'verified_status', None) == 'verified' else False,
        date_of_birth=profile.user.date_of_birth if profile.user else None,
        age=calculate_age(profile.user.date_of_birth) if profile.user else None,

        # Language (convert from ID to name if needed)
        language_name=[pl.language.name for pl in profile.languages_selected if pl.language] if profile.languages_selected else [],

        # Many-to-many relationships (extracting just the names)
        interests=[pi.interest.name for pi in profile.interests if pi.interest],

        # Relationship status (single FK, not many-to-many)
        relationship_status=profile.relationship_status.name if profile.relationship_status else None,

        # Profile pictures
        profile_pictures=profile_pictures_data,

        # User prompts
        user_prompts=user_prompts_data,

        # Love style
        love_style=love_style_data
    )

# --- Profile Picture Endpoints ---

@router.get("/me/pictures", response_model=List[ProfilePictureResponse]) # Changed path to /me
async def get_my_profile_pictures(
    request: Request,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get all profile pictures for the authenticated user
    and return signed URLs so the browser can access private GCS objects."""
    pics = crud_profile.get_profile_pictures(db, current_user_id)
    result: List[ProfilePictureResponse] = []
    for pic in pics:
        try:
            signed_url = await generate_signed_url_from_canonical_url(pic.image_url)
            result.append(ProfilePictureResponse(
                id=pic.id,
                image_url=signed_url,
                category=pic.category,
                upload_date=pic.upload_date,
            ))
        except Exception:
            # If signing fails (likely missing signing credentials locally),
            # fall back to a backend-proxied URL so the browser can still render the image.
            base_url = str(request.base_url).rstrip('/')
            proxy_url = f"{base_url}/profile/me/pictures/{pic.id}/image"
            result.append(ProfilePictureResponse(
                id=pic.id,
                image_url=proxy_url,
                category=pic.category,
                upload_date=pic.upload_date,
            ))
    return result


@router.get("/me/pictures/{picture_id}/image")
async def stream_my_profile_picture_image(
    picture_id: int,
    db: Session = Depends(get_db)
):
    """Stream a profile picture through the backend.
    This endpoint is public (no auth required) to allow images to load via CSS backgroundImage.
    Pictures are still validated to exist in the database before serving.
    
    Supports both GCS (production) and local file storage (development).
    Set USE_LOCAL_STORAGE=true and LOCAL_STORAGE_PATH in .env for local mode.
    """
    db_picture = db.query(ProfilePicture).filter(
        ProfilePicture.id == picture_id
    ).first()
    if not db_picture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Picture not found")

    # Parse bucket and blob path from the canonical URL stored in DB
    parsed = urlparse(db_picture.image_url)
    parts = parsed.path.lstrip("/").split("/", 1)
    if len(parts) < 2:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid image URL format")

    bucket_name_from_url = parts[0]
    blob_path = parts[1]

    # Check if using local storage (for development without GCS access)
    use_local_storage = os.getenv("USE_LOCAL_STORAGE", "false").lower() == "true"
    local_storage_path = os.getenv("LOCAL_STORAGE_PATH", "")

    if use_local_storage and local_storage_path:
        # Serve from local file system
        # blob_path format: profile_pictures/1/photo.jpg or profile-pictures/1/photo.jpg
        local_file_path = os.path.join(local_storage_path, blob_path.replace("/", os.sep))
        
        # Also try without the prefix folder if not found (in case files are directly in LOCAL_STORAGE_PATH)
        if not os.path.exists(local_file_path):
            # Try extracting just the user folder and filename
            path_parts = blob_path.split("/")
            if len(path_parts) >= 2:
                # Try: LOCAL_STORAGE_PATH/user_id/filename
                alt_path = os.path.join(local_storage_path, *path_parts[-2:])
                if os.path.exists(alt_path):
                    local_file_path = alt_path
        
        if not os.path.exists(local_file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Image file not found locally: {blob_path}"
            )
        
        try:
            with open(local_file_path, "rb") as f:
                data = f.read()
            content_type = mimetypes.guess_type(local_file_path)[0] or "image/jpeg"
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Failed to read local image: {e}"
            )
    else:
        # Use GCS (production mode)
        client = storage.Client()
        bucket = client.bucket(bucket_name_from_url)
        blob = bucket.blob(blob_path)

        try:
            # Fetch bytes; also try to derive the content type from metadata or filename
            data = blob.download_as_bytes()
            content_type = blob.content_type or mimetypes.guess_type(blob_path)[0] or "image/jpeg"
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch image: {e}")

    headers = {
        "Cache-Control": "private, max-age=3600",
    }
    return StreamingResponse(iter([data]), media_type=content_type, headers=headers)


@router.post("/me/pictures", response_model=ProfilePictureResponse, status_code=status.HTTP_201_CREATED) # Changed path to /me
async def add_my_profile_picture(
    category: str = Form(...), # Get category from form data
    file: UploadFile = File(...), # Get the file directly
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Add a new profile picture for the authenticated user"""

    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

    # Generate a unique filename for GCS with category prefix
    file_extension = os.path.splitext(file.filename)[1]
    destination_blob_name = f"profile_pictures/{current_user_id}/{category}_{uuid.uuid4()}{file_extension}"

    # Upload to GCS
    gcs_url = await upload_file_to_gcs(file, destination_blob_name)

    # Add to database
    db_picture = crud_profile.add_profile_picture(db, current_user_id, gcs_url, category)

    # Convert to proxy URL before returning to avoid 403 errors
    db_picture.image_url = f"/profile/me/pictures/{db_picture.id}/image"

    return db_picture


@router.delete("/me/pictures/{picture_id}", response_model=SuccessResponse) # Changed path to /me
async def delete_my_profile_picture(
    picture_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a profile picture for the authenticated user"""

    # First, get the picture to retrieve its GCS URL
    db_picture = db.query(ProfilePicture).filter(
        ProfilePicture.id == picture_id,
        ProfilePicture.user_id == current_user_id
    ).first()
    if not db_picture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Picture not found or does not belong to user"
        )

    # Extract blob name from GCS URL using urlparse (robust method)
    # Example: https://storage.googleapis.com/project-aura-image/profile_pictures/1/abc-123.jpg
    # Result: profile_pictures/1/abc-123.jpg
    parsed = urlparse(db_picture.image_url)
    parts = parsed.path.lstrip("/").split("/", 1)
    if len(parts) < 2:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid image URL format")
    blob_name = parts[1]  # Skip bucket name, get the blob path

    # Delete from GCS
    await delete_file_from_gcs(blob_name)

    # Delete from database
    success = crud_profile.delete_profile_picture(db, current_user_id, picture_id)
    if not success: # This check might be redundant if db_picture was found above
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Picture not found or does not belong to user"
        )
    return SuccessResponse(success=True, message="Picture deleted successfully")


# --- User Prompts Endpoints ---

@router.get("/me/prompts", response_model=List[UserPromptItem]) # Using UserPromptItem
async def get_my_user_prompts(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get all prompts for the authenticated user"""

    db_prompts = crud_profile.get_user_prompts(db, current_user_id)
    # Manually map to UserPromptItem to include question text
    return [
        UserPromptItem(question=p.prompt.text, answer=p.answer_text)
        for p in db_prompts
    ]


@router.post("/me/prompts", response_model=UserPromptItem, status_code=status.HTTP_201_CREATED)
async def create_my_user_prompt(
    prompt_in: UserPromptItem, # Expecting question and answer
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new user prompt for the authenticated user"""

    db_prompt = crud_profile.create_user_prompt(db, current_user_id, prompt_in)
    # Return the created prompt with its question text
    return UserPromptItem(question=db_prompt.prompt.text, answer=db_prompt.answer_text)


@router.put("/me/prompts/{old_question}", response_model=UserPromptItem) # Using old_question as identifier
async def update_my_user_prompt(
    old_question: str, # The question text of the prompt to update
    prompt_update: UserPromptItem, # The new question and/or answer
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Update a user prompt for the authenticated user"""
    

    db_prompt = crud_profile.update_user_prompt(db, current_user_id, old_question, prompt_update)
    if not db_prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found or does not belong to user"
        )
    return UserPromptItem(question=db_prompt.prompt.text, answer=db_prompt.answer_text)


@router.delete("/me/prompts/{question}", response_model=SuccessResponse) # Using question as identifier
async def delete_my_user_prompt(
    question: str, # The question text of the prompt to delete
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a user prompt for the authenticated user"""
    
    success = crud_profile.delete_user_prompt(db, current_user_id, question)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found or does not belong to user"
        )
    return SuccessResponse(success=True, message="Prompt deleted successfully")


# --- Love Style Endpoints (Read-only for frontend) ---

@router.get("/me/love-style", response_model=LoveStyleResponse)
async def get_my_love_style(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get love style for the authenticated user (read-only from frontend)"""

    love_style = crud_profile.get_love_style(db, current_user_id)
    if not love_style:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Love style not found for this user"
        )
    return love_style


# --- Emergency Contacts Endpoints ---

@router.get("/me/emergency-contacts", response_model=List[EmergencyContactResponse])
async def get_my_emergency_contacts(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get all emergency contacts for the authenticated user"""
    contacts = crud_profile.get_emergency_contacts(db, current_user_id)
    return contacts


@router.post("/me/emergency-contacts", response_model=EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
async def add_my_emergency_contact(
    contact_in: EmergencyContactCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Add a new emergency contact for the authenticated user.
    Maximum 2 emergency contacts allowed per user.
    """
    logger.info(f"POST /me/emergency-contacts called for user {current_user_id}")
    logger.info(f"Request data: {contact_in.model_dump()}")
    try:
        contact = crud_profile.add_emergency_contact(db, current_user_id, contact_in)
        logger.info(f"Response: {contact}")
        return contact
    except ValueError as e:
        logger.error(f"Error adding contact: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/me/emergency-contact", response_model=EmergencyContactResponse)
async def upsert_my_emergency_contact(
    contact_in: EmergencyContactCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    Create or update the primary emergency contact for the authenticated user.
    If a contact exists, it updates the first one. Otherwise, creates a new one.
    Use this endpoint for single emergency contact management (e.g., Settings page).
    """
    print(f"\n=== PUT /me/emergency-contact called for user {current_user_id} ===")
    print(f"Request data: {contact_in.model_dump()}")
    contact = crud_profile.upsert_emergency_contact(db, current_user_id, contact_in)
    print(f"Response: contact_name={contact.contact_name}, contact_phone={contact.contact_phone}")
    print("=" * 60)
    return contact


@router.delete("/me/emergency-contacts/{contact_id}", response_model=SuccessResponse)
async def delete_my_emergency_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete an emergency contact for the authenticated user"""
    success = crud_profile.delete_emergency_contact(db, current_user_id, contact_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found or does not belong to user"
        )
    return SuccessResponse(success=True, message="Emergency contact deleted successfully")


# --- Verification Endpoint (Dev/Testing Only) ---

@router.put("/verify/{user_id}", response_model=SuccessResponse)
async def verify_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a user's profile as verified.

    NOTE: This is a simplified endpoint for development/testing purposes.
    In production, verification should go through a proper ID verification flow
    (e.g., document upload, facial recognition, manual review).
    """
    from app.models import Profile

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    profile.verified_status = "verified"
    db.commit()

    return SuccessResponse(success=True, message="User verified successfully")
