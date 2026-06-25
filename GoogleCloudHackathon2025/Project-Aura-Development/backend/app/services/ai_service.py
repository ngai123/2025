from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AISourceItem,
    MemoryUpsertRequest,
    MemorySummaryResponse,
)
from app.models import AIChatMemory, AIChatSummary
from app.crud.message import generate_ai_chat_reply
from app.services.rag_store import query_passages


def generate_chat(db: Session, req: AIChatRequest) -> AIChatResponse:
    sources: List[AISourceItem] = []
    if req.use_context:
        passages = query_passages(req.prompt, None, 3)
        for p in passages:
            sources.append(AISourceItem(**{
                "title": p.get("title"),
                "snippet": p.get("snippet"),
                "tags": p.get("tags"),
            }))
    reply = generate_ai_chat_reply(db, req.session_id, req.user_id, req.prompt)
    if len(reply) > req.max_chars:
        trimmed = reply[:req.max_chars]
        cut = trimmed.rfind(" ")
        reply = (trimmed[:cut] + "…") if cut > 0 else (trimmed + "…")
    _persist_turns(db, req.session_id, req.user_id, req.prompt, reply)
    return AIChatResponse(
        reply=reply,
        session_id=req.session_id,
        sources=sources,
        prompt_version="v0",
        safety_flags=[],
    )


def upsert_memory(db: Session, req: MemoryUpsertRequest) -> bool:
    try:
        m = AIChatMemory(
            session_id=req.session_id,
            user_id=req.user_id,
            role=req.role,
            content=req.content,
        )
        db.add(m)
        db.commit()
        return True
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return False


def get_memory_summary(db: Session, session_id: int, limit: int = 20) -> MemorySummaryResponse:
    items = (
        db.query(AIChatMemory)
        .filter(AIChatMemory.session_id == session_id)
        .order_by(AIChatMemory.timestamp.desc())
        .limit(limit)
        .all()
    )
    recent = [
        {
            "role": i.role,
            "content": i.content,
            "timestamp": i.timestamp.isoformat() if i.timestamp else None,
        }
        for i in items
    ]
    summary_text = _build_summary_text(recent)
    summary = db.query(AIChatSummary).filter(AIChatSummary.session_id == session_id).first()
    if summary is None:
        summary = AIChatSummary(session_id=session_id, summary_text=summary_text, turn_count=len(items))
        db.add(summary)
    else:
        summary.summary_text = summary_text
        summary.turn_count = len(items)
    db.commit()
    return MemorySummaryResponse(session_id=session_id, summary=summary_text, recent_turns=recent)


def _persist_turns(db: Session, session_id: int, user_id: int, user_text: str, assistant_text: str) -> None:
    u = AIChatMemory(session_id=session_id, user_id=user_id, role="user", content=user_text)
    a = AIChatMemory(session_id=session_id, user_id=user_id, role="assistant", content=assistant_text)
    db.add(u)
    db.add(a)
    db.commit()


def _build_summary_text(recent_turns: List[Dict[str, Optional[str]]]) -> str:
    parts: List[str] = []
    for t in reversed(recent_turns[-10:]):
        role = t.get("role") or ""
        content = t.get("content") or ""
        parts.append(f"{role}: {content}")
    text = " \n".join(parts)
    if len(text) > 500:
        trimmed = text[:500]
        cut = trimmed.rfind(" ")
        text = (trimmed[:cut] + "…") if cut > 0 else (trimmed + "…")
    return text