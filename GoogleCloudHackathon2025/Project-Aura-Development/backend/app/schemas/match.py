from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import List, Optional, Dict

class ChatSessionCreate(BaseModel):
    liker_id: int
    liked_id: int

class PromptAnswer(BaseModel):
    question: str
    answer: str

class ProfileImageResponse(BaseModel):
    image_url: str

    class Config:
        from_attributes = True  # For Pydantic v2

# Define the model for a single interest item
class InterestResponseItem(BaseModel):
    name: str = Field(..., example="Reading")
    icon_url: Optional[str] = Field(None, alias='icon', example="/icons/reading.svg")
    
    # Allows Pydantic to read 'icon' attribute from the SQLAlchemy model
    class Config:
        populate_by_name = True

class ProfileResponse(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    full_name: str
    about_me: Optional[str] = None
    gender: Optional[str] = None
    # Add new fields for the names
    education_name: Optional[str] = None
    employment_name: Optional[str] = None
    industry_name: Optional[str] = None
    verified_status: str
    profile_visibility: str
    my_goal_name: Optional[str] = None
    come_from: Optional[str] = None
    relationship_status_name: Optional[str] = None # Added for RelationshipStatus name
    height_cm: Optional[int] = None
    zodiac: Optional[str] = None
    interested_in: Optional[str] = None
    profile_views: int
    created_at: datetime
    updated_at: datetime
    images: List[str] = []
    prompts: List[PromptAnswer] = []
    interests: List[InterestResponseItem]
    age: Optional[int]= None
    languages: Optional[List[str]] = None
    completion_rate: Optional[int] = None  # Profile completion percentage (0-100)

    class Config:
        from_attributes = True

# Like/Dislike Schemas
class LikeDislikeCreate(BaseModel):
    liker_id: int  # The user who is liking/disliking
    liked_user_id: int     # The user being liked/disliked
    status: str        # "like", "dislike", or "super_like"


class LikeDislikeResponse(BaseModel):
    id: int
    liker_id: int
    liked_user_id: int
    status: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# Match response (when both users like each other)
class MatchResponse(BaseModel):
    user1_id: int
    user2_id: int
    matched_at: datetime
    
    class Config:
        from_attributes = True