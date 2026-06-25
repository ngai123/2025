from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta

# Import all necessary models directly
# Added ProfilePicture as it's needed for eager loading for the frontend interfaces
from app.models import User, Profile, PremiumUser, LikeDislike, ProfilePicture 
from app.schemas.like import LikeCreate, LikeResponse # Assuming this is correct

# ==================== USER CRUD OPERATIONS (REMOVED FROM THIS FILE) ====================
# The following functions have been removed from app/crud/like.py:
# - get_user
# - get_user_by_username
# - get_users
# - create_user
# - update_user_premium_status
# These functions are now located in 'app/crud/user.py' to ensure proper separation of concerns.
# The 'PremiumUser' interface's backend logic for updating premium status is handled there.

# ==================== LIKE CRUD OPERATIONS ====================

def create_like(db: Session, liker_id: int, liked_id: int) -> LikeDislike:
    """Create a new like (one user likes another)."""
    db_like = LikeDislike(liker_id=liker_id, liked_user_id=liked_id, status='like')
    db.add(db_like)
    db.commit()
    db.refresh(db_like)
    return db_like

def get_users_who_liked_me(db: Session, user_id: int) -> List[User]:
    """
    Get all users who have liked the specified user.
    This is for the 'Likes Me' page (frontend interface).
    Eager-loads profile, premium status, and profile pictures for schema population.
    """
    # Query for LikeDislike objects where liked_user_id is the current user_id
    liker_ids = db.query(LikeDislike.liker_id).filter(LikeDislike.liked_user_id == user_id).subquery()

    # Query for User objects whose IDs are in the liker_ids subquery
    # Eager-load profile, premium, and profile_pictures for ProfileDisplay schema
    users = db.query(User).options(
        joinedload(User.profile),
        joinedload(User.premium),
        joinedload(User.profile_pictures) # <--- MUST-HAVE: Eager load profile pictures for Mylikepage/Likedmepage
    ).filter(User.id.in_(liker_ids)).all()
    return users

def get_users_i_liked(db: Session, user_id: int) -> List[User]:
    """
    Get all users that the specified user has liked.
    This is for the 'My Likes' page (frontend interface).
    Eager-loads profile, premium status, and profile pictures for schema population.
    """
    # Query for LikeDislike objects where liker_id is the current user_id
    liked_ids = db.query(LikeDislike.liked_user_id).filter(LikeDislike.liker_id == user_id).subquery()

    # Query for User objects whose IDs are in the liked_ids subquery
    # Eager-load profile, premium, and profile_pictures for ProfileDisplay schema
    users = db.query(User).options(
        joinedload(User.profile),
        joinedload(User.premium),
        joinedload(User.profile_pictures) # <--- MUST-HAVE: Eager load profile pictures for Mylikepage/Likedmepage
    ).filter(User.id.in_(liked_ids)).all()
    return users

def check_if_like_exists(db: Session, liker_id: int, liked_id: int) -> bool:
    """Check if a like already exists between two users."""
    like = db.query(LikeDislike).filter(
        LikeDislike.liker_id == liker_id,
        LikeDislike.liked_user_id == liked_id
    ).first()
    return like is not None

# from sqlalchemy.orm import Session, joinedload
# from typing import List, Optional
# from datetime import datetime, timedelta

# # Import all necessary models directly
# from app.models import User, Profile, PremiumUser, LikeDislike # Corrected import
# from app.schemas.like import LikeCreate, LikeResponse # Assuming this is correct

# # ==================== USER CRUD OPERATIONS (These functions seem to belong in crud/user.py, but fixing them here for now) ====================

# def get_user(db: Session, user_id: int) -> Optional[User]: # Changed models.User to User
#     """Get a single user by ID, eager-loading profile and premium status."""
#     return db.query(User).options( # Changed models.User to User
#         joinedload(User.profile), # Changed models.User to User
#         joinedload(User.premium) # Changed models.User to User
#     ).filter(User.id == user_id).first() # Changed models.User to User

# def get_user_by_username(db: Session, username: str) -> Optional[User]: # Changed models.User to User
#     """Get a user by username."""
#     return db.query(User).filter(User.username == username).first() # Changed models.User to User

# def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]: # Changed models.User to User
#     """Get a list of users with pagination, eager-loading profile and premium status."""
#     return db.query(User).options( # Changed models.User to User
#         joinedload(User.profile), # Changed models.User to User
#         joinedload(User.premium) # Changed models.User to User
#     ).offset(skip).limit(limit).all()

# # NOTE: The 'schemas' import for UserCreate is missing. Assuming it's from app.schemas.user
# # You'll need to add: from app.schemas.user import UserCreate
# # For now, I'll assume schemas.UserCreate is correctly imported from somewhere else.
# # If not, you'll get an error for 'schemas'
# def create_user(db: Session, user_data: LikeCreate) -> User: # Renamed 'user' to 'user_data' to avoid conflict, and assuming LikeCreate is a placeholder for UserCreate
#     """Create a new user and their associated profile."""
#     # Hash the password (assuming you have a utility for this, e.g., from security.py)
#     # For now, a placeholder. You MUST replace this with actual password hashing.
#     hashed_password = user_data.password # DANGER: This is not secure. Implement proper hashing.
#     # Example: from app.security import get_password_hash
#     # hashed_password = get_password_hash(user_data.password)

#     db_user = User( # Changed models.User to User
#         username=user_data.username,
#         email=user_data.email,
#         password_hash=hashed_password,
#         date_of_birth=user_data.date_of_birth,
#         gender=user_data.gender,
#         is_verified=False, # Default to false, verification process would change this
#         is_active=True,
#         created_at=datetime.now()
#     )
#     db.add(db_user)
#     db.flush() # Flush to get db_user.id before creating profile

#     db_profile = Profile( # Changed models.Profile to Profile
#         user_id=db_user.id,
#         # first_name=user_data.first_name, # Add if UserCreate includes first_name
#         # profile_picture_url=user_data.profile_image_url, # Add if UserCreate includes profile_image_url
#         created_at=datetime.now(),
#         updated_at=datetime.now()
#     )
#     db.add(db_profile)

#     db.commit()
#     db.refresh(db_user)
#     # db.refresh(db_profile) # Refresh profile if you need its ID immediately
#     return db_user

# def update_user_premium_status(db: Session, user_id: int, is_premium: bool) -> Optional[User]: # Changed models.User to User
#     """Update a user's premium status by managing the PremiumUser record."""
#     db_user = db.query(User).filter(User.id == user_id).first() # Changed models.User to User
#     if not db_user:
#         return None

#     # NOTE: User.premium is uselist=True in your models.py.
#     # This means a user can have multiple premium records.
#     # We'll assume we're managing the *most recent* or *only* active premium record.
#     # A more robust solution might involve querying for the currently active one.
#     premium_record = db.query(PremiumUser).filter( # Changed models.PremiumUser to PremiumUser
#         PremiumUser.user_id == user_id, # Changed models.PremiumUser to PremiumUser
#         PremiumUser.is_active == True # Changed models.PremiumUser to PremiumUser
#     ).order_by(PremiumUser.end_date.desc()).first() # Changed models.PremiumUser to PremiumUser

#     if is_premium:
#         if not premium_record:
#             # Create a new premium record if none exists
#             # Example: 1 month premium from now
#             premium_record = PremiumUser( # Changed models.PremiumUser to PremiumUser
#                 user_id=user_id,
#                 start_date=datetime.now(),
#                 end_date=datetime.now() + timedelta(days=30),
#                 is_active=True
#             )
#             db.add(premium_record)
#         else:
#             # Update existing premium record
#             premium_record.is_active = True
#             # Extend end_date if it's in the past, or just ensure it's active
#             if premium_record.end_date < datetime.now():
#                 premium_record.end_date = datetime.now() + timedelta(days=30)
#             else:
#                 premium_record.end_date += timedelta(days=30) # Extend from current end date
#     else: # is_premium is False, deactivate
#         if premium_record:
#             premium_record.is_active = False
#             # Optionally set end_date to now if deactivating immediately
#             # premium_record.end_date = datetime.now()

#     db.commit()
#     db.refresh(db_user) # Refresh user to get updated premium relationship
#     return db_user

# # ==================== LIKE CRUD OPERATIONS ====================

# def create_like(db: Session, liker_id: int, liked_id: int) -> LikeDislike: # Changed models.LikeDislike to LikeDislike
#     """Create a new like (one user likes another)."""
#     db_like = LikeDislike(like_user_id=liker_id, l_user_id=liked_id) # Use LikeDislike and its field names
#     db.add(db_like)
#     db.commit()
#     db.refresh(db_like)
#     return db_like

# def get_users_who_liked_me(db: Session, user_id: int) -> List[User]: # Changed models.User to User
#     """
#     Get all users who have liked the specified user.
#     This is for the 'Likes Me' page.
#     Eager-loads profile and premium status for schema population.
#     """
#     # Query for LikeDislike objects where l_user_id (liked user) is the current user_id
#     liker_ids = db.query(LikeDislike.like_user_id).filter(LikeDislike.l_user_id == user_id).subquery() # Changed models.LikeDislike to LikeDislike

#     # Query for User objects whose IDs are in the liker_ids subquery
#     # Eager-load profile and premium for ProfileDisplay schema
#     users = db.query(User).options( # Changed models.User to User
#         joinedload(User.profile), # Changed models.User to User
#         joinedload(User.premium) # Changed models.User to User
#     ).filter(User.id.in_(liker_ids)).all() # Changed models.User to User
#     return users

# def get_users_i_liked(db: Session, user_id: int) -> List[User]: # Changed models.User to User
#     """
#     Get all users that the specified user has liked.
#     This is for the 'My Likes' page.
#     Eager-loads profile and premium status for schema population.
#     """
#     # Query for LikeDislike objects where like_user_id (liker) is the current user_id
#     liked_ids = db.query(LikeDislike.l_user_id).filter(LikeDislike.like_user_id == user_id).subquery() # Changed models.LikeDislike to LikeDislike

#     # Query for User objects whose IDs are in the liked_ids subquery
#     # Eager-load profile and premium for ProfileDisplay schema
#     users = db.query(User).options( # Changed models.User to User
#         joinedload(User.profile), # Changed models.User to User
#         joinedload(User.premium) # Changed models.User to User
#     ).filter(User.id.in_(liked_ids)).all() # Changed models.User to User
#     return users

# def check_if_like_exists(db: Session, liker_id: int, liked_id: int) -> bool:
#     """Check if a like already exists between two users."""
#     like = db.query(LikeDislike).filter( # Use LikeDislike
#         LikeDislike.like_user_id == liker_id, # Use LikeDislike field names
#         LikeDislike.l_user_id == liked_id # Use LikeDislike field names
#     ).first()
#     return like is not None
