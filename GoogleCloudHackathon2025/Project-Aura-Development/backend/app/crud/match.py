from sqlalchemy.orm import Session
from app.models import LikeDislike, User, Profile
from app.schemas.match import LikeDislikeCreate
from typing import Optional, List

MATCH_TRIGGER_STATUSES = ["like", "super_like"]

def get_profile_by_user_id(db: Session, user_id: int):
    return db.query(Profile).filter(Profile.user_id == user_id).first()

def create_like_dislike(db: Session, like: LikeDislikeCreate) -> LikeDislike:
    # Check if already exists
    existing = db.query(LikeDislike).filter(
        LikeDislike.liker_id == like.liker_id,
        LikeDislike.liked_user_id == like.liked_user_id
    ).first()

    if existing:
        existing.status = like.status
        db.commit()
        db.refresh(existing)
        return existing

    db_like = LikeDislike(**like.model_dump())
    db.add(db_like)
    db.commit()
    db.refresh(db_like)
    return db_like


def check_mutual_match(db: Session, user1_id: int, user2_id: int) -> bool:
    """Check if both users liked each other (mutual match)"""

    like1 = db.query(LikeDislike).filter(
        LikeDislike.liker_id == user1_id,
        LikeDislike.liked_user_id == user2_id,
        LikeDislike.status.in_(MATCH_TRIGGER_STATUSES)
    ).first()

    like2 = db.query(LikeDislike).filter(
        LikeDislike.liker_id == user2_id,
        LikeDislike.liked_user_id == user1_id,
        LikeDislike.status.in_(MATCH_TRIGGER_STATUSES)
    ).first()

    return like1 is not None and like2 is not None


def get_user_matches(db: Session, user_id: int) -> List[User]:
    """Get all users who mutually matched with this user"""
    # Get all users who liked this user
    liked_by = db.query(LikeDislike).filter(
        LikeDislike.liked_user_id == user_id,
        LikeDislike.status.in_(MATCH_TRIGGER_STATUSES)
    ).all()

    matches = []
    for like in liked_by:
        if check_mutual_match(db, user_id, like.liker_id):
            user = db.query(User).filter(User.id == like.liker_id).first()
            if user:
                matches.append(user)

    return matches


def get_users_liked_by(db: Session, user_id: int) -> List[int]:
    """Get list of user IDs that this user liked"""
    likes = db.query(LikeDislike).filter(
        LikeDislike.liker_id == user_id,
        LikeDislike.status.in_(MATCH_TRIGGER_STATUSES)
    ).all()
    return [like.liked_user_id for like in likes]


def get_users_who_liked(db: Session, user_id: int) -> List[int]:
    """Get list of user IDs who liked this user"""
    likes = db.query(LikeDislike).filter(
        LikeDislike.liked_user_id == user_id,
        LikeDislike.status.in_(MATCH_TRIGGER_STATUSES)
    ).all()
    return [like.liker_id for like in likes]
