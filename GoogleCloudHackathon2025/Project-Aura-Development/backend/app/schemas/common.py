from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# Interest Schema
class InterestCreate(BaseModel):
    name: str


class InterestResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True


# Language Schema
class LanguageCreate(BaseModel):
    name: str


class LanguageResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True


# Prompt Schema
class PromptCreate(BaseModel):
    text: str


class PromptResponse(BaseModel):
    id: int
    text: str
    
    class Config:
        from_attributes = True


# User Prompt Schema
class UserPromptCreate(BaseModel):
    user_id: int
    prompt_id: int
    answer_text: str


class UserPromptResponse(BaseModel):
    user_id: int
    prompt_id: int
    answer_text: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Premium User Schema
class PremiumUserCreate(BaseModel):
    user_id: int
    end_date: datetime


class PremiumUserResponse(BaseModel):
    id: int
    user_id: int
    start_date: datetime
    end_date: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


# Generic Success Response
class SuccessResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None