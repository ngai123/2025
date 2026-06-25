from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, date, timedelta, timezone # <--- MUST-HAVE: Import timezone for premium check

# --- User Schemas ---

# Base User Schema (shared fields)
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


# Schema for creating a new user (registration)
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=10)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v):
        if v is None:
            return v
        import re
        if not re.fullmatch(r"\+[1-9][0-9]{1,14}", v):
            raise ValueError("Phone must be E.164 format like +123456789")
        return v


# Schema for updating user info
class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=10)


# Schema for updating a user's premium status
class UserUpdatePremium(BaseModel):
    is_premium: bool


# Schema for user response (what API returns)
class UserResponse(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool
    is_verified: bool
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    profile_views: int
    is_premium: bool = False # <--- MUST-HAVE: Add is_premium field

    class Config:
        from_attributes = True  # Allows SQLAlchemy models to be converted

    # <--- MUST-HAVE: Add custom model_validate to calculate is_premium
    @classmethod
    def model_validate(cls, obj: any, **kwargs):
        if not hasattr(obj, '__tablename__'):
            return super().model_validate(obj, **kwargs)

        is_premium = False
        if obj.premium and obj.premium.is_active and obj.premium.end_date > datetime.now(timezone.utc):
            is_premium = True
        
        is_verified = False
        try:
            if getattr(obj, 'profile', None) is not None and getattr(obj.profile, 'verified_status', None) == 'verified':
                is_verified = True
        except Exception:
            is_verified = False
        
        # Create a dictionary with all fields, including the calculated is_premium
        data = {
            "id": obj.id,
            "full_name": obj.full_name,
            "email": obj.email,
            "created_at": obj.created_at,
            "last_login": obj.last_login,
            "is_active": obj.is_active,
            "is_verified": is_verified,
            "phone_number": obj.phone_number,
            "date_of_birth": obj.date_of_birth,
            "gender": obj.gender,
            "profile_views": obj.profile_views,
            "is_premium": is_premium # Include the calculated value
        }
        return cls(**data) # Explicitly construct the model from the dictionary


# Schema for login
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Schema for authentication response with token (used for login and registration)
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Schema for password change
class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters')
        return v

# from pydantic import BaseModel, EmailStr, Field, field_validator
# from typing import Optional
# from datetime import datetime, date


# # Base User Schema (shared fields)
# class UserBase(BaseModel):
#     username: str = Field(..., min_length=3, max_length=50)
#     email: EmailStr


# # Schema for creating a new user (registration)
# class UserCreate(UserBase):
#     password: str = Field(..., min_length=8, max_length=100)
#     phone_number: Optional[str] = Field(None, max_length=20)
#     country_code: Optional[str] = Field(None, max_length=5)
#     date_of_birth: Optional[date] = None
#     gender: Optional[str] = Field(None, max_length=10)
    
#     @field_validator('password')
#     @classmethod
#     def validate_password(cls, v):
#         if len(v) < 8:
#             raise ValueError('Password must be at least 8 characters')
#         return v


# # Schema for updating user info
# class UserUpdate(BaseModel):
#     username: Optional[str] = Field(None, min_length=3, max_length=50)
#     email: Optional[EmailStr] = None
#     phone_number: Optional[str] = Field(None, max_length=20)
#     country_code: Optional[str] = Field(None, max_length=5)
#     date_of_birth: Optional[date] = None
#     gender: Optional[str] = Field(None, max_length=10)


# # Schema for user response (what API returns)
# class UserResponse(UserBase):
#     id: int
#     created_at: datetime
#     last_login: Optional[datetime] = None
#     is_active: bool
#     is_verified: bool
#     phone_number: Optional[str] = None
#     country_code: Optional[str] = None
#     date_of_birth: Optional[date] = None
#     gender: Optional[str] = None
#     profile_views: int
    
#     class Config:
#         from_attributes = True  # Allows SQLAlchemy models to be converted


# # Schema for login
# class UserLogin(BaseModel):
#     email: EmailStr
#     password: str


# # Schema for password change
# class PasswordChange(BaseModel):
#     old_password: str
#     new_password: str = Field(..., min_length=8)
    
#     @field_validator('new_password')
#     @classmethod
#     def validate_new_password(cls, v):
#         if len(v) < 8:
#             raise ValueError('New password must be at least 8 characters')
#         return v