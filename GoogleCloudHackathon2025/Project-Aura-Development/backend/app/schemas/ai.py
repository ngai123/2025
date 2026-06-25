from pydantic import BaseModel, Field
from typing import Optional, List


class AIChatRequest(BaseModel):
    session_id: int
    user_id: int
    prompt: str = Field(..., max_length=400)
    use_context: bool = True
    max_chars: int = Field(300, ge=100, le=500)


class AISourceItem(BaseModel):
    title: Optional[str] = None
    snippet: Optional[str] = None
    tags: Optional[List[str]] = None


class AIChatResponse(BaseModel):
    reply: str
    session_id: int
    sources: List[AISourceItem] = []
    prompt_version: Optional[str] = None
    safety_flags: List[str] = []


class RagQueryRequest(BaseModel):
    query: str
    filters: Optional[dict] = None
    top_k: int = Field(3, ge=1, le=10)


class RagQueryResponse(BaseModel):
    passages: List[AISourceItem]


class MemoryUpsertRequest(BaseModel):
    session_id: int
    user_id: int
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=1000)


class MemorySummaryResponse(BaseModel):
    session_id: int
    summary: Optional[str] = None
    recent_turns: List[dict] = []