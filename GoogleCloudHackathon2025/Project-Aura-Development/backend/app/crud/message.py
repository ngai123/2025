from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from app.models import (
    Message, ChatSession, ChatParticipant, MessageAttachment,
    User, Profile, ProfilePicture, AIChatMemory
)
from app.schemas.message import (
    MessageCreate, ChatSessionCreate, MessageAttachmentCreate
)
from app.models import Profile, ProfileInterest, Interest, Goal, User
from typing import Optional, List, Dict
from datetime import datetime, date 
from urllib.parse import urlparse
import asyncio

# ============= HELPER FUNCTIONS =============

def generate_fresh_signed_url(profile_picture) -> Optional[str]:
    """
    Generate a fresh signed URL from a ProfilePicture object.
    Extracts blob_path from image_url and generates new signed URL.
    """
    if not profile_picture or not profile_picture.image_url:
        return None

    try:
        # Parse the existing URL to extract blob path
        # Format: https://storage.googleapis.com/project-aura-images/project-aura-image/profile_pictures/1/photo.png
        parsed = urlparse(profile_picture.image_url)
        path_parts = parsed.path.lstrip('/').split('/', 1)

        if len(path_parts) < 2:
            # If URL format is unexpected, return original URL
            return profile_picture.image_url

        # Extract blob_path (everything after bucket name)
        # Example: "project-aura-image/profile_pictures/1/photo.png"
        blob_path = path_parts[1]

        # Generate fresh signed URL using the GCS utility
        from app.utils.gcs import generate_signed_url_for_path
        fresh_url = asyncio.run(generate_signed_url_for_path(blob_path, expires_in_seconds=3600))

        return fresh_url

    except Exception as e:
        print(f"Warning: Could not generate signed URL for profile picture: {e}")
        # Fallback to original URL if generation fails
        return profile_picture.image_url

# ============= CHAT SESSION FUNCTIONS =============

def create_chat_session(db: Session, session: ChatSessionCreate) -> ChatSession:
    """Create a new chat session"""
    db_session = ChatSession(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def get_chat_session(db: Session, session_id: int) -> Optional[ChatSession]:
    """Get a chat session by ID"""
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def get_user_chat_sessions(db: Session, user_id: int) -> List[ChatSession]:
    """Get all chat sessions for a user"""
    return db.query(ChatSession).join(ChatParticipant).filter(
        ChatParticipant.user_id == user_id
    ).all()


def add_chat_participant(db: Session, session_id: int, user_id: int, role: str = "MEMBER"):
    """Add a participant to a chat session"""
    participant = ChatParticipant(
        session_id=session_id,
        user_id=user_id,
        role=role
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


# ============= MESSAGE FUNCTIONS =============

def create_message(db: Session, message: MessageCreate) -> Message:
    """Create a new message"""
    db_message = Message(**message.model_dump())
    db.add(db_message)
    
    # Update last_message_at in session
    session = db.query(ChatSession).filter(ChatSession.id == message.chat_session_id).first()
    if session:
        session.last_message_at = db_message.timestamp
    
    db.commit()
    db.refresh(db_message)
    return db_message


def get_message(db: Session, message_id: int) -> Optional[Message]:
    """Get a message by ID"""
    return db.query(Message).filter(Message.id == message_id).first()


def get_chat_messages(db: Session, session_id: int, skip: int = 0, limit: int = 50) -> List[Message]:
    """Get messages in a chat session with pagination"""
    return db.query(Message).filter(
        Message.chat_session_id == session_id,
        Message.deleted_at.is_(None)
    ).order_by(Message.timestamp.asc()).offset(skip).limit(limit).all()


def delete_message(db: Session, message_id: int, deleting_user_id: int) -> bool:
    """Soft delete a message and track who deleted it"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if message:
        message.deleted_at = datetime.now()
        message.deleted_by_user_id = deleting_user_id  # Track who deleted the message
        db.commit()
        return True
    return False


# ============= ATTACHMENT FUNCTIONS =============

def add_message_attachment(db: Session, attachment: MessageAttachmentCreate) -> MessageAttachment:
    """Add an attachment to a message"""
    db_attachment = MessageAttachment(**attachment.model_dump())
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment


# ============= ENRICHED CHAT FUNCTIONS (FOR FRONTEND) =============

def get_enriched_chat_list(db: Session, user_id: int) -> List[dict]:
    """Get all chat sessions for a user with enriched data"""

    # Get all chat sessions where user is a participant
    # FIXED: Explicit JOIN condition to prevent cross-session contamination
    # Show ACTIVE and UNMATCHED sessions (exclude INACTIVE duplicates)
    chat_sessions = db.query(ChatSession).join(
        ChatParticipant,
        ChatSession.id == ChatParticipant.session_id
    ).filter(
        ChatParticipant.user_id == user_id,
        ChatParticipant.left_at.is_(None),
        ChatSession.status.in_(["ACTIVE", "UNMATCHED"])  # Show both active and unmatched chats
    ).order_by(ChatSession.last_message_at.desc()).all()
    
    result = []

    for session in chat_sessions:
        # SECURITY CHECK: Verify total participant count to prevent data leaks
        total_participants = db.query(ChatParticipant).filter(
            ChatParticipant.session_id == session.id,
            ChatParticipant.left_at.is_(None)
        ).count()

        # Skip sessions that don't have exactly 2 active participants (prevent group chats or corrupted data)
        if total_participants != 2:
            print(f"[WARNING] Chat session {session.id} has {total_participants} participants, expected 2. Skipping.")
            continue

        # Get other participant(s) - EXCLUDE current user
        participants = db.query(ChatParticipant).filter(
            ChatParticipant.session_id == session.id,
            ChatParticipant.user_id != user_id,
            ChatParticipant.left_at.is_(None)
        ).all()

        # Verify we found exactly 1 other participant
        if len(participants) != 1:
            print(f"[WARNING] Chat session {session.id} has {len(participants)} other participants for user {user_id}, expected 1. Skipping.")
            continue

        other_participant = participants[0]

        # IMPORTANT: Double-check that other participant is not the same as current user
        if other_participant.user_id == user_id:
            print(f"[ERROR] Chat session {session.id} has duplicate user {user_id}. Skipping.")
            continue
        
        # Get user profile
        user = db.query(User).filter(User.id == other_participant.user_id).first()
        if not user:
            continue
            
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        
        # Get profile picture
        profile_picture = db.query(ProfilePicture).filter(
            ProfilePicture.user_id == user.id
        ).order_by(ProfilePicture.upload_date.desc()).first()
        
        # Get last message
        last_message = db.query(Message).filter(
            Message.chat_session_id == session.id,
            Message.deleted_at.is_(None)
        ).order_by(Message.timestamp.desc()).first()
        
        # ✨ NEW: Check if last message has image attachments
        message_preview = "No messages yet"
        if last_message:
            # Check for attachments
            has_image = db.query(MessageAttachment).filter(
                MessageAttachment.message_id == last_message.id,
                MessageAttachment.attachment_type == "IMAGE"
            ).first()
            
            if has_image:
                message_preview = "[Photo]"  # Windows-compatible: no emoji
            elif last_message.content:
                message_preview = last_message.content
            else:
                message_preview = "Sent an attachment"
        
        # Get unread count and block status (for current user)
        current_participant = db.query(ChatParticipant).filter(
            ChatParticipant.session_id == session.id,
            ChatParticipant.user_id == user_id
        ).first()

        # If the current user has blocked this chat, skip it entirely from inbox
        if current_participant and current_participant.blocked:
            continue

        # Check if the OTHER participant has blocked this chat
        other_participant_blocked = other_participant.blocked if other_participant else False

        unread_count = 0
        if current_participant and current_participant.last_read_message_id:
            unread_count = db.query(Message).filter(
                Message.chat_session_id == session.id,
                Message.id > current_participant.last_read_message_id,
                Message.sender_id != user_id,
                Message.deleted_at.is_(None)
            ).count()
        elif last_message and last_message.sender_id != user_id:
            unread_count = db.query(Message).filter(
                Message.chat_session_id == session.id,
                Message.sender_id != user_id,
                Message.deleted_at.is_(None)
            ).count()
        
        # Format time
        time_str = format_message_time(session.last_message_at)
        
        # Build name - handle missing profile gracefully
        display_name = user.full_name  # Default fallback
        if profile and profile.first_name and profile.last_name:
            display_name = f"{profile.first_name} {profile.last_name}"
        elif profile and profile.first_name:
            display_name = profile.first_name
        
        # Build enriched chat object
        chat_data = {
            "id": session.id,
            "name": display_name,
            "avatar": generate_fresh_signed_url(profile_picture) if profile_picture else None,
            "message": message_preview,  # ✨ UPDATED: Now shows photo indicator
            "time": time_str,
            "lastMessageAt": session.last_message_at.isoformat() if session.last_message_at else None,
            "unread": unread_count,
            "isVerified": user.is_verified if user.is_verified is not None else False,
            "isBlocked": other_participant_blocked,  # Show if OTHER participant blocked this chat
            "isUnmatched": session.status == "UNMATCHED",  # Show if chat has been unmatched
            "userId": user.id,
            "sessionId": session.id
        }
        
        result.append(chat_data)
    
    return result


def get_chat_conversation(db: Session, session_id: int, current_user_id: int) -> Optional[dict]:
    """Get full conversation details with message attachments"""
    session = get_chat_session(db, session_id)
    if not session:
        return None
    
    # Get other participant
    participants = db.query(ChatParticipant).filter(
        ChatParticipant.session_id == session_id,
        ChatParticipant.user_id != current_user_id
    ).all()
    
    if not participants:
        return None
    
    other_participant = participants[0]
    user = db.query(User).filter(User.id == other_participant.user_id).first()
    if not user:
        return None
    
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    profile_picture = db.query(ProfilePicture).filter(
        ProfilePicture.user_id == user.id
    ).order_by(ProfilePicture.upload_date.desc()).first()
    
    # ✨ CHANGED: Get ALL messages including deleted ones
    messages = db.query(Message).filter(
        Message.chat_session_id == session_id
        # REMOVED: Message.deleted_at.is_(None) - We want to show deleted messages!
    ).order_by(Message.timestamp.asc()).all()
    
    formatted_messages = []
    for msg in messages:
        # ✨ NEW: Check if message is deleted
        is_deleted = msg.deleted_at is not None
        print(f"DEBUG: Message {msg.id} - deleted_at: {msg.deleted_at}, is_deleted: {is_deleted}")
        
        # Get attachments for this message
        attachments = db.query(MessageAttachment).filter(
            MessageAttachment.message_id == msg.id
        ).all()
        
        # Format attachments - Generate fresh signed URLs
        formatted_attachments = []  # ← CORRECT: 8 spaces
        for att in attachments:
            # Generate fresh signed URL from blob_path to avoid expiration
            from app.utils.gcs import generate_signed_url_for_path
            import asyncio

            fresh_url = att.url  # Fallback to stored URL
            if att.blob_path:
                try:
                    # Generate fresh signed URL with 1 hour expiration
                    fresh_url = asyncio.run(generate_signed_url_for_path(att.blob_path, expires_in_seconds=3600))
                except Exception as e:
                    print(f"Warning: Could not generate signed URL for {att.blob_path}: {e}")

            formatted_attachments.append({
                "id": att.id,
                "type": att.attachment_type,
                "url": fresh_url,
                "thumbnail_url": att.thumbnail_url
            })
        
        
        # ✨ UPDATED: Build message with deletion and edit metadata
        formatted_messages.append({
            "id": msg.id,
            "text": msg.content or "",
            "time": format_message_time(msg.timestamp),
            "type": "sent" if msg.sender_id == current_user_id else "received",
            "sender_id": msg.sender_id,
            "timestamp": msg.timestamp.isoformat(),
            "attachments": formatted_attachments,

            # ✨ NEW: Add deletion metadata
            "deleted": is_deleted,
            "deleted_at": msg.deleted_at.isoformat() if msg.deleted_at else None,
            "deleted_by_user_id": msg.deleted_by_user_id,
            "deleted_by_me": msg.deleted_by_user_id == current_user_id if is_deleted else False,
            
            # ✨ NEW: Add edit metadata
            "edited": msg.edited_at is not None,
            "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
            "original_content": msg.original_content
        })
    
    # Build name - handle missing profile gracefully
    display_name = user.full_name
    if profile and profile.first_name and profile.last_name:
        display_name = f"{profile.first_name} {profile.last_name}"
    elif profile and profile.first_name:
        display_name = profile.first_name
    
    return {
        "chatData": {
            "id": session.id,
            "name": display_name,
            "avatar": generate_fresh_signed_url(profile_picture) if profile_picture else None,
            "isVerified": user.is_verified if user.is_verified is not None else False,
            "isBlocked": other_participant.blocked if other_participant.blocked is not None else False,
            "is_unmatched": session.status == "UNMATCHED",  # Show if chat has been unmatched
            "online": False,
            "userId": user.id
        },
        "messages": formatted_messages
    }


def mark_messages_as_read(db: Session, session_id: int, user_id: int) -> bool:
    """Mark all messages as read"""
    latest_message = db.query(Message).filter(
        Message.chat_session_id == session_id,
        Message.deleted_at.is_(None)
    ).order_by(Message.timestamp.desc()).first()
    
    if not latest_message:
        return False
    
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.session_id == session_id,
        ChatParticipant.user_id == user_id
    ).first()
    
    if participant:
        participant.last_read_message_id = latest_message.id
        db.commit()
        return True
    
    return False


def block_user_in_chat(db: Session, session_id: int, blocker_user_id: int) -> bool:
    """Block the other user in a chat"""
    # Find the participant to be blocked (the one who is NOT the blocker)
    participant_to_block = db.query(ChatParticipant).filter(
        ChatParticipant.session_id == session_id,
        ChatParticipant.user_id != blocker_user_id
    ).first()
    
    if participant_to_block:
        # Set the 'blocked' flag on the OTHER user's participant entry
        participant_to_block.blocked = True
        db.commit()
        return True
    
    return False


def format_message_time(timestamp: datetime) -> str:
    """Format timestamp to readable string"""

    if timestamp is None:
        return "No message"
    
    now = datetime.now()
    diff = now - timestamp
    
    if diff.days == 0:
        if diff.seconds < 3600:
            minutes = diff.seconds // 60
            if minutes == 0:
                return "Just now"
            return f"{minutes} m ago"
        
        # Windows-compatible format (strip leading zero manually)
        time_str = timestamp.strftime("%I:%M %p")  # "04:20 PM"
        return time_str.lstrip('0').replace(' 0', ' ')  # "4:20 PM"
    elif diff.days == 1:
        return "Yesterday"
    elif diff.days < 7:
        return f"{diff.days} days ago"
    else:
        return timestamp.strftime("%b %d")  # "Jan 15"
    
    # ============= AI SUGGESTIONS FUNCTIONS =============

def generate_ai_suggestions(
    db: Session, 
    session_id: int, 
    user_id: int, 
    limit: int = 3
) -> List[str]:
    """Generate AI-powered message suggestions using Gemini"""
    import google.generativeai as genai
    import os
    
    # Check if API key is configured
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        try:
            env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
            env_path = os.path.abspath(env_path)
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith('GEMINI_API_KEY='):
                            api_key = line.strip().split('=', 1)[1]
                            os.environ['GEMINI_API_KEY'] = api_key
                            break
        except Exception:
            pass
    if not api_key or api_key == "your-gemini-api-key-here":
        # Fallback to basic suggestions if no API key
        return [
            "That sounds interesting! Tell me more 😊",
            "How's your day going?",
            "I'd love to hear more about that!"
        ]
    
    try:
        # Configure Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-pro")
        
        # Get recent conversation history (last 10 messages)
        messages = db.query(Message).filter(
            Message.chat_session_id == session_id,
            Message.deleted_at.is_(None)
        ).order_by(Message.timestamp.desc()).limit(10).all()
        
        # Reverse to chronological order
        messages = list(reversed(messages))
        
        # Get other participant's name for context
        other_participant = db.query(ChatParticipant).join(User).filter(
            ChatParticipant.session_id == session_id,
            ChatParticipant.user_id != user_id
        ).first()
        
        other_user_name = "your match"
        if other_participant:
            user = db.query(User).filter(User.id == other_participant.user_id).first()
            if user:
                profile = db.query(Profile).filter(Profile.user_id == user.id).first()
                if profile and profile.first_name:
                    other_user_name = profile.first_name
        
        # Build conversation context
        conversation_context = ""
        for msg in messages:
            role = "You" if msg.sender_id == user_id else other_user_name
            conversation_context += f"{role}: {msg.content}\n"
        
        # If no conversation yet, suggest ice breakers
        if not conversation_context.strip():
            prompt = f"""You are a dating app conversation assistant. Generate {limit} friendly, engaging conversation starters.

Requirements:
- Be warm and genuine
- Ask open-ended questions
- Show interest in getting to know the person
- Keep it light and fun
- Each suggestion should be different in style (question, statement, playful)

Return ONLY the {limit} suggestions, one per line, without numbers or labels."""
        else:
            # Generate contextual responses
            prompt = f"""You are a dating app conversation assistant. Based on this conversation, generate {limit} natural reply suggestions.

Conversation:
{conversation_context}

Requirements:
- Match the tone and energy of the conversation
- Be genuine and authentic
- Show interest and engagement
- Keep responses concise (1-2 sentences)
- Vary the style: one friendly, one flirty, one question-based
- NO emojis unless the conversation already uses them

Return ONLY the {limit} suggestions, one per line, without numbers or labels."""
        
        # Generate suggestions
        response = model.generate_content(prompt)
        suggestions_text = response.text.strip()
        
        # Parse suggestions (split by newlines)
        suggestions = [s.strip() for s in suggestions_text.split('\n') if s.strip()]
        
        # Clean up any numbering that AI might add
        cleaned_suggestions = []
        for suggestion in suggestions:
            # Remove common prefixes like "1. " or "- "
            cleaned = suggestion.lstrip('0123456789.-) ')
            if cleaned:
                cleaned_suggestions.append(cleaned)
        
        # Return requested number of suggestions
        return cleaned_suggestions[:limit]
        
    except Exception as e:
        print(f"Error generating AI suggestions: {e}")
        # Fallback suggestions
        return [
            "That's really interesting!",
            "Tell me more about that",
            "What do you think about it?"
        ][:limit]

def generate_ai_chat_reply(
    db: Session,
    session_id: int,
    user_id: int,
    prompt: str
) -> str:
    import google.generativeai as genai
    import os
    import json
    from app.models import ProfileAnalysis, AIChatMemory

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        try:
            env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
            env_path = os.path.abspath(env_path)
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith('GEMINI_API_KEY='):
                            api_key = line.strip().split('=', 1)[1]
                            os.environ['GEMINI_API_KEY'] = api_key
                            break
        except Exception:
            pass
    if not api_key or api_key == "your-gemini-api-key-here":
        print("[AI] GEMINI_API_KEY missing or placeholder")
        return "Saya perlukan sedikit masa, cuba lagi nanti."
    try:
        use_new_client = False
        try:
            from google import genai
            from google.genai import types
            client = genai.Client()
            use_new_client = True
            print("[AI] using google-genai Client")
        except Exception as ie:
            print(f"[AI] google-genai not available, fallback: {ie}")
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-pro")
        
        # Get chat history
        ai_turns = (
            db.query(AIChatMemory)
            .filter(AIChatMemory.session_id == session_id)
            .order_by(AIChatMemory.timestamp.desc())
            .limit(20)
            .all()
        )
        ai_turns = list(reversed(ai_turns))

        # --- MODIFIED: Build conversation history for the new client ---
        conversation_history = []
        for turn in ai_turns:
            # The new API uses 'model' for the assistant's role
            role = "user" if turn.role == "user" else "model"
            conversation_history.append({"role": role, "parts": [{"text": turn.content}]})
        # --- END MODIFICATION ---

        # --- NEW: Fetch and add personality profile to context ---
        personality_context = ""
        analysis = db.query(ProfileAnalysis).filter(ProfileAnalysis.user_id == user_id).order_by(ProfileAnalysis.analysis_date.desc()).first()
        if analysis and analysis.characteristic_json:
            personality_context = (
                "\n\n--- USER PERSONALITY PROFILE ---\n"
                "Use the following personality analysis to inform your response. "
                "When making a recommendation (e.g., for a location, activity, or shopping list), "
                "you MUST justify it by connecting it to one or more of these personality traits.\n\n"
                f"{analysis.characteristic_json}\n"
                "--- END OF PERSONALITY PROFILE ---\n"
            )
        # --- END NEW LOGIC ---

        system_prompt = (
            "You are a world-class, empathetic AI Dating Coach. "
            "Your purpose is to provide immediate, actionable, and comprehensive advice to users based on their dating questions. "
            "Always maintain a helpful, supportive, and knowledgeable tone. "
            "When asked a broad question, structure your response by categorizing the advice. "
            f"{personality_context}"  # Injected personality profile
            "Your response must always end with a specific, open-ended question to drive the conversation forward and elicit more context from the user."
        )

        if use_new_client:
            # Add the current user's prompt to the history
            conversation_history.append({"role": "user", "parts": [{"text": prompt}]})
            
            payload_contents = conversation_history
            payload_system = {"parts": [{"text": system_prompt}]}
            print("[AI] generating reply with google-genai")
            response = client.models.generate_content(
                model="gemini-2.5-flash-preview-09-2025",
                contents=payload_contents,
                system_instruction=payload_system,
                tools=[{"google_search": {}}],
            )
            text = (response.text or "").strip()
        else:
            # Fallback logic for the old client
            memory_context = ""
            for t in ai_turns:
                role = "You" if t.role == "user" else "Coach"
                content = t.content or ""
                memory_context += f"{role}: {content}\n"
            prompt_text = (
                f"System:\n{system_prompt}\n\nContext:\n{memory_context}\n\nUser:\n{prompt}\n\nCoach:"
            )
            print("[AI] generating reply with google.generativeai")
            response = model.generate_content(prompt_text)
            text = (response.text or "").strip()
        
        print(f"[AI] model response length={len(text)}")
        if text and not text.strip().endswith('?'):
            text = text.rstrip('.')
            text = text + "\n\nWhat feels most comfortable for you right now—meeting people through shared activities, or focusing on online connections?"
        if len(text) > 300:
            trimmed = text[:300]
            cut = trimmed.rfind(' ')
            text = (trimmed[:cut] + '…') if cut > 0 else (trimmed + '…')
        return text
    except Exception as e:
        print(f"[AI] generation error: {e}")
        try:
            suggestion = generate_ai_suggestions(db, session_id, user_id, 1)
            text = (suggestion[0] if suggestion else "That's interesting!")
            if len(text) > 300:
                trimmed = text[:300]
                cut = trimmed.rfind(' ')
                text = (trimmed[:cut] + '…') if cut > 0 else (trimmed + '…')
            return text
        except Exception as e2:
            print(f"[AI] fallback suggestion error: {e2}")
            return "Coach is busy, try again"


# ============= MESSAGE REACTIONS FUNCTIONS =============

def add_reaction(db: Session, message_id: int, user_id: int, emoji: str) -> Optional[dict]:
    """Add a reaction to a message"""
    from app.models import MessageReaction

    # Check if reaction already exists
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == user_id,
        MessageReaction.emoji == emoji
    ).first()

    if existing:
        return {"id": existing.id, "message_id": message_id, "user_id": user_id, "emoji": emoji, "action": "exists"}

    # Create new reaction
    reaction = MessageReaction(
        message_id=message_id,
        user_id=user_id,
        emoji=emoji
    )
    db.add(reaction)
    db.commit()
    db.refresh(reaction)

    return {
        "id": reaction.id,
        "message_id": message_id,
        "user_id": user_id,
        "emoji": emoji,
        "action": "added"
    }


def remove_reaction(db: Session, message_id: int, user_id: int, emoji: str) -> bool:
    """Remove a reaction from a message"""
    from app.models import MessageReaction

    reaction = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == user_id,
        MessageReaction.emoji == emoji
    ).first()

    if reaction:
        db.delete(reaction)
        db.commit()
        return True
    return False


def get_message_reactions(db: Session, message_id: int) -> List[dict]:
    """Get all reactions for a message, grouped by emoji"""
    from app.models import MessageReaction
    from collections import defaultdict

    reactions = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id
    ).all()

    # Group by emoji
    emoji_groups = defaultdict(list)
    for r in reactions:
        emoji_groups[r.emoji].append(r.user_id)

    return [
        {"emoji": emoji, "count": len(users), "users": users}
        for emoji, users in emoji_groups.items()
    ]


def get_reactions_for_messages(db: Session, message_ids: List[int]) -> Dict[int, List[dict]]:
    """Get reactions for multiple messages at once (batch query)"""
    from app.models import MessageReaction
    from collections import defaultdict

    if not message_ids:
        return {}

    reactions = db.query(MessageReaction).filter(
        MessageReaction.message_id.in_(message_ids)
    ).all()

    # Group by message_id, then by emoji
    result = defaultdict(lambda: defaultdict(list))
    for r in reactions:
        result[r.message_id][r.emoji].append(r.user_id)

    # Convert to final format
    formatted = {}
    for msg_id, emoji_groups in result.items():
        formatted[msg_id] = [
            {"emoji": emoji, "count": len(users), "users": users}
            for emoji, users in emoji_groups.items()
        ]

    return formatted