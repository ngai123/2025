from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

# --- INPUT SCHEMAS ---

# 1. Defines the complex data structure for the 'filter_by' field
class FilterByData(BaseModel):
    """Schema for the complex filter data stored as JSON in filter_by column."""
    from_age: int = Field(default=18, description="Minimum age preference.")
    to_age: int = Field(default=99, description="Maximum age preference.")
    distance: Optional[int] = Field(default=50, description="Maximum distance in kilometers/miles.")
    gender: Optional[str] = Field(default=None, description="Preferred gender for filtering (e.g., 'male', 'female', 'other').")
    relationship_all: Optional[bool] = Field(default=False, description="Whether to include all relationship statuses.")
    relationship_statuses: Optional[List[str]] = Field(default=None, description="List of allowed relationship status keys.")
    
    # Allows additional custom fields to be included in the JSON if needed
    class Config:
        extra = "allow" 

# 2. Defines the complete input structure for the POST request
class UserPreferenceCreate(BaseModel):
    """Schema for creating or updating user preferences."""
    user_id: int
    # We still allow the client to set the core age fields directly in the request
    min_age: Optional[int] = 18
    max_age: Optional[int] = 99
    prefers_verified_only: Optional[bool] = False
    
    # This field holds the complex, structured data
    filter_by: FilterByData


# --- OUTPUT SCHEMAS ---

# 3. Defines the response structure when preferences are retrieved or created
class UserPreferenceResponse(BaseModel):
    """Schema for returning user preference data."""
    user_id: int
    min_age: int
    max_age: int
    prefers_verified_only: bool
    
    # The API deserializes the stored JSON string back into a dictionary for the client
    filter_by: Dict[str, Any]
    
    class Config:
        # Enables conversion from SQLAlchemy models (e.g., preference.__dict__)
        from_attributes = True
