"""
File: compatibility.py
Description: Pydantic schemas for profile compatibility analysis.
"""

from pydantic import BaseModel
from typing import List, Optional


class CompatibilityRequest(BaseModel):
    """Request schema for compatibility analysis."""
    current_user_id: int
    target_user_id: int


class CompatibilityResponse(BaseModel):
    """Response schema for compatibility analysis."""
    summary: str  # AI-generated summary (2-3 sentences)
    shared_interests: List[str]  # List of matching interest names
    compatibility_highlights: List[str]  # Key compatibility points
    same_goal: bool = False  # Whether both users have the same relationship goal

    class Config:
        from_attributes = True
