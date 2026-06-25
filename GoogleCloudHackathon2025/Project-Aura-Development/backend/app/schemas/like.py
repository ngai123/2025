# Project-Aura-Development/backend/schemas.py
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, date, timedelta, timezone

# --- User Schemas ---
# (No changes here)
class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)
    email: EmailStr
    date_of_birth: date
    gender: str = Field(..., max_length=10)
    phone_number: Optional[str] = None
    country_code: Optional[str] = None

class UserUpdatePremium(BaseModel):
    is_premium: bool

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    phone_number: Optional[str] = None
    country_code: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    profile_views: int

    class Config:
        from_attributes = True

# --- Profile Display Schema (for frontend, combining User, Profile, PremiumUser data) ---
class ProfileDisplay(BaseModel):
    id: int # User ID
    nickname: str # Maps to User.full_name or Profile.first_name
    age: Optional[int] = None # Calculated from User.date_of_birth
    profile_picture_url: Optional[str] = None # From User.profile_pictures
    verified: bool # Maps to User.is_verified
    is_premium: bool = False # Derived from User.premium relationship

    class Config:
        # <--- MUST-HAVE FIX: REMOVE from_attributes = True
        # from_attributes = True # Pydantic v2 (or orm_mode = True for Pydantic v1)
        pass # Keep this empty or remove if no other config is needed

    @classmethod
    def model_validate(cls, obj: any, **kwargs):
        # Ensure obj is an ORM model instance (e.g., models.User)
        if not hasattr(obj, '__tablename__'):
            # If it's not an ORM object, let default validation handle it
            return super().model_validate(obj, **kwargs)

        # Calculate age from User.date_of_birth
        age = None
        if obj.date_of_birth:
            today = datetime.now().date()
            age = today.year - obj.date_of_birth.year - ((today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day))

        # Determine premium status from User.premium relationship
        is_premium = False
        if obj.premium and obj.premium.is_active and obj.premium.end_date > datetime.now(timezone.utc):
            is_premium = True

        # Get profile picture URL from the ProfilePicture relationship
        profile_pic_url = None
        if obj.profile_pictures and len(obj.profile_pictures) > 0:
            profile_pic_url = obj.profile_pictures[0].image_url

        # Construct a dictionary that matches the schema fields
        data = {
            "id": obj.id,
            "nickname": obj.full_name, # Mapping User.full_name to frontend's 'nickname'
            "verified": obj.is_verified, # Mapping User.is_verified to frontend's 'verified'
            "profile_picture_url": profile_pic_url,
            "is_premium": is_premium,
            "age": age
        }
        # <--- MUST-HAVE FIX: Call the constructor directly with the prepared dictionary
        # This bypasses the automatic attribute mapping and uses the explicit dictionary.
        return cls(**data) # Use cls(**data) instead of super().model_validate(data, **kwargs)

# --- Like Schemas ---
# (No changes here)
class LikeCreate(BaseModel):
    liked_id: int

class LikeResponse(BaseModel):
    id: int
    liker_id: int
    liked_id: int
    status: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
# # Project-Aura-Development/backend/schemas.py
# from pydantic import BaseModel, Field, EmailStr # Added EmailStr
# from typing import Optional, List
# from datetime import datetime, date, timedelta # Added date, timedelta

# # --- User Schemas ---

# # Pydantic model for creating a new user (frontend input)
# # This schema aligns with the fields available in your User model for account creation.
# class UserCreate(BaseModel):
#     username: str = Field(..., min_length=2, max_length=50)
#     password: str = Field(..., min_length=8) # Password for creation
#     email: EmailStr
#     date_of_birth: date # For age calculation
#     gender: str = Field(..., max_length=10)
#     # profile_image_url: Optional[str] = Field(None, pattern=r"^https?://.*") # This would be for ProfileCreate

# # Pydantic model for updating a user's premium status
# class UserUpdatePremium(BaseModel):
#     is_premium: bool

# # Pydantic model for a user response (what backend sends back after creation/fetch)
# class UserResponse(BaseModel):
#     id: int
#     username: str
#     email: EmailStr
#     is_active: bool
#     is_verified: bool
#     created_at: datetime
#     last_login: Optional[datetime] = None
#     phone_number: Optional[str] = None
#     country_code: Optional[str] = None
#     date_of_birth: Optional[date] = None
#     gender: Optional[str] = None
#     profile_views: int

#     class Config:
#         from_attributes = True # Pydantic v2 (or orm_mode = True for Pydantic v1)

# # --- Profile Display Schema (for frontend, combining User, Profile, PremiumUser data) ---
# # This schema is designed to provide the data structure expected by your frontend.
# class ProfileDisplay(BaseModel):
#     id: int # User ID
#     nickname: str # Maps to User.username
#     age: Optional[int] = None # Calculated from User.date_of_birth
#     profile_picture_url: Optional[str] = None # From User.profile.profile_picture_url
#     verified: bool # Maps to User.is_verified
#     is_premium: bool = False # Derived from User.premium relationship

#     class Config:
#         from_attributes = True # Pydantic v2 (or orm_mode = True for Pydantic v1)

#         # This method allows custom logic for populating fields from ORM objects.
#         # It's crucial for fields that aren't directly on the User model
#         # or require calculation (like age, or accessing related models).
#         @classmethod
#         def model_validate(cls, obj: any, **kwargs):
#             # Ensure obj is an ORM model instance (e.g., models.User)
#             if not hasattr(obj, '__tablename__'):
#                 return super().model_validate(obj, **kwargs)

#             # Calculate age from User.date_of_birth
#             age = None
#             if obj.date_of_birth:
#                 today = datetime.now().date()
#                 age = today.year - obj.date_of_birth.year - ((today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day))

#             # Determine premium status from User.premium relationship
#             # NOTE: Your models.py has User.premium as uselist=True, meaning it's a list.
#             # We'll assume we're looking for *any* active premium subscription.
#             is_premium = False
#             if obj.premium:
#                 for premium_sub in obj.premium:
#                     if premium_sub.is_active and premium_sub.end_date > datetime.now():
#                         is_premium = True
#                         break # Found an active one, no need to check others

#             # Construct a dictionary that matches the schema fields
#             data = {
#                 "id": obj.id,
#                 "nickname": obj.username, # Mapping User.username to frontend's 'nickname'
#                 "verified": obj.is_verified, # Mapping User.is_verified to frontend's 'verified'
#                 "profile_picture_url": obj.profile.profile_picture_url if obj.profile else None,
#                 "is_premium": is_premium,
#                 "age": age
#             }
#             return super().model_validate(data, **kwargs)

# # --- Like Schemas ---

# # Pydantic model for creating a new like
# class LikeCreate(BaseModel):
#     liked_id: int # The ID of the user being liked (maps to l_user_id in model)

# # Pydantic model for a like response
# class LikeResponse(BaseModel):
#     id: int # The ID of the LikeDislike record itself
#     liker_id: int # Maps to LikeDislike.like_user_id
#     liked_id: int # Maps to LikeDislike.l_user_id
#     status: Optional[str] = None
#     timestamp: datetime

#     class Config:
#         from_attributes = True # Pydantic v2 (or orm_mode = True for Pydantic v1)
#         # Custom field mapping for Pydantic v2 (if needed, otherwise from_attributes handles it)
#         # For Pydantic v1, you'd use Field(alias="...")
#         # For v2, model_validate is generally more robust for complex mappings.
#         # If the model fields are like_user_id and l_user_id, and schema expects liker_id and liked_id,
#         # you'd typically handle this in the router or CRUD layer, or with Field(alias="...").
#         # For now, we'll assume the router/CRUD will pass the correct values to these schema fields.
