from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from functools import lru_cache
import asyncio
import time
import os
import json
import google.generativeai as genai

from app.database import get_db
from app.dependencies import get_current_user_id
from app.utils.gcs import upload_profile_image_to_gcs, upload_chat_attachment_to_gcs, generate_signed_url_for_path
from app.utils.notification_service import NotificationService
from app.schemas.message import (
    ChatSessionCreate, ChatSessionResponse,
    MessageCreate, MessageResponse, MessageUpdate,
    MessageAttachmentCreate, MessageAttachmentResponse,
    EnrichedChatItem, ChatConversationResponse, MarkAsReadRequest,
    AISuggestionRequest, AISuggestionsResponse,
    AIChatRequest, AIChatResponse,
    ReactionCreate
)
from app.schemas.common import SuccessResponse
from app.crud import message as crud_message
from app.models import User, ChatParticipant, AIChatMemory
from sqlalchemy.exc import SQLAlchemyError

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Define router with prefix
router = APIRouter(prefix="/messages", tags=["Messages"])


# ============= PERSONALITY ANALYSIS CACHE =============
# Simple TTL cache for personality analysis to avoid repeated DB queries
_personality_cache: Dict[int, Tuple[str, float]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


def get_cached_personality(user_id: int) -> Optional[str]:
    """Get cached personality analysis if not expired"""
    if user_id in _personality_cache:
        analysis, cached_at = _personality_cache[user_id]
        if time.time() - cached_at < _CACHE_TTL_SECONDS:
            return analysis
        # Expired, remove from cache
        del _personality_cache[user_id]
    return None


def set_cached_personality(user_id: int, analysis: str) -> None:
    """Cache personality analysis with timestamp"""
    _personality_cache[user_id] = (analysis, time.time())


# ============= CHAT SESSION ENDPOINTS =============

@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(session: ChatSessionCreate, db: Session = Depends(get_db)):
    """Create a new chat session"""
    return crud_message.create_chat_session(db, session)


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_chat_session(session_id: int, db: Session = Depends(get_db)):
    """Get chat session by ID"""
    session = crud_message.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return session


@router.get("/sessions/user/{user_id}", response_model=List[ChatSessionResponse])
def get_user_chat_sessions(user_id: int, db: Session = Depends(get_db)):
    """Get all chat sessions for a user"""
    return crud_message.get_user_chat_sessions(db, user_id)


@router.post("/sessions/{session_id}/participants", response_model=SuccessResponse)
def add_participant_to_session(
    session_id: int,
    user_id: int,
    role: str = "MEMBER",
    db: Session = Depends(get_db)
):
    """Add a participant to a chat session"""
    session = crud_message.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    crud_message.add_chat_participant(db, session_id, user_id, role)
    return SuccessResponse(success=True, message="Participant added successfully")


# ============= MESSAGE ENDPOINTS =============

@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(message: MessageCreate, db: Session = Depends(get_db)):
    """Send a new message"""
    # Verify chat session exists
    session = crud_message.get_chat_session(db, message.chat_session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # --- BLOCK CHECK ---
    # Check if either participant has blocked the other
    participants = db.query(ChatParticipant).filter(ChatParticipant.session_id == message.chat_session_id).all()
    if any(p.blocked for p in participants):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot send messages to this user as the chat is blocked."
        )
    # --- END BLOCK CHECK ---

    # --- UNMATCH CHECK ---
    # Check if the chat has been unmatched
    if session.status == "UNMATCHED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot send messages to this user as the chat has been unmatched."
        )
    # --- END UNMATCH CHECK ---

    result = crud_message.create_message(db, message)

    # --- SEND MESSAGE NOTIFICATION EMAIL (Non-blocking) ---
    import asyncio
    try:
        # Get sender info
        sender = db.query(User).filter(User.id == message.sender_id).first()

        # Get recipient (the other participant in the chat)
        recipient_participant = db.query(ChatParticipant).filter(
            ChatParticipant.session_id == message.chat_session_id,
            ChatParticipant.user_id != message.sender_id
        ).first()

        if sender and recipient_participant:
            recipient = db.query(User).filter(User.id == recipient_participant.user_id).first()

            if recipient:
                # Send email notification to recipient
                asyncio.create_task(
                    NotificationService.notify_new_message(
                        db=db,
                        recipient_email=recipient.email,
                        recipient_name=recipient.full_name,
                        sender_name=sender.full_name,
                        message_preview=message.content[:100] if message.content else "[Image]"
                    )
                )
    except Exception as e:
        # Don't fail the message if email fails
        print(f"[WARNING] Failed to send message notification email: {e}")
    # --- END EMAIL NOTIFICATION ---

    # --- BROADCAST MESSAGE VIA WEBSOCKET ---
    try:
        from app.websocket import sio
        import asyncio

        # Prepare message data for WebSocket broadcast
        message_data = {
            "id": result.id,
            "content": result.content,
            "sender_id": result.sender_id,
            "timestamp": result.timestamp.isoformat() if result.timestamp else None,
            "session_id": result.chat_session_id,
            "chat_session_id": result.chat_session_id,
            "message_type": result.message_type or "TEXT",
            "attachments": [],
            "deleted": False,
            "edited": False
        }

        # Broadcast to all users in the chat room
        asyncio.create_task(
            sio.emit('message_created', message_data, room=f"chat_{result.chat_session_id}")
        )
        print(f"[WebSocket] Broadcasted message {result.id} to room chat_{result.chat_session_id}")
    except Exception as e:
        # Don't fail the message if WebSocket broadcast fails
        print(f"[WARNING] Failed to broadcast message via WebSocket: {e}")
    # --- END WEBSOCKET BROADCAST ---

    return result


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(message_id: int, db: Session = Depends(get_db)):
    """Get a specific message"""
    message = crud_message.get_message(db, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    return message


@router.get("/session/{session_id}", response_model=List[MessageResponse])
def get_chat_messages(
    session_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all messages in a chat session (paginated)"""
    session = crud_message.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    return crud_message.get_chat_messages(db, session_id, skip, limit)


@router.delete("/{message_id}", response_model=SuccessResponse)
def delete_message(
    message_id: int,
    deleting_user_id: int,
    db: Session = Depends(get_db)
    ):
    """Delete a message (soft delete)"""
    success = crud_message.delete_message(db, message_id, deleting_user_id) #Pass user_id
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    return SuccessResponse(success=True, message="Message deleted successfully")


# ✨ NEW: Edit/Update message endpoint
@router.put("/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: int,
    message_update: MessageUpdate,
    db: Session = Depends(get_db)
):
    """Update/edit a message"""
    message = crud_message.get_message(db, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    if not message.original_content:
        # Store original content before first edit
        message.original_content = message.content
    
  # Update message content
    message.content = message_update.content
    message.edited_at = datetime.now()  # NEW: Track edit tim

    db.commit()
    db.refresh(message)
    
    return message


# ============= MESSAGE ATTACHMENTS =============

@router.post("/{message_id}/attachments/upload", response_model=MessageAttachmentResponse)
async def upload_message_attachment_file(
    message_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    # current_user_id: int = Depends(get_current_user_id)  # Uncomment when auth is ready
):
    """Upload an image attachment to a message"""

    # TEMPORARY: Use hardcoded user ID for testing (remove when auth is ready)
    TEST_USER_ID = 1
    current_user_id = TEST_USER_ID

    # Verify message exists
    message = crud_message.get_message(db, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    # Validate file is an image
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed"
        )

    # Get chat session ID from the message
    chat_session_id = message.chat_session_id

    # Upload to GCS in dedicated chat_attachments folder
    blob_path = await upload_chat_attachment_to_gcs(file, current_user_id, chat_session_id)

    # Generate signed URL with 1 hour expiration
    signed_url = await generate_signed_url_for_path(blob_path, expires_in_seconds=3600)

    # Create attachment record in database
    attachment_data = MessageAttachmentCreate(
        message_id=message_id,
        attachment_type="IMAGE",
        url=signed_url,
        blob_path=blob_path,
        thumbnail_url=None  # Optional: can implement thumbnail generation later
    )

    db_attachment = crud_message.add_message_attachment(db, attachment_data)

    return MessageAttachmentResponse.model_validate(db_attachment)


@router.post("/attachments", response_model=MessageAttachmentResponse, status_code=status.HTTP_201_CREATED)
def add_message_attachment(attachment: MessageAttachmentCreate, db: Session = Depends(get_db)):
    """Add an attachment to a message (direct URL method)"""
    # Verify message exists
    message = crud_message.get_message(db, attachment.message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return crud_message.add_message_attachment(db, attachment)


# ============= ENRICHED ENDPOINTS FOR FRONTEND =============

@router.get("/chats/list/{user_id}", response_model=List[EnrichedChatItem])
def get_user_chat_list(user_id: int, db: Session = Depends(get_db)):
    """
    Get enriched chat list for a user with:
    - Other participant's profile info
    - Last message preview
    - Unread count
    - Online status
    """
    chat_list = crud_message.get_enriched_chat_list(db, user_id)
    return chat_list


@router.get("/conversation/{session_id}/{user_id}", response_model=ChatConversationResponse)
def get_conversation(session_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Get full conversation with messages and other user's details
    """
    conversation = crud_message.get_chat_conversation(db, session_id, user_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    return conversation


@router.post("/mark-read", response_model=SuccessResponse)
def mark_as_read(request: MarkAsReadRequest, db: Session = Depends(get_db)):
    """
    Mark all messages in a session as read for a user
    """
    success = crud_message.mark_messages_as_read(db, request.session_id, request.user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or no messages to mark as read"
        )
    return SuccessResponse(success=True, message="Messages marked as read")


@router.post("/block/{session_id}/{user_id}", response_model=SuccessResponse)
def block_user(session_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Block the other user in a chat session
    """
    success = crud_message.block_user_in_chat(db, session_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unable to block user"
        )
    return SuccessResponse(success=True, message="User blocked successfully")


@router.post("/unmatch/{session_id}/{user_id}", response_model=SuccessResponse)
def unmatch_chat(session_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Unmatch a chat session - both users can still view history but cannot send messages
    """
    from app.models import ChatSession

    # Get the chat session
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # Verify user is a participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.session_id == session_id,
        ChatParticipant.user_id == user_id
    ).first()

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat"
        )

    # Set status to UNMATCHED
    session.status = "UNMATCHED"
    db.commit()

    return SuccessResponse(success=True, message="Chat unmatched successfully")

# ============= AI SUGGESTIONS ENDPOINT =============

@router.post("/ai/suggestions", response_model=AISuggestionsResponse)
def get_ai_message_suggestions(
    request: AISuggestionRequest,
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered message suggestions based on conversation context
    
    Uses Gemini AI to analyze the conversation and suggest contextual replies.
    Falls back to basic suggestions if API key is not configured.
    """
    # Verify chat session exists
    session = crud_message.get_chat_session(db, request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Generate AI suggestions
    suggestions = crud_message.generate_ai_suggestions(
        db, 
        request.session_id, 
        request.user_id, 
        request.limit
    )
    
    return AISuggestionsResponse(
        suggestions=suggestions,
        session_id=request.session_id
    )

@router.post("/ai/chat", response_model=dict)
async def ai_chat_reply(
    request: AIChatRequest,
    db: Session = Depends(get_db)
):
    """
    AI Chat endpoint with performance optimizations:
    - Parallel database queries (30-50% faster)
    - Cached personality analysis (5-min TTL)
    - Reduced context size (10 AI turns, 8 chat messages)
    """
    start_time = time.time()
    print(f"[AI] /messages/ai/chat start session={request.session_id} user={request.user_id} prompt_len={len(request.prompt or '')}")

    # Verify session exists first (required before parallel queries)
    session = crud_message.get_chat_session(db, request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    from app.services.ai_agents import get_agent_coordinator
    from app.models import ProfileAnalysis

    # ============= PARALLEL DATA FETCHING =============
    # Check cache first for personality analysis
    analysis_context = get_cached_personality(request.user_id)
    cache_hit = analysis_context is not None

    # Define async wrappers for DB queries to run in parallel
    async def fetch_personality():
        if cache_hit:
            return None  # Already have from cache
        try:
            profile_analysis = await asyncio.to_thread(
                lambda: db.query(ProfileAnalysis).filter(
                    ProfileAnalysis.user_id == request.user_id
                ).first()
            )
            if profile_analysis and profile_analysis.characteristic_json:
                try:
                    analysis_data = json.loads(profile_analysis.characteristic_json)
                    if isinstance(analysis_data, dict) and "short" in analysis_data:
                        return analysis_data["short"]
                    return profile_analysis.characteristic_json
                except:
                    return profile_analysis.characteristic_json
        except Exception as e:
            print(f"[AI] Could not fetch personality analysis: {e}")
        return ""

    async def fetch_ai_memory():
        # Reduced from 20 to 10 turns for faster processing
        return await asyncio.to_thread(
            lambda: list(reversed(
                db.query(AIChatMemory)
                .filter(AIChatMemory.session_id == request.session_id)
                .order_by(AIChatMemory.timestamp.desc())
                .limit(10)  # Reduced from 20
                .all()
            ))
        )

    async def fetch_chat_messages():
        # Reduced from 15 to 8 messages for faster processing
        return await asyncio.to_thread(
            lambda: crud_message.get_chat_messages(db, request.session_id, skip=0, limit=8)  # Reduced from 15
        )

    async def fetch_other_user():
        try:
            participants = await asyncio.to_thread(
                lambda: db.query(ChatParticipant).filter(
                    ChatParticipant.session_id == request.session_id
                ).all()
            )
            for p in participants:
                if p.user_id != request.user_id:
                    other_user = await asyncio.to_thread(
                        lambda uid=p.user_id: db.query(User).filter(User.id == uid).first()
                    )
                    if other_user:
                        return other_user.full_name.split()[0] if other_user.full_name else "your match"
        except Exception as e:
            print(f"[AI] Could not fetch other user name: {e}")
        return "your match"

    # Run all queries in parallel
    personality_result, ai_turns, chat_messages, other_user_name = await asyncio.gather(
        fetch_personality(),
        fetch_ai_memory(),
        fetch_chat_messages(),
        fetch_other_user()
    )

    # Use cached or fetched personality
    if not cache_hit and personality_result:
        analysis_context = personality_result
        set_cached_personality(request.user_id, analysis_context)
    elif not analysis_context:
        analysis_context = ""

    db_time = time.time() - start_time
    print(f"[AI] DB queries completed in {db_time:.2f}s (cache_hit={cache_hit})")

    # Build conversation history
    conversation_history = [{"role": t.role, "content": t.content} for t in ai_turns]

    # Format chat messages for AI context (reduced to 8)
    chat_context_lines = []
    for msg in chat_messages[-8:]:
        sender = "You" if msg.sender_id == request.user_id else other_user_name
        content = msg.content or ""
        if content:
            chat_context_lines.append(f"{sender}: {content}")

    chat_messages_context = "\n".join(chat_context_lines) if chat_context_lines else "No messages yet"
    print(f"[AI] Context: {len(ai_turns)} AI turns, {len(chat_context_lines)} chat messages")

    # ============= AGENT PROCESSING =============
    coordinator = get_agent_coordinator()
    user_context = {
        "user_id": request.user_id,
        "analysis_context": analysis_context,
        "location": "Kuala Lumpur",
        "chat_messages": chat_messages_context,
        "other_user_name": other_user_name
    }

    result = await coordinator.process_message(
        user_message=request.prompt,
        conversation_history=conversation_history,
        user_context=user_context
    )

    reply = result.get("response_message", "")

    # Limit AI response to 2000 characters
    if reply and len(reply) > 2000:
        truncated = reply[:2000]
        cut = truncated.rfind(' ')
        reply = (truncated[:cut] + '…') if cut > 0 else (truncated + '…')

    total_time = time.time() - start_time
    print(f"[AI] reply_len={len(reply or '')} agent_type={result.get('agent_type')} total_time={total_time:.2f}s")

    # Save to memory (fire and forget style - don't block response)
    try:
        u = AIChatMemory(session_id=request.session_id, user_id=request.user_id, role="user", content=request.prompt)
        a = AIChatMemory(session_id=request.session_id, user_id=request.user_id, role="assistant", content=reply)
        db.add(u)
        db.add(a)
        db.commit()
        print("[AI] memory persisted ok")
    except Exception:
        import sys
        print("[AI] memory persist failed:", sys.exc_info()[1])
        try:
            db.rollback()
        except Exception:
            pass

    return {
        "reply": reply,
        "session_id": request.session_id,
        "agent_type": result.get("agent_type", "chat"),
        "data": result
    }


# ============= MESSAGE REACTIONS ENDPOINTS =============

@router.post("/reactions", response_model=dict)
def add_reaction(
    reaction: ReactionCreate,
    db: Session = Depends(get_db)
):
    """Add a reaction to a message"""
    result = crud_message.add_reaction(
        db,
        reaction.message_id,
        reaction.user_id,
        reaction.emoji
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add reaction"
        )
    return result


@router.delete("/reactions", response_model=SuccessResponse)
def remove_reaction(
    message_id: int,
    user_id: int,
    emoji: str,
    db: Session = Depends(get_db)
):
    """Remove a reaction from a message"""
    success = crud_message.remove_reaction(db, message_id, user_id, emoji)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found"
        )
    return SuccessResponse(success=True, message="Reaction removed")


@router.get("/reactions/{message_id}", response_model=List[dict])
def get_reactions(
    message_id: int,
    db: Session = Depends(get_db)
):
    """Get all reactions for a message"""
    return crud_message.get_message_reactions(db, message_id)