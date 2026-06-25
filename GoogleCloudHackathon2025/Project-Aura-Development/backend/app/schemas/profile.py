
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# Schema for a single Profile Picture
class ProfilePictureResponse(BaseModel):
    id: int
    image_url: str  # No max_length for signed URLs which can be very long (500+ chars)
    #category: str = Field(..., max_length=50) # e.g., 'main', 'bestSelfie', 'activity'
    category: Optional[str] = Field(None, max_length=50)
    upload_date: datetime

    class Config:
        from_attributes = True

# Schema for a single User Prompt (question + answer)
class UserPromptItem(BaseModel):
    question: str = Field(..., max_length=255) # The actual prompt text
    answer: str = Field(..., max_length=500) # The user's answer

    class Config:
        # Allow mapping from SQLAlchemy UserPrompt (which has prompt_id and answer_text)
        # and Prompt (for question text)
        from_attributes = True

# Schema for a single Love Style Trait
class LoveStyleTraitItem(BaseModel):
    trait: str = Field(..., max_length=50)

    class Config:
        from_attributes = True

# Schema for Love Style Personality (read-only from AI) for now , waiting for markues
class LoveStyleResponse(BaseModel):
    type: str = Field(..., max_length=10)
    archetype: str = Field(..., max_length=50)
    icon: str = Field(..., max_length=50)
    traits: List[LoveStyleTraitItem] # Use the nested schema for traits
    compatibility: int
    description: str = Field(..., max_length=1000)
    # No id, user_id, created_at, updated_at for the frontend display,
    # but they exist in the DB model. We can add them if needed for internal API.

    class Config:
        from_attributes = True

# Schema for creating Love Style (used by internal AI process)
class LoveStyleCreate(BaseModel): # Changed from LoveStyleBase to BaseModel as it includes user_id
    user_id: int
    type: str = Field(..., max_length=10)
    archetype: str = Field(..., max_length=50)
    icon: str = Field(..., max_length=50)
    traits: List[str] # For creation, it's simpler to just pass list of strings
    compatibility: int
    description: str = Field(..., max_length=1000)

# Schema for updating Love Style
class LoveStyleUpdate(BaseModel): # Changed from LoveStyleBase to BaseModel
    type: Optional[str] = Field(None, max_length=10)
    archetype: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)
    traits: Optional[List[str]] = None
    compatibility: Optional[int] = None
    description: Optional[str] = Field(None, max_length=1000)


# --- Main Profile Schemas ---

# Base Profile Schema for common fields (used for creation and update)
class ProfileBase(BaseModel):
    # From User model (if updating full_name via profile)
    full_name: Optional[str] = Field(None, max_length=100)

    # From Profile model
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    # REMOVED: dob field - date_of_birth is now only in User table
    # REMOVED: gender_id field - we removed this from Profile model
    education_id: Optional[str] = None # Maps to 'degree' in frontend
    employment_id: Optional[str] = None # Maps to 'work' in frontend
    industry_id: Optional[str] = None # Maps to 'industry' in frontend
    language_name: Optional[List[str]] = None   # Maps to 'speaking' in frontend (name, not ID)
    height_cm: Optional[int] = Field(None, ge=50, le=250) # Maps to 'height' in frontend (integer cm)
    zodiac: Optional[str] = Field(None, max_length=20)
    come_from: Optional[str] = Field(None, max_length=100) # Maps to 'comeFrom' in frontend
    about_me: Optional[str] = Field(None, max_length=1000) # Maps to 'aboutMe' in frontend

    # Many-to-many relationships (list of names/labels)
    interests: Optional[List[str]] = None # List of interest names

    # Relationship status (single FK, not many-to-many)
    relationship_status: Optional[str] = None # Single relationship status label

    # User Prompts
    user_prompts: Optional[List[UserPromptItem]] = None # List of user's chosen prompts and answers

    # Fields not directly editable by frontend but part of profile
    interested_in: Optional[str] = Field(None, max_length=255) # e.g., 'men', 'women', 'both'
    profile_visibility: Optional[str] = Field(None, max_length=20) # e.g., 'public', 'private'
    my_goal_id: Optional[str] = None # If this is an editable field, add to frontend


# Schema for creating a new profile (likely done during user registration)
class ProfileCreate(ProfileBase):
    user_id: int
    first_name: str = Field(..., max_length=50) # Required for creation
    last_name: str = Field(..., max_length=50)  # Required for creation
    # REMOVED: dob field - date_of_birth is stored in User table, not Profile table
    # Add other required fields for initial profile creation if any


# Schema for updating an existing profile
class ProfileUpdate(ProfileBase):
    # All fields are optional for update, as only changed fields are sent
    pass


# Schema for the full profile response (what the frontend GETs)
class ProfileFullResponse(ProfileBase):
    id: int
    user_id: int
    email: EmailStr # From User model
    is_active: bool # From User model
    is_verified: bool # From User model
    verified_status: str = Field(..., max_length=20) # From Profile model (e.g., 'pending', 'verified')
    date_of_birth: Optional[date] = None
    age: Optional[int] = None

    # All profile pictures (main and slots)
    profile_pictures: List[ProfilePictureResponse] = []

    # Love Style (read-only)
    love_style: Optional[LoveStyleResponse] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        # This allows Pydantic to read attributes directly from SQLAlchemy models
        # even if they are relationships or computed properties.
        # We'll need to ensure the SQLAlchemy query loads all necessary relationships.


# --- Schemas for specific actions (e.g., image upload) ---

# Schema for uploading a single profile picture
class ProfilePictureUpload(BaseModel):
    category: str = Field(..., max_length=50) # e.g., 'main', 'bestSelfie', 'activity'
    # The actual file will be handled by FastAPI's UploadFile in the route


# --- Other Schemas (from your original file, adjusted for consistency) ---

# Schema for emergency contact
class EmergencyContactCreate(BaseModel):
    contact_name: str = Field(..., max_length=100)
    contact_phone: str = Field(..., max_length=20)
    country_id: Optional[str] = None # Assuming this is a string code

class EmergencyContactResponse(EmergencyContactCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Schema for user preferences
class UserPreferencesCreate(BaseModel):
    min_age: int = Field(18, ge=18, le=99)
    max_age: int = Field(99, ge=18, le=99)
    prefers_verified_only: bool = False

class UserPreferencesUpdate(BaseModel):
    min_age: Optional[int] = Field(None, ge=18, le=99)
    max_age: Optional[int] = Field(None, ge=18, le=99)
    prefers_verified_only: Optional[bool] = None

class UserPreferencesResponse(UserPreferencesCreate):
    user_id: int

    class Config:
        from_attributes = True


# --- Schemas for Profile Analysis ---

class ProfileAnalysisCreate(BaseModel):
    answers: Dict[str, str]

class ProfileAnalysisResponse(BaseModel):
    user_id: int
    ori_voice_json: Optional[Any] = None
    characteristic_json: Optional[str] = None
    analysis_date: Optional[datetime] = None
    trait_scores: Optional[Dict[str, int]] = None  # Computed dynamically

    class Config:
        from_attributes = True


class PersonalityAnalysis(BaseModel):
    personality: str
