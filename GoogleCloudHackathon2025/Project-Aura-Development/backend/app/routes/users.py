import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserLogin, UserUpdate, PasswordChange, UserUpdatePremium, AuthResponse
from app.schemas.common import SuccessResponse
from app.schemas.profile import ProfileAnalysisCreate, ProfileAnalysisResponse
from app.crud import user as crud_user
from app.crud import profile_analysis as crud_profile_analysis
from app.auth import create_user_token, authenticate_user, get_current_user_id
from app.models import User, UserBlock
from app.utils.gmail_api_service import send_personality_analysis_email
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/users", tags=["Users"])



@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and return authentication token"""
    # Check if email already exists
    db_user = crud_user.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Note: full_name is not unique, so no uniqueness check needed

    # Create user
    new_user = crud_user.create_user(db, user)

    # Generate JWT token
    access_token = create_user_token(new_user.id)

    # Return token and user data
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=AuthResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return authentication token"""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # Generate JWT token
    access_token = create_user_token(user.id)

    # Return token and user data
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # <--- MUST-HAVE: Explicitly validate user object against UserResponse schema
    return UserResponse.model_validate(user)


@router.get("/", response_model=List[UserResponse])
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all users (paginated)"""
    users = crud_user.get_all_users(db, skip=skip, limit=limit)
    # <--- MUST-HAVE: Explicitly validate each user object against UserResponse schema
    return [UserResponse.model_validate(u) for u in users]

@router.post("/block/{blocked_id}", response_model=SuccessResponse)
def block_user(blocked_id: int, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.id == blocked_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    existing = db.query(UserBlock).filter(
        UserBlock.blocker_id == current_user_id,
        UserBlock.blocked_id == blocked_id
    ).first()
    if existing:
        return SuccessResponse(success=True, message="User blocked successfully")
    try:
        block = UserBlock(blocker_id=current_user_id, blocked_id=blocked_id)
        db.add(block)
        db.commit()
        return SuccessResponse(success=True, message="User blocked successfully")
    except IntegrityError:
        db.rollback()
        return SuccessResponse(success=True, message="User blocked successfully")


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update user information"""
    user = crud_user.update_user(db, user_id, user_update)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # <--- MUST-HAVE: Explicitly validate user object against UserResponse schema
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", response_model=SuccessResponse)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete user"""
    success = crud_user.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return SuccessResponse(success=True, message="User deleted successfully")


@router.post("/{user_id}/change-password", response_model=SuccessResponse)
def change_password(
    user_id: int,
    password_change: PasswordChange,
    db: Session = Depends(get_db)
):
    """Change user password"""
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not crud_user.verify_password(password_change.old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    user.password_hash = crud_user.get_password_hash(password_change.new_password)
    db.commit()
    
    return SuccessResponse(success=True, message="Password changed successfully")


@router.put("/{user_id}/premium", response_model=UserResponse) # <--- MUST-HAVE: New endpoint for premium status
def update_user_premium_status_endpoint(
    user_id: int,
    premium_update: UserUpdatePremium, # Expects { "is_premium": true/false }
    db: Session = Depends(get_db)
):
    """
    Update a user's premium subscription status.
    This endpoint is used by the PremiumUser frontend interface.
    """
    user = crud_user.update_user_premium_status(db, user_id, premium_update.is_premium)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # <--- MUST-HAVE: Explicitly validate user object against UserResponse schema
    return UserResponse.model_validate(user)


@router.post("/{user_id}/analysis", response_model=ProfileAnalysisResponse, status_code=status.HTTP_201_CREATED)
def create_user_analysis(user_id: int, data: ProfileAnalysisCreate, db: Session = Depends(get_db)):
    """
    Create or update the voice onboarding answers for a user.
    """
    db_analysis = crud_profile_analysis.create_profile_analysis(db, user_id, data)
    if not db_analysis:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile analysis data"
        )
    return db_analysis

@router.post("/{user_id}/analysis/analyse", response_model=SuccessResponse)
def trigger_user_personality_analysis(user_id: int, data: ProfileAnalysisCreate, db: Session = Depends(get_db)):
    """
    Triggers the personality analysis based on the user's answers.
    Also generates Love Style profile automatically after analysis completes.
    """
    analysis_text = crud_profile_analysis.analyse_personality(db, user_id, data.answers)
    if not analysis_text:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyse personality"
        )

    # Auto-generate Love Style after personality analysis
    try:
        love_style_data = crud_profile_analysis.generate_love_style(db, user_id, data.answers, analysis_text)
        print(f"[Users Route] Generated love style for user {user_id}: {love_style_data['archetype']}")
    except Exception as e:
        # Log but don't fail the request - love style can be generated later
        print(f"[Users Route] Warning: Could not auto-generate love style for user {user_id}: {e}")

    return SuccessResponse(success=True, message="Personality analysis completed successfully.")


@router.get("/{user_id}/analysis", response_model=ProfileAnalysisResponse)
def get_user_analysis(user_id: int, db: Session = Depends(get_db)):
    """
    Get a user's profile analysis data.
    """
    db_analysis = crud_profile_analysis.get_profile_analysis(db, user_id)
    if not db_analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile analysis not found for this user"
        )

    # Parse the JSON string before sending it in the response
    answers_dict = {}
    if db_analysis.ori_voice_json:
        try:
            answers_dict = json.loads(db_analysis.ori_voice_json)
            db_analysis.ori_voice_json = answers_dict
        except json.JSONDecodeError as e:
            print(f"[Routes] Failed to parse ori_voice_json for user {user_id}: {e}")
            db_analysis.ori_voice_json = {}  # Return empty dict instead of crashing

    # Parse characteristic_json to extract short version
    short_analysis = ""
    if db_analysis.characteristic_json:
        try:
            analysis_data = json.loads(db_analysis.characteristic_json)
            short_analysis = analysis_data.get("short", db_analysis.characteristic_json)
        except json.JSONDecodeError:
            # Old format - just use as is
            short_analysis = db_analysis.characteristic_json

    # Generate trait scores dynamically
    trait_scores = None
    if short_analysis and answers_dict:
        trait_scores = crud_profile_analysis.generate_trait_scores(
            answers_dict,
            short_analysis
        )

    # Create response with trait scores
    return ProfileAnalysisResponse(
        user_id=db_analysis.user_id,
        ori_voice_json=db_analysis.ori_voice_json,
        characteristic_json=short_analysis,  # Return only short version
        analysis_date=db_analysis.analysis_date,
        trait_scores=trait_scores
    )


@router.post("/{user_id}/analysis/email", response_model=SuccessResponse)
async def email_full_analysis(user_id: int, db: Session = Depends(get_db)):
    """
    Send the full personality analysis to the user's email.
    """
    # Get user info
    db_user = crud_user.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get analysis
    db_analysis = crud_profile_analysis.get_profile_analysis(db, user_id)
    if not db_analysis or not db_analysis.characteristic_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile analysis not found for this user"
        )

    # Extract full version
    full_analysis = ""
    try:
        analysis_data = json.loads(db_analysis.characteristic_json)
        full_analysis = analysis_data.get("full", "")
    except json.JSONDecodeError:
        # Old format - use as is
        full_analysis = db_analysis.characteristic_json

    if not full_analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Full analysis not available"
        )

    # Send email
    try:
        await send_personality_analysis_email(
            recipient_email=db_user.email,
            recipient_name=db_user.full_name,
            full_analysis=full_analysis
        )
        return SuccessResponse(
            success=True,
            message=f"Full analysis sent to {db_user.email}"
        )
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )


@router.post("/{user_id}/analysis/love-style", response_model=SuccessResponse)
def generate_user_love_style(user_id: int, db: Session = Depends(get_db)):
    """
    Generate Love Style profile based on the user's personality analysis.
    Requires the user to have completed the voice onboarding analysis first.
    """
    # Get the profile analysis
    db_analysis = crud_profile_analysis.get_profile_analysis(db, user_id)
    if not db_analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile analysis not found. Complete voice onboarding first."
        )

    # Parse the answers
    answers = {}
    if db_analysis.ori_voice_json:
        try:
            answers = json.loads(db_analysis.ori_voice_json)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid answers data"
            )

    # Get the analysis text
    analysis_text = ""
    if db_analysis.characteristic_json:
        try:
            analysis_data = json.loads(db_analysis.characteristic_json)
            analysis_text = analysis_data.get("short", "") or analysis_data.get("full", "")
        except json.JSONDecodeError:
            analysis_text = db_analysis.characteristic_json

    if not answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No voice onboarding answers found"
        )

    # Generate love style
    love_style_data = crud_profile_analysis.generate_love_style(db, user_id, answers, analysis_text)

    return SuccessResponse(
        success=True,
        message=f"Love style generated: {love_style_data['archetype']} ({love_style_data['type']})"
    )


# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from typing import List

# from app.database import get_db
# from app.schemas.user import UserCreate, UserResponse, UserLogin, UserUpdate, PasswordChange
# from app.schemas.common import SuccessResponse
# from app.crud import user as crud_user

# router = APIRouter(prefix="/users", tags=["Users"])


# @router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
# def register_user(user: UserCreate, db: Session = Depends(get_db)):
#     """Register a new user"""
#     # Check if email already exists
#     db_user = crud_user.get_user_by_email(db, user.email)
#     if db_user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Email already registered"
#         )
    
#     # Check if username already exists
#     db_user = crud_user.get_user_by_username(db, user.username)
#     if db_user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Username already taken"
#         )
    
#     return crud_user.create_user(db, user)


# @router.post("/login", response_model=UserResponse)
# def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
#     """Login user"""
#     user = crud_user.authenticate_user(db, credentials.email, credentials.password)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect email or password"
#         )
    
#     if not user.is_active:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Account is deactivated"
#         )
    
#     return user


# @router.get("/{user_id}", response_model=UserResponse)
# def get_user(user_id: int, db: Session = Depends(get_db)):
#     """Get user by ID"""
#     user = crud_user.get_user_by_id(db, user_id)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="User not found"
#         )
#     return user


# @router.get("/", response_model=List[UserResponse])
# def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
#     """Get all users (paginated)"""
#     users = crud_user.get_all_users(db, skip=skip, limit=limit)
#     return users


# @router.put("/{user_id}", response_model=UserResponse)
# def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
#     """Update user information"""
#     user = crud_user.update_user(db, user_id, user_update)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="User not found"
#         )
#     return user


# @router.delete("/{user_id}", response_model=SuccessResponse)
# def delete_user(user_id: int, db: Session = Depends(get_db)):
#     """Delete user"""
#     success = crud_user.delete_user(db, user_id)
#     if not success:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="User not found"
#         )
#     return SuccessResponse(success=True, message="User deleted successfully")


# @router.post("/{user_id}/change-password", response_model=SuccessResponse)
# def change_password(
#     user_id: int,
#     password_change: PasswordChange,
#     db: Session = Depends(get_db)
# ):
#     """Change user password"""
#     user = crud_user.get_user_by_id(db, user_id)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="User not found"
#         )
    
#     if not crud_user.verify_password(password_change.old_password, user.password_hash):
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Incorrect old password"
#         )
    
#     user.password_hash = crud_user.get_password_hash(password_change.new_password)
#     db.commit()
    
#     return SuccessResponse(success=True, message="Password changed successfully")