# app/crud/profile.py
from sqlalchemy.orm import Session, joinedload, selectinload # Removed Load, as it was causing issues
from sqlalchemy import and_
from app.models import (
    User, Profile, ProfilePicture, EmergencyContact, UserPreferences,
    ProfileInterest, UserPrompt, LoveStyle, LoveStyleTrait,
    Language, Prompt, Interest, ProfileLanguage,   # Added Language and Prompt models
    RelationshipStatus, # For relationship status lookups
    Education, Employment, Industry, Goal
)
from app.schemas.profile import (
    ProfileCreate, ProfileUpdate, ProfileFullResponse, # Using revised schemas
    ProfilePictureUpload, # For image uploads
    EmergencyContactCreate,
    UserPreferencesUpdate,
    UserPromptItem, # Using the item schema for prompts
    LoveStyleCreate, LoveStyleUpdate, LoveStyleResponse # Using revised schemas
)
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status # For better error handling
import logging

logger = logging.getLogger(__name__)

# --- Helper Functions ---
def _get_language_id_from_name(db: Session, language_name: str) -> Optional[int]:
    """Helper to get language ID from name."""
    language = db.query(Language).filter(Language.name == language_name).first()
    return language.id if language else None

def _get_language_name_from_id(db: Session, language_id: int) -> Optional[str]:
    """Helper to get language name from ID."""
    language = db.query(Language).filter(Language.id == language_id).first()
    return language.name if language else None

def _get_prompt_id_from_question(db: Session, question: str) -> Optional[int]:
    """Helper to get prompt ID from question text."""
    prompt = db.query(Prompt).filter(Prompt.text == question).first()
    return prompt.id if prompt else None

def _get_question_from_prompt_id(db: Session, prompt_id: int) -> Optional[str]:
    """Helper to get question text from prompt ID."""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    return prompt.text if prompt else None

# --- Profile CRUD ---

def get_profile_by_user_id(db: Session, user_id: int) -> Optional[Profile]:
    """
    Fetches the user's profile along with all related data needed for ProfileFullResponse.
    """
    profile = db.query(Profile).filter(Profile.user_id == user_id).options(
        # Load Profile.user and its nested relationships
        selectinload(Profile.user).selectinload(User.profile_pictures),
        selectinload(Profile.user).selectinload(User.user_prompts).joinedload(UserPrompt.prompt),
        selectinload(Profile.user).selectinload(User.love_style).selectinload(LoveStyle.traits),

        # These are direct relationships of Profile
        selectinload(Profile.interests).joinedload(ProfileInterest.interest), # Eager load Interest details
        selectinload(Profile.relationship_status), # FK relationship, not many-to-many
        selectinload(Profile.languages_selected).joinedload(ProfileLanguage.language), # <--- NEW: Eager load selected languages
         # ✅ NEW: Eager load lookup tables for names
        selectinload(Profile.education),
        selectinload(Profile.employment),
        selectinload(Profile.industry),
        selectinload(Profile.my_goal),
    ).first()
    return profile

def create_profile(db: Session, user_id: int, profile_in: ProfileCreate) -> Profile:
    """
    Creates a new profile for a user.
    Note: This assumes the User object already exists.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Handle height conversion
    height_cm = profile_in.height_cm

    profile_data = profile_in.model_dump(exclude_unset=True, exclude={
        "full_name", "interests", "relationship_statuses", "user_prompts", "language_name", "height_cm"
    })
    profile_data["user_id"] = user_id
    profile_data["height_cm"] = height_cm

    db_profile = Profile(**profile_data)
    db.add(db_profile)
    db.flush() # Flush to get db_profile.id before committing

    # Handle interests (NEW LOGIC)
    if profile_in.interests:
        new_profile_interests = []
        for interest_name in profile_in.interests:
            db_interest = db.query(Interest).filter(Interest.name == interest_name).first()
            if db_interest:
                new_profile_interests.append(
                    ProfileInterest(profile_id=db_profile.id, interest_id=db_interest.id) # <--- Use interest_id
                )
            else:
                # Option 1: Log a warning and skip
                logger.warning(f"Interest name '{interest_name}' not found in master list, skipping for user {user_id}.")
                # Option 2: Raise an error if all interests must be valid
                # raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid interest '{interest_name}' provided.")
        db.add_all(new_profile_interests)

    # REMOVED: relationship_statuses handling - now using Profile.relationship_id FK
    # The relationship status is set via profile_in.relationship_id in the profile_data dict

    # Handle user prompts (remains the same)
    if profile_in.user_prompts:
        for prompt_item in profile_in.user_prompts:
            prompt_id = _get_prompt_id_from_question(db, prompt_item.question)
            if prompt_id:
                db.add(UserPrompt(user_id=user_id, prompt_id=prompt_id, answer_text=prompt_item.answer))
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Prompt question '{prompt_item.question}' not found.")


    # NEW: Handle multi-select languages
    if profile_in.language_name: # profile_in.language_name is now List[str]
        new_profile_languages = []
        for lang_name in profile_in.language_name:
            db_language = db.query(Language).filter(Language.name == lang_name).first()
            if db_language:
                new_profile_languages.append(
                    ProfileLanguage(profile_id=db_profile.id, language_id=db_language.id)
                )
            else:
                logger.warning(f"Language '{lang_name}' not found in master list, skipping for user {user_id}.")
        db.add_all(new_profile_languages)

    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_profile(db: Session, user_id: int, profile_update: ProfileUpdate) -> Optional[Profile]:
    """
    Updates an existing profile for a user.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not db_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found for this user")

    # Handle full_name update (if provided, it updates the User model)
    if profile_update.full_name is not None:
        db_user.full_name = profile_update.full_name

        # Also update Profile first_name and last_name by splitting full_name
        name_parts = profile_update.full_name.strip().split(maxsplit=1)
        db_profile.first_name = name_parts[0] if name_parts else "User"
        db_profile.last_name = name_parts[1] if len(name_parts) > 1 else ""

    # Prepare data for Profile model update
    update_data = profile_update.model_dump(exclude_unset=True, exclude={
        "full_name",             # Handled separately for User model
        "interests",             # Handled separately (many-to-many)
        "relationship_status",   # Handled separately (name to ID conversion)
        "user_prompts",          # Handled separately (many-to-many)
        "language_name",         # Handled separately (many-to-many)
        "education_id",          # ✅ NEW: Handled separately (name to ID conversion)
        "employment_id",         # ✅ NEW: Handled separately (name to ID conversion)
        "industry_id",           # ✅ NEW: Handled separately (name to ID conversion)
        "my_goal_id",            # ✅ NEW: Handled separately (name to ID conversion)
        # All other fields like height_cm, zodiac, come_from, about_me,
        # education_id, employment_id, industry_id, my_goal_id are direct columns
        # and can be updated via the generic setattr loop below.
    })

    print(f"DEBUG: update_data for direct setattr: {update_data}") # <--- ADD THIS DEBUG LINE


    # Handle height conversion (remains the same)
    if "height_cm" in profile_update.model_fields_set:
        update_data["height_cm"] = profile_update.height_cm


    # Update Profile fields
    for field, value in update_data.items():
        print(f"DEBUG: Attempting to setattr db_profile.{field} = {value}") # <--- ADD THIS DEBUG LINE
        setattr(db_profile, field, value)

    # NEW: Handle multi-select languages
    if profile_update.language_name is not None: # Check if language_name was explicitly provided (even if empty list)
        # Delete all existing ProfileLanguage records for this profile
        db.query(ProfileLanguage).filter(ProfileLanguage.profile_id == db_profile.id).delete()

        if profile_update.language_name: # If the list is not empty
            new_profile_languages = []
            for lang_name in profile_update.language_name:
                db_language = db.query(Language).filter(Language.name == lang_name).first()
                if db_language:
                    new_profile_languages.append(
                        ProfileLanguage(profile_id=db_profile.id, language_id=db_language.id)
                    )
                else:
                    logger.warning(f"Language '{lang_name}' not found in master list, skipping for user {user_id}.")
            db.add_all(new_profile_languages)

    # Handle interests (NEW LOGIC)
    if profile_update.interests is not None: # Check if interests was explicitly provided (even if empty list)
        # Delete all existing ProfileInterest records for this profile
        db.query(ProfileInterest).filter(ProfileInterest.profile_id == db_profile.id).delete()

        if profile_update.interests:
            new_profile_interests = []
            for interest_name in profile_update.interests:
                db_interest = db.query(Interest).filter(Interest.name == interest_name).first()
                if db_interest:
                    new_profile_interests.append(
                        ProfileInterest(profile_id=db_profile.id, interest_id=db_interest.id) # <--- Use interest_id
                    )
                else:
                    logger.warning(f"Interest name '{interest_name}' not found in master list, skipping for user {user_id}.")
            db.add_all(new_profile_interests)

    # ✅ CRITICAL FIX: Handle relationship status (convert name to ID and set FK)
    if profile_update.relationship_status is not None:
        if profile_update.relationship_status:  # If a status name is provided
            db_relationship = db.query(RelationshipStatus).filter(
                RelationshipStatus.name == profile_update.relationship_status
            ).first()
            if db_relationship:
                db_profile.relationship_id = db_relationship.id # Set the foreign key ID
            else:
                # Log a warning or raise an error if the provided status name is invalid
                logger.warning(f"Relationship status '{profile_update.relationship_status}' not found in master list for user {user_id}.")
                # raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid relationship status: {profile_update.relationship_status}")
        else:
            db_profile.relationship_id = None # Clear the relationship if an empty string is sent

    # Handle user prompts (remains the same)
    if profile_update.user_prompts is not None:
        db.query(UserPrompt).filter(UserPrompt.user_id == user_id).delete()
        if profile_update.user_prompts:
            for prompt_item in profile_update.user_prompts:
                prompt_id = _get_prompt_id_from_question(db, prompt_item.question)
                if prompt_id:
                    db.add(UserPrompt(user_id=user_id, prompt_id=prompt_id, answer_text=prompt_item.answer))
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Prompt question '{prompt_item.question}' not found.")


    # ✅ NEW: Handle Education (name to ID conversion)
        if profile_update.education_id is not None:
            if profile_update.education_id: # If a name is provided
                db_education = db.query(Education).filter(Education.name == profile_update.education_id).first()
                if db_education:
                    db_profile.education_id = db_education.id
                else:
                    logger.warning(f"Education '{profile_update.education_id}' not found in master list for user {user_id}.")
                    # Optionally, raise HTTPException here for strict validation
            else:
                db_profile.education_id = None # Clear the field if an empty string is sent

        # ✅ NEW: Handle Employment (name to ID conversion)
        if profile_update.employment_id is not None:
            if profile_update.employment_id:
                db_employment = db.query(Employment).filter(Employment.name == profile_update.employment_id).first()
                if db_employment:
                    db_profile.employment_id = db_employment.id
                else:
                    logger.warning(f"Employment '{profile_update.employment_id}' not found in master list for user {user_id}.")
            else:
                db_profile.employment_id = None

        # ✅ NEW: Handle Industry (name to ID conversion)
        if profile_update.industry_id is not None:
            if profile_update.industry_id:
                db_industry = db.query(Industry).filter(Industry.name == profile_update.industry_id).first()
                if db_industry:
                    db_profile.industry_id = db_industry.id
                else:
                    logger.warning(f"Industry '{profile_update.industry_id}' not found in master list for user {user_id}.")
            else:
                db_profile.industry_id = None

        # ✅ NEW: Handle My Goal (name to ID conversion)
        if profile_update.my_goal_id is not None:
            if profile_update.my_goal_id:
                db_goal = db.query(Goal).filter(Goal.name == profile_update.my_goal_id).first()
                if db_goal:
                    db_profile.my_goal_id = db_goal.id
                else:
                    logger.warning(f"My Goal '{profile_update.my_goal_id}' not found in master list for user {user_id}.")
            else:
                db_profile.my_goal_id = None
    db.commit()
    db.refresh(db_user) # Refresh user in case full_name was updated
    db.refresh(db_profile)
    return db_profile

# --- Profile Picture CRUD ---

def get_profile_pictures(db: Session, user_id: int) -> List[ProfilePicture]:
    """Fetches all profile pictures for a user."""
    return db.query(ProfilePicture).filter(ProfilePicture.user_id == user_id).order_by(ProfilePicture.category, ProfilePicture.upload_date).all()

def add_profile_picture(db: Session, user_id: int, image_url: str, category: str) -> ProfilePicture:
    """
    Adds a new profile picture for a user.
    If category is 'profile', it replaces any existing 'profile' picture.
    """
    # If it's a 'profile' picture, delete any existing 'profile' picture first
    if category == 'profile':
        existing_main_pic = db.query(ProfilePicture).filter(
            ProfilePicture.user_id == user_id,
            ProfilePicture.category == 'profile'
        ).first()
        if existing_main_pic:
            # In a real app, you'd also delete the file from GCS here
            db.delete(existing_main_pic)
            db.flush() # Ensure deletion before adding new one

    db_picture = ProfilePicture(user_id=user_id, image_url=image_url, category=category)
    db.add(db_picture)
    db.commit()
    db.refresh(db_picture)
    return db_picture

def delete_profile_picture(db: Session, user_id: int, picture_id: int) -> bool:
    """
    Deletes a specific profile picture for a user.
    Ensures the picture belongs to the user.
    """
    db_picture = db.query(ProfilePicture).filter(
        ProfilePicture.id == picture_id,
        ProfilePicture.user_id == user_id
    ).first()
    if not db_picture:
        return False # Or raise HTTPException(404, "Picture not found or does not belong to user")

    # In a real app, you'd also delete the file from GCS here
    db.delete(db_picture)
    db.commit()
    return True

# --- Emergency Contact CRUD (No major changes needed based on current schemas) ---

def get_emergency_contacts(db: Session, user_id: int) -> List[EmergencyContact]:
    return db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).all()

def add_emergency_contact(db: Session, user_id: int, contact_in: EmergencyContactCreate) -> EmergencyContact:
    # Check if user already has 2 contacts (maximum allowed)
    contact_count = db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).count()
    if contact_count >= 2:
        raise ValueError("Maximum 2 emergency contacts allowed per user")

    db_contact = EmergencyContact(**contact_in.model_dump(), user_id=user_id)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

def delete_emergency_contact(db: Session, user_id: int, contact_id: int) -> bool:
    db_contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.user_id == user_id
    ).first()
    if not db_contact:
        return False
    db.delete(db_contact)
    db.commit()
    return True

def upsert_emergency_contact(db: Session, user_id: int, contact_in: EmergencyContactCreate) -> EmergencyContact:
    """
    Create or update the primary emergency contact for a user.
    If a contact already exists, updates the first one. Otherwise, creates a new one.
    This is designed for single emergency contact scenarios (like SettingsPage).
    """
    # Get first existing contact
    existing_contact = db.query(EmergencyContact).filter(
        EmergencyContact.user_id == user_id
    ).first()

    if existing_contact:
        # Update existing contact
        print(f"\n>>> CRUD: Updating emergency contact for user {user_id}")
        print(f">>> Old values - Name: {existing_contact.contact_name}, Phone: {existing_contact.contact_phone}")
        print(f">>> New values - Name: {contact_in.contact_name}, Phone: {contact_in.contact_phone}")

        existing_contact.contact_name = contact_in.contact_name
        existing_contact.contact_phone = contact_in.contact_phone
        if hasattr(contact_in, 'country_id') and contact_in.country_id:
            existing_contact.country_id = contact_in.country_id
        db.commit()
        db.refresh(existing_contact)

        print(f">>> After update - Name: {existing_contact.contact_name}, Phone: {existing_contact.contact_phone}")
        return existing_contact
    else:
        # Create new contact
        print(f"\n>>> CRUD: Creating new emergency contact for user {user_id}")
        print(f">>> Name: {contact_in.contact_name}, Phone: {contact_in.contact_phone}")
        return add_emergency_contact(db, user_id, contact_in)

# --- User Preferences CRUD (Uncommented and adjusted) ---

def get_user_preferences(db: Session, user_id: int) -> Optional[UserPreferences]:
    return db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()

def update_user_preferences(db: Session, user_id: int, prefs_update: UserPreferencesUpdate) -> Optional[UserPreferences]:
    db_prefs = get_user_preferences(db, user_id)
    if not db_prefs:
        # If preferences don't exist, create them (common pattern)
        db_prefs = UserPreferences(user_id=user_id, **prefs_update.model_dump(exclude_unset=True))
        db.add(db_prefs)
    else:
        update_data = prefs_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_prefs, field, value)
    db.commit()
    db.refresh(db_prefs)
    return db_prefs

# --- User Prompts CRUD operations ---

# Note: UserPrompt has a composite primary key (user_id, prompt_id), not a single 'id'
def get_user_prompts(db: Session, user_id: int) -> List[UserPrompt]:
    """Fetches all user prompts for a given user, eager loading the prompt question."""
    return db.query(UserPrompt).filter(UserPrompt.user_id == user_id).options(
        joinedload(UserPrompt.prompt)
    ).all()

def get_user_prompt_by_question(db: Session, user_id: int, question: str) -> Optional[UserPrompt]:
    """Fetches a specific user prompt by user_id and question text."""
    prompt_id = _get_prompt_id_from_question(db, question)
    if not prompt_id:
        return None
    return db.query(UserPrompt).filter(
        UserPrompt.user_id == user_id,
        UserPrompt.prompt_id == prompt_id
    ).options(joinedload(UserPrompt.prompt)).first()

def create_user_prompt(db: Session, user_id: int, prompt_in: UserPromptItem) -> UserPrompt:
    """Creates a new user prompt."""
    prompt_id = _get_prompt_id_from_question(db, prompt_in.question)
    if not prompt_id:
        raise HTTPException(status_code=404, detail=f"Prompt question '{prompt_in.question}' not found.")

    # Check if prompt already exists for this user
    existing_prompt = db.query(UserPrompt).filter(
        UserPrompt.user_id == user_id,
        UserPrompt.prompt_id == prompt_id
    ).first()
    if existing_prompt:
        raise HTTPException(status_code=409, detail="User already has this prompt.")

    db_prompt = UserPrompt(user_id=user_id, prompt_id=prompt_id, answer_text=prompt_in.answer)
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    return db_prompt

def update_user_prompt(db: Session, user_id: int, old_question: str, prompt_update: UserPromptItem) -> Optional[UserPrompt]:
    """
    Updates an existing user prompt.
    Requires the old question to identify the prompt, and the new question/answer for update.
    """
    old_prompt_id = _get_prompt_id_from_question(db, old_question)
    if not old_prompt_id:
        raise HTTPException(status_code=404, detail=f"Original prompt question '{old_question}' not found.")

    db_prompt = db.query(UserPrompt).filter(
        UserPrompt.user_id == user_id,
        UserPrompt.prompt_id == old_prompt_id
    ).first()
    if not db_prompt:
        return None # Or raise HTTPException(404, "User prompt not found or does not belong to user")

    new_prompt_id = _get_prompt_id_from_question(db, prompt_update.question)
    if not new_prompt_id:
        raise HTTPException(status_code=404, detail=f"New prompt question '{prompt_update.question}' not found.")

    # If the question itself is changing, we need to delete the old and create a new one
    if old_prompt_id != new_prompt_id:
        # Check if the new prompt already exists for this user
        existing_new_prompt = db.query(UserPrompt).filter(
            UserPrompt.user_id == user_id,
            UserPrompt.prompt_id == new_prompt_id
        ).first()
        if existing_new_prompt:
            raise HTTPException(status_code=409, detail="User already has the new prompt question.")

        db.delete(db_prompt) # Delete old prompt entry
        db_prompt = UserPrompt(user_id=user_id, prompt_id=new_prompt_id, answer_text=prompt_update.answer)
        db.add(db_prompt)
    else:
        # Only answer text is changing
        db_prompt.answer_text = prompt_update.answer

    db.commit()
    db.refresh(db_prompt)
    return db_prompt

def delete_user_prompt(db: Session, user_id: int, question: str) -> bool:
    """Deletes a specific user prompt by user_id and question text."""
    prompt_id = _get_prompt_id_from_question(db, question)
    if not prompt_id:
        return False # Or raise HTTPException(404, "Prompt question not found")

    db_prompt = db.query(UserPrompt).filter(
        UserPrompt.user_id == user_id,
        UserPrompt.prompt_id == prompt_id
    ).first()
    if not db_prompt:
        return False
    db.delete(db_prompt)
    db.commit()
    return True

# --- Love Style CRUD operations (Read-only for frontend, but CRUD for AI/admin) ---

def get_love_style(db: Session, user_id: int) -> Optional[LoveStyle]:
    """Fetches the love style for a user, eager loading its traits."""
    return db.query(LoveStyle).filter(LoveStyle.user_id == user_id).options(
        selectinload(LoveStyle.traits)
    ).first()

def create_love_style(db: Session, user_id: int, love_style_in: LoveStyleCreate) -> LoveStyle:
    """
    Creates a new love style for a user.
    Assumes this is called by an internal process (e.g., AI generation).
    """
    # Check if love style already exists
    existing_love_style = db.query(LoveStyle).filter(LoveStyle.user_id == user_id).first()
    if existing_love_style:
        raise HTTPException(status_code=409, detail="Love style already exists for this user. Use update instead.")

    love_style_data = love_style_in.model_dump(exclude={"traits"})
    db_love_style = LoveStyle(**love_style_data, user_id=user_id)
    db.add(db_love_style)
    db.flush() # Flush to get db_love_style.id

    if love_style_in.traits:
        db.add_all([
            LoveStyleTrait(love_style_id=db_love_style.id, trait=trait_item.trait)
            for trait_item in love_style_in.traits # Assuming traits is List[LoveStyleTraitItem]
        ])

    db.commit()
    db.refresh(db_love_style)
    return db_love_style

def update_love_style(db: Session, user_id: int, love_style_update: LoveStyleUpdate) -> Optional[LoveStyle]:
    """
    Updates an existing love style for a user.
    Assumes this is called by an internal process (e.g., AI regeneration).
    """
    db_love_style = get_love_style(db, user_id)
    if not db_love_style:
        return None # Or raise HTTPException(404, "Love style not found for user")

    update_data = love_style_update.model_dump(exclude_unset=True, exclude={"traits"})
    for field, value in update_data.items():
        setattr(db_love_style, field, value)

    if love_style_update.traits is not None:
        # Delete existing traits
        db.query(LoveStyleTrait).filter(LoveStyleTrait.love_style_id == db_love_style.id).delete()
        if love_style_update.traits:
            db.add_all([
                LoveStyleTrait(love_style_id=db_love_style.id, trait=trait_item.trait)
                for trait_item in love_style_update.traits
            ])

    db.commit()
    db.refresh(db_love_style)
    return db_love_style
