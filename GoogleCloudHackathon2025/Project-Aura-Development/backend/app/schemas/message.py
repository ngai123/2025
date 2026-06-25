from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Chat Session Schemas
class ChatSessionCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)


class ChatSessionResponse(BaseModel):
    id: int
    created_at: datetime
    last_message_at: datetime
    status: str
    title: Optional[str] = None
    message_count: int
    
    class Config:
        from_attributes = True


# Chat Participant Schemas
class ChatParticipantCreate(BaseModel):
    session_id: int
    user_id: int
    role: str = Field("MEMBER", max_length=20)


class ChatParticipantResponse(BaseModel):
    session_id: int
    user_id: int
    joined_at: datetime
    left_at: Optional[datetime] = None
    blocked: bool
    role: str
    notification_settings: str
    last_read_message_id: Optional[int] = None
    
    class Config:
        from_attributes = True


# Message Schemas
class MessageCreate(BaseModel):
    chat_session_id: int
    sender_id: int
    content: Optional[str] = None
    message_type: str = Field("TEXT", max_length=20)


class MessageUpdate(BaseModel):
    content: Optional[str] = None


class MessageResponse(BaseModel):
    id: int
    chat_session_id: int
    sender_id: int
    content: Optional[str] = None
    timestamp: datetime
    message_type: str
    deleted_at: Optional[datetime] = None

    deleted_by_user_id: Optional[int] = None
    edited_at: Optional[datetime] = None
    original_content: Optional[str] = None
    
    class Config:
        from_attributes = True


# Message Attachment Schemas
class MessageAttachmentCreate(BaseModel):
    message_id: int
    attachment_type: str = Field(..., max_length=20)
    url: str
    thumbnail_url: Optional[str] = None
    blob_path: Optional[str] = None  # GSC blob path


class MessageAttachmentResponse(BaseModel):
    id: int
    message_id: int
    attachment_type: str
    url: str
    thumbnail_url: Optional[str] = None
    blob_path: Optional[str] = None  # GSC blob path
    
    class Config:
        from_attributes = True

  # ============= NEW SCHEMAS FOR ENRICHED CHAT DATA =============

class EnrichedChatItem(BaseModel):
    """Schema for chat list item with user details"""
    id: int
    name: str
    avatar: Optional[str] = None
    message: str
    time: str
    lastMessageAt: Optional[str] = None
    unread: int
    isVerified: bool
    isBlocked: bool
    isUnmatched: bool
    userId: int
    sessionId: int


class ChatMessageItem(BaseModel):
    """Schema for individual chat message"""
    id: int
    text: str
    time: str
    type: str  # "sent" or "received"
    sender_id: int
    timestamp: str
    attachments: List[dict] = []
    # ✨ NEW: Deletion metadata
    deleted: bool = False
    deleted_at: Optional[str] = None
    deleted_by_user_id: Optional[int] = None
    deleted_by_me: bool = False
    # ✨ NEW: Edit metadata
    edited: bool = False
    edited_at: Optional[str] = None
    original_content: Optional[str] = None
    # ✨ NEW: Reactions
    reactions: List[dict] = []  # List of {emoji, count, users: [user_ids]}


class ChatConversationResponse(BaseModel):
    """Schema for full conversation with messages"""
    chatData: dict
    messages: List[ChatMessageItem]


class MarkAsReadRequest(BaseModel):
    """Schema for marking messages as read"""
    session_id: int
    user_id: int

# AI Suggestion Schemas
class AISuggestionRequest (BaseModel):
    """Schema for requesting AI message suggestions"""
    session_id: int
    user_id: int
    limit: int = Field(3, ge=1, le=5, description="Number of suggestions (1-5)")

class AISuggestionsResponse(BaseModel):
    """Schema for AI-generated message suggestions"""
    suggestions: List[str]
    session_id: int

class AIChatRequest(BaseModel):
    session_id: int
    user_id: int
    prompt: str = Field(..., max_length=400)

class AIChatResponse(BaseModel):
    reply: str
    session_id: int


# ============= MESSAGE REACTION SCHEMAS =============

class ReactionCreate(BaseModel):
    """Schema for adding a reaction to a message"""
    message_id: int
    user_id: int
    emoji: str = Field(..., max_length=10)


class ReactionResponse(BaseModel):
    """Schema for reaction response"""
    id: int
    message_id: int
    user_id: int
    emoji: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReactionSummary(BaseModel):
    """Summary of reactions on a message"""
    emoji: str
    count: int
    users: List[int]  # List of user IDs who reacted with this emoji