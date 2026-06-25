from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    RagQueryRequest,
    RagQueryResponse,
    MemoryUpsertRequest,
    MemorySummaryResponse,
)
from app.schemas.common import SuccessResponse
from app.services.ai_service import (
    generate_chat,
    upsert_memory,
    get_memory_summary,
)
from app.services.rag_store import query_passages


router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/chat", response_model=AIChatResponse)
def ai_chat(req: AIChatRequest, db: Session = Depends(get_db)):
    try:
        return generate_chat(db, req)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI chat failed"
        )


@router.post("/rag/query", response_model=RagQueryResponse)
def rag_query(req: RagQueryRequest):
    passages = query_passages(req.query, req.filters, req.top_k)
    return RagQueryResponse(passages=[
        {
            "title": p.get("title"),
            "snippet": p.get("snippet"),
            "tags": p.get("tags"),
        }
        for p in passages
    ])


@router.post("/memory/upsert", response_model=SuccessResponse)
def memory_upsert(req: MemoryUpsertRequest, db: Session = Depends(get_db)):
    ok = upsert_memory(db, req)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Memory upsert failed"
        )
    return SuccessResponse(success=True, message="Memory stored")


@router.get("/memory/{session_id}", response_model=MemorySummaryResponse)
def memory_get(session_id: int, db: Session = Depends(get_db)):
    return get_memory_summary(db, session_id)


@router.post("/memory/summarize", response_model=MemorySummaryResponse)
def memory_summarize(req: dict, db: Session = Depends(get_db)):
    session_id = int(req.get("session_id"))
    return get_memory_summary(db, session_id)


@router.get("/health", response_model=dict)
def ai_health_check():
    try:
        from google import genai
        from google.genai import types
        client = genai.Client()
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="ping",
            config=types.GenerateContentConfig(system_instruction="You are health check")
        )
        ok = bool((resp.text or "").strip())
        return {"ok": ok, "library": "google-genai", "model": "gemini-2.5-flash"}
    except Exception as e:
        try:
            import google.generativeai as genai
            import os
            api_key = os.getenv("GEMINI_API_KEY")
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-pro")
            resp = model.generate_content("ping")
            ok = bool((resp.text or "").strip())
            return {"ok": ok, "library": "google.generativeai", "model": "gemini-2.5-pro"}
        except Exception as e2:
            return {"ok": False, "error": str(e2)}