from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, Date, SmallInteger, ForeignKey, TIMESTAMP, CheckConstraint, Enum, event, text, UniqueConstraint, Index
from sqlalchemy.orm import relationship , backref
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from app.database import Base # Assuming app.database is the correct path

"""
File: models.py
Author: Christian Lew
Date: October 21, 2025
Description: This file defines the database models for the Dating App API.
"""

class User(Base):
    __tablename__ = "users"

    # id BIGSERIAL PRIMARY KEY
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)

    # full_name TEXT NOT NULL
    full_name = Column(Text, nullable=False)

    # email CITEXT NOT NULL UNIQUE
    email = Column(CITEXT(), unique=True, nullable=False)

    # password_hash TEXT NOT NULL
    password_hash = Column(Text, nullable=False)

    # phone_number VARCHAR(20) (single E.164 string like +123456789)
    phone_number = Column(String(20), nullable=True)

    # date_of_birth DATE NOT NULL
    date_of_birth = Column(Date, nullable=False)

    # gender gender_enum NOT NULL
    gender = Column(Enum('male', 'female', 'other', name='gender_enum'), nullable=False)

    # created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # phone_number must be a valid E.164 string when provided
        # E.164: '+' followed by country code (no leading zeros) and 1-14 further digits
        CheckConstraint(r"phone_number IS NULL OR phone_number ~ '^\+[1-9][0-9]{1,14}$'", name="phone_number_format"),
    )

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False)
    preferences = relationship("UserPreferences", back_populates="user", uselist=False)
    emergency_contacts = relationship("EmergencyContact", back_populates="user")
    profile_pictures = relationship("ProfilePicture", back_populates="user")
    profile_analysis = relationship("ProfileAnalysis", back_populates="user", uselist=False)
    premium = relationship("PremiumUser", back_populates="user", uselist=False) # <--- MUST-HAVE: Added uselist=False
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    chat_participations = relationship("ChatParticipant", back_populates="user")
    user_prompts = relationship("UserPrompt", back_populates="user")
    likes_given = relationship("LikeDislike", foreign_keys="LikeDislike.liker_id", back_populates="liker")
    likes_received = relationship("LikeDislike", foreign_keys="LikeDislike.liked_user_id", back_populates="liked")

    # --- Compatibility properties for API schema (non-persisted) ---
    @property
    def is_active(self) -> bool:
        return True

    @property
    def is_verified(self) -> bool:
        return False

    @property
    def last_login(self):
        return None

    @property
    def profile_views(self) -> int:
        try:
            return int(self.profile.profile_views) if getattr(self, "profile", None) and self.profile.profile_views is not None else 0
        except Exception:
            return 0


class Profile(Base):
    __tablename__ = "profile"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, unique=True) # Kept unique=True as it's common for a 1-to-1 profile link

    # --- Changes based on senior's schema ---
    first_name = Column(String(50), nullable=False) # Changed to NOT NULL
    last_name = Column(String(50), nullable=False)  # Changed to NOT NULL
    # REMOVED: dob field (use User.date_of_birth instead to avoid duplication)
    # REMOVED: gender_id - Use User.gender instead (single source of truth)
    education_id = Column(Integer, ForeignKey("education.id"), nullable=True)
    employment_id = Column(Integer, ForeignKey("employment.id"), nullable=True)
    # REMOVED: interest_id - Use ProfileInterest junction table for many-to-many relationship
    # REMOVED: language_id - Should create ProfileLanguage junction table for many-to-many relationship
    industry_id = Column(Integer, ForeignKey("industry.id"), nullable=True)
    interested_in = Column(String, nullable=True)   # New column, type String (maps to TEXT in PG for 'character varying')
    verified_status = Column(String(20), nullable=False, server_default="pending") # New column, NOT NULL, with default
    profile_visibility = Column(String(20), nullable=False, server_default="public") # New column, NOT NULL, with default
    about_me = Column(Text, nullable=True)          # No change
    my_goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    come_from = Column(String(100), nullable=True)  # New column
    relationship_id = Column(Integer, ForeignKey("relationship_status.id"), nullable=True)
    height_cm = Column(SmallInteger, nullable=True) # Renamed from 'height', changed type to SmallInteger
    zodiac = Column(String(20), nullable=True)      # No change
    profile_views = Column(Integer, default=0) 

    # --- Kept for good practice, even if not explicitly in senior's schema ---
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_profile_verified_status', 'verified_status'),
        Index('idx_profile_visibility', 'profile_visibility'),
        Index('idx_profile_user_id', 'user_id'),  # For profile lookups by user
    )

    # Relationships
    user = relationship("User", back_populates="profile")
    # REMOVED: Direct interest and language relationships - use many-to-many instead

    # Many-to-many relationships
    interests = relationship("ProfileInterest", back_populates="profile")
    languages_selected = relationship("ProfileLanguage", back_populates="profile")
    # REMOVED: relationship_statuses - redundant with Profile.relationship_id FK

    # Reference table relationships
    education = relationship("Education", foreign_keys=[education_id])
    employment = relationship("Employment", foreign_keys=[employment_id])
    industry = relationship("Industry", foreign_keys=[industry_id])
    my_goal = relationship("Goal", foreign_keys=[my_goal_id])
    relationship_status = relationship("RelationshipStatus", foreign_keys=[relationship_id])


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True)
    min_age = Column(SmallInteger, default=18)
    max_age = Column(SmallInteger, default=99)
    prefers_verified_only = Column(Boolean, default=False)
    filter_by = Column(JSONB)

    # Relationships
    user = relationship("User", back_populates="preferences")

class Meeting(Base):
    __tablename__="meetings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    other_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    location = Column(String(255), nullable=False)
    meeting_time = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    status = Column(String(20), nullable=False, server_default="scheduled")  # e.g., scheduled, completed, cancelled
    

class Interest(Base):
    __tablename__ = "interests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    icon = Column(String(50), nullable=True)

class ProfileInterest(Base):
    __tablename__ = "profile_interests"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(BigInteger, ForeignKey("profile.id"), nullable=False)
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint('profile_id', 'interest_id', name='uq_profile_interest'),
    )

    # Relationships
    profile = relationship("Profile", back_populates="interests")
    interest = relationship("Interest") # to link to the interest details


# REMOVED: ProfileRelationshipStatus class - redundant with Profile.relationship_id FK
# Use the RelationshipStatus reference table with Profile.relationship_id instead

# class UserPrompt(Base):
#     __tablename__ = "user_prompts"

#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
#     question = Column(String(255), nullable=False)
#     answer = Column(Text, nullable=True)
#     created_at = Column(TIMESTAMP, server_default=func.now())
#     updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

#     # Relationships
#     user = relationship("User", back_populates="user_prompts")

class LoveStyle(Base):
    __tablename__ = "love_styles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, unique=True)
    type = Column(String(10), nullable=False)
    archetype = Column(String(50), nullable=False)
    icon = Column(String(50), nullable=False)
    compatibility = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref= backref("love_style", uselist=False))
    traits = relationship("LoveStyleTrait", back_populates="love_style")

class LoveStyleTrait(Base):
    __tablename__ = "love_style_traits"

    id = Column(Integer, primary_key=True, index=True)
    love_style_id = Column(Integer, ForeignKey("love_styles.id"), nullable=False)
    trait = Column(String(50), nullable=False)

    # Relationships
    love_style = relationship("LoveStyle", back_populates="traits")


class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)


class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Employment(Base):
    __tablename__ = "employment"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Industry(Base):
    __tablename__ = "industry"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class RelationshipStatus(Base):
    __tablename__ = "relationship_status"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    contact_name = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    country_id = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="emergency_contacts")


class SOSAlert(Base):
    __tablename__ = "sos_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    meeting_with = Column(String(200), nullable=False)
    location = Column(Text, nullable=False)
    meeting_time = Column(TIMESTAMP(timezone=True), nullable=False)
    alert_sent_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    status = Column(Enum('pending', 'sent', 'acknowledged', 'cancelled', name='sos_status_enum'), nullable=False, server_default='pending')
    contacts_alerted = Column(JSONB, nullable=True)  # Store list of contact IDs that were alerted

    # Relationships
    user = relationship("User")


class ProfilePicture(Base):
    __tablename__ = "profile_pictures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    category = Column(String(50), nullable=True)
    upload_date = Column(TIMESTAMP, server_default=func.now())
    # Relationships
    user = relationship("User", back_populates="profile_pictures")


class ProfileAnalysis(Base):
    __tablename__ = "profile_analysis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, unique=True)
    ori_voice_json = Column(Text, nullable=True)
    characteristic_json = Column(Text, nullable=True)
    analysis_date = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="profile_analysis")


class PremiumUser(Base):
    __tablename__ = "premium_user"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, unique=True)  # One premium subscription per user
    start_date = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    end_date = Column(TIMESTAMP(timezone=True), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relationships
    user = relationship("User", back_populates="premium")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    last_message_at = Column(TIMESTAMP, server_default=func.now())
    status = Column(String(20), default="ACTIVE")
    title = Column(String(100), nullable=True)
    message_count = Column(Integer, default=0)

    __table_args__ = (
        Index('idx_chat_last_message_at', 'last_message_at'),  # For sorting chat list
        Index('idx_chat_status', 'status'),
    )

    # Relationships
    participants = relationship("ChatParticipant", back_populates="session")
    messages = relationship("Message", back_populates="chat_session")


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    session_id = Column(Integer, ForeignKey("chat_sessions.id"), primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True)
    joined_at = Column(TIMESTAMP, server_default=func.now())
    left_at = Column(TIMESTAMP, nullable=True)
    blocked = Column(Boolean, default=False)
    role = Column(String(20), default="MEMBER")
    notification_settings = Column(String(20), default="ALL")
    last_read_message_id = Column(Integer, nullable=True)

    is_notified = Column(String(2), default="0")

    # Relationships
    session = relationship("ChatSession", back_populates="participants")
    user = relationship("User", back_populates="chat_participations")


class AIChatMemory(Base):
    __tablename__ = "ai_chat_memory"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now())

    session = relationship("ChatSession")
    user = relationship("User")


class AIChatSummary(Base):
    __tablename__ = "ai_chat_summary"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), unique=True, nullable=False)
    summary_text = Column(Text, nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    turn_count = Column(Integer, default=0)

    session = relationship("ChatSession")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    sender_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP, server_default=func.now())
    message_type = Column(String(20), default="TEXT")
    deleted_at = Column(TIMESTAMP, nullable=True)

    deleted_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)  # New column to track who deleted the message
    edited_at = Column(TIMESTAMP, nullable=True)  # New column to track when the message was edited
    original_content = Column(Text, nullable=True)  # New column to store original content before edit

    __table_args__ = (
        Index('idx_message_timestamp', 'timestamp'),  # For message ordering
        Index('idx_message_session_id', 'chat_session_id'),  # For fetching messages by chat
        Index('idx_message_sender_id', 'sender_id'),  # For user's sent messages
    )

    # Relationships
    chat_session = relationship("ChatSession", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    attachments = relationship("MessageAttachment", back_populates="message")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    attachment_type = Column(String(20), nullable=False)
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    blob_path = Column(Text, nullable=True) #Store GSC blob path (permenant)

    # Relationships
    message = relationship("Message", back_populates="attachments")


class MessageReaction(Base):
    """Stores emoji reactions on messages"""
    __tablename__ = "message_reactions"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    emoji = Column(String(10), nullable=False)  # Store emoji character
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        Index('idx_reaction_message', 'message_id'),
        Index('idx_reaction_user', 'user_id'),
        # Ensure one reaction type per user per message
        UniqueConstraint('message_id', 'user_id', 'emoji', name='uq_message_user_emoji'),
    )

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User")


class LikeDislike(Base):
    __tablename__ = "like_dislike"

    id = Column(Integer, primary_key=True, index=True)
    liker_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)  # The person giving the like/dislike
    liked_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)  # The person receiving the like/dislike
    status = Column(Enum('like', 'dislike', 'super_like', name='like_status_enum'), nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('liker_id', 'liked_user_id', name='uq_liker_liked'),
        Index('idx_liker_id', 'liker_id'),
        Index('idx_liked_user_id', 'liked_user_id'),
    )

    # Relationships
    liker = relationship("User", foreign_keys=[liker_id], back_populates="likes_given")
    liked = relationship("User", foreign_keys=[liked_user_id], back_populates="likes_received")

class UserBlock(Base):
    __tablename__ = "user_blocks"

    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    blocked_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('blocker_id', 'blocked_id', name='uq_blocker_blocked'),
        Index('idx_blocker_id', 'blocker_id'),
        Index('idx_blocked_id', 'blocked_id'),
    )

    blocker = relationship("User", foreign_keys=[blocker_id])
    blocked = relationship("User", foreign_keys=[blocked_id])


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(255), nullable=False)

    # Relationships
    user_prompts = relationship("UserPrompt", back_populates="prompt")


class UserPrompt(Base):
    __tablename__ = "user_prompts"
    
    user_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), primary_key=True)
    answer_text = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="user_prompts")
    prompt = relationship("Prompt", back_populates="user_prompts")





# Ensure required PostgreSQL extensions exist (e.g., CITEXT)
@event.listens_for(Base.metadata, "before_create")
def _create_pg_extensions(target, connection, **kw):
    try:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
    except Exception:
        # Extension creation can fail on managed DBs without superuser; ignore safely
        pass
    
    
# Add this new association table model
class ProfileLanguage(Base):
    __tablename__ = "profile_languages"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(BigInteger, ForeignKey("profile.id"), nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False) # Foreign key to the Language table

    # Relationships
    profile = relationship("Profile", back_populates="languages_selected") # Renamed to avoid clash with Profile.language
    language = relationship("Language") # Link to the Language table
    
    
    
