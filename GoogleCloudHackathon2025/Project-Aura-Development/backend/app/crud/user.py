from sqlalchemy.orm import Session, joinedload # Added joinedload for eager loading
from sqlalchemy import or_
# Added PremiumUser, ProfilePicture for eager loading and Profile for creation
from app.models import User, Profile, UserPreferences, PremiumUser, ProfilePicture 
from app.schemas.user import UserCreate, UserUpdate # Assuming UserCreate and UserUpdate are defined in app.schemas.user
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime, timedelta, timezone # Added datetime, timedelta, and timezone for premium status

# Password hashing: support long passwords safely
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], default="bcrypt_sha256", deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Get a single user by ID, eager-loading profile, premium status, and profile pictures.
    This is crucial for populating the ProfileDisplay schema on the frontend.
    """
    return db.query(User).options(
        joinedload(User.profile),
        joinedload(User.premium),
        joinedload(User.profile_pictures)
    ).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Get a user by email, eager-loading profile, premium status, and profile pictures.
    """
    return db.query(User).options(
        joinedload(User.profile),
        joinedload(User.premium),
        joinedload(User.profile_pictures)
    ).filter(User.email == email).first()


def get_user_by_full_name(db: Session, full_name: str) -> Optional[User]:
    """
    Get a user by full_name, eager-loading profile, premium status, and profile pictures.
    """
    return db.query(User).options(
        joinedload(User.profile),
        joinedload(User.premium),
        joinedload(User.profile_pictures)
    ).filter(User.full_name == full_name).first()


def get_user_by_email_or_full_name(db: Session, identifier: str) -> Optional[User]:
    """
    Get a user by email or full_name, eager-loading profile, premium status, and profile pictures.
    """
    return db.query(User).options(
        joinedload(User.profile),
        joinedload(User.premium),
        joinedload(User.profile_pictures)
    ).filter(
        or_(User.email == identifier, User.full_name == identifier)
    ).first()


def create_user(db: Session, user: UserCreate) -> User:
    hashed_password = get_password_hash(user.password)
    db_user = User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hashed_password,
        phone_number=user.phone_number,
        date_of_birth=user.date_of_birth,
        gender=user.gender
    )
    db.add(db_user)
    db.flush() # Flush to get db_user.id before creating related objects

    # Create default preferences for new user
    preferences = UserPreferences(user_id=db_user.id)
    db.add(preferences)

    # Create a basic profile for the new user
    # NOTE: Profile has several NOT NULL fields. We need to provide values.
    # Assuming UserCreate provides enough info or sensible defaults are used.
    # Split full_name into first_name and last_name
    name_parts = user.full_name.strip().split(maxsplit=1)
    first_name = name_parts[0] if name_parts else "User"
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    db_profile = Profile(
        user_id=db_user.id,
        first_name=first_name,
        last_name=last_name,
        # REMOVED: dob field - date_of_birth is stored in User table (line 76), not Profile
        # REMOVED: gender_id field - we removed this from Profile model
        # education_id=...
        # employment_id=...
        # interest_id=...
        # language_id=...
        # industry_id=...
        # interested_in=...
        verified_status="pending", # Default status
        profile_visibility="public", # Default visibility
        # about_me=...
        # my_goal_id=...
        come_from=None, # Leave blank by default
        relationship_id=None, # FIX: relationship_id is Integer FK, not string. Set to None (nullable)
        # height_cm=...
        # zodiac=...
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(db_profile)

    db.commit()
    db.refresh(db_user)
    
    return db_user


def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    # Use the eager-loading get_user_by_id to ensure relationships are loaded if needed later
    db_user = get_user_by_id(db, user_id) 
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    # Use the eager-loading get_user_by_id
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    return True


def get_all_users(db: Session, skip: int = 0, limit: int = 100):
    """
    Get all users with pagination, eager-loading profile, premium status, and profile pictures.
    """
    return db.query(User).options(
        joinedload(User.profile),
        joinedload(User.premium),
        joinedload(User.profile_pictures)
    ).offset(skip).limit(limit).all()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    # Use the eager-loading get_user_by_email
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def update_user_premium_status(db: Session, user_id: int, is_premium: bool) -> Optional[User]:
    """
    Update a user's premium status by managing the PremiumUser record.
    This function is directly relevant to the PremiumUser frontend interface.
    """
    # Use the eager-loading get_user_by_id to ensure the 'premium' relationship is loaded
    db_user = get_user_by_id(db, user_id) 
    if not db_user:
        return None

    # User.premium is uselist=False in app/models.py, meaning it's a single object or None.
    premium_record = db_user.premium

    if is_premium:
        if not premium_record:
            # Create a new premium record if none exists
            premium_record = PremiumUser(
                user_id=user_id,
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=30), # Default 1 month subscription
                is_active=True
            )
            db.add(premium_record)
            db_user.premium = premium_record # Link it to the user object in the session
        else:
            # Update existing premium record
            premium_record.is_active = True
            # Extend end_date if it's in the past, or just ensure it's active
            if premium_record.end_date < datetime.now(timezone.utc):
                premium_record.end_date = datetime.now(timezone.utc) + timedelta(days=30)
            else:
                # If already active and end_date is in future, extend it further (e.g., for renewal)
                premium_record.end_date += timedelta(days=30)
    else: # is_premium is False, deactivate
        if premium_record:
            premium_record.is_active = False
            # Optionally set end_date to now if deactivating immediately
            # premium_record.end_date = datetime.now()

    db.commit()
    db.refresh(db_user) # Refresh user to get updated premium relationship
    return db_user
# from sqlalchemy.orm import Session
# from sqlalchemy import or_
# from app.models import User, Profile, UserPreferences
# from app.schemas.user import UserCreate, UserUpdate
# from passlib.context import CryptContext
# from typing import Optional

# # Password hashing: support long passwords safely
# pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], default="bcrypt_sha256", deprecated="auto")


# def get_password_hash(password: str) -> str:
#     return pwd_context.hash(password)


# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     return pwd_context.verify(plain_password, hashed_password)


# def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
#     return db.query(User).filter(User.id == user_id).first()


# def get_user_by_email(db: Session, email: str) -> Optional[User]:
#     return db.query(User).filter(User.email == email).first()


# def get_user_by_username(db: Session, username: str) -> Optional[User]:
#     return db.query(User).filter(User.username == username).first()


# def get_user_by_email_or_username(db: Session, identifier: str) -> Optional[User]:
#     return db.query(User).filter(
#         or_(User.email == identifier, User.username == identifier)
#     ).first()


# def create_user(db: Session, user: UserCreate) -> User:
#     hashed_password = get_password_hash(user.password)
#     db_user = User(
#         username=user.username,
#         email=user.email,
#         password_hash=hashed_password,
#         phone_number=user.phone_number,
#         country_code=user.country_code,
#         date_of_birth=user.date_of_birth,
#         gender=user.gender
#     )
#     db.add(db_user)
#     db.commit()
#     db.refresh(db_user)
    
#     # Create default preferences for new user
#     preferences = UserPreferences(user_id=db_user.id)
#     db.add(preferences)
#     db.commit()
    
#     return db_user


# def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
#     db_user = get_user_by_id(db, user_id)
#     if not db_user:
#         return None
    
#     update_data = user_update.model_dump(exclude_unset=True)
#     for field, value in update_data.items():
#         setattr(db_user, field, value)
    
#     db.commit()
#     db.refresh(db_user)
#     return db_user


# def delete_user(db: Session, user_id: int) -> bool:
#     db_user = get_user_by_id(db, user_id)
#     if not db_user:
#         return False
    
#     db.delete(db_user)
#     db.commit()
#     return True


# def get_all_users(db: Session, skip: int = 0, limit: int = 100):
#     return db.query(User).offset(skip).limit(limit).all()


# def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
#     user = get_user_by_email(db, email)
#     if not user:
#         return None
#     if not verify_password(password, user.password_hash):
#         return None
#     return user