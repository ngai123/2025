# app/routers/payment.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db # Assuming you have a get_db function for SQLAlchemy sessions
from app.models import User, PremiumUser, Profile # Import your models
from app.schemas.premium import PremiumSubscriptionRequest, PremiumSubscriptionResponse
from app.utils.email_sender import send_premium_confirmation_email

router = APIRouter(
    prefix="/payment",
    tags=["Payment"],
)

@router.post("/process-mock", response_model=PremiumSubscriptionResponse)
async def process_mock_payment(
    request: PremiumSubscriptionRequest,
    db: Session = Depends(get_db)
):
    """
    Processes a mock payment for premium subscription and sends a confirmation email.
    """
    user_id = request.userId
    subscription_period = request.subscriptionPeriod

    # 1. Retrieve User and Profile
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    
    # Get user's profile for first name (for email salutation)
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    recipient_name = profile.first_name if profile and profile.first_name else user.full_name

    # 2. Calculate Expiry Date
    current_time = datetime.utcnow()
    end_date = current_time

    if subscription_period == "1 Week":
        end_date += timedelta(weeks=1)
    elif subscription_period == "1 Month":
        # For months, it's better to add a month directly to handle varying days
        # This is a simple approach; for more robust date math, consider dateutil
        end_date = current_time.replace(month=current_time.month % 12 + 1)
        if current_time.month == 12: # Handle year rollover
            end_date = end_date.replace(year=current_time.year + 1)
    elif subscription_period == "3 Months":
        end_date = current_time.replace(month=(current_time.month + 2) % 12 + 1) # +2 for 3 months total
        if current_time.month > 9: # Handle year rollover for 3 months
            end_date = end_date.replace(year=current_time.year + 1)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subscription period: {subscription_period}. Must be '1 Week', '1 Month', or '3 Months'."
        )

    # 3. Update/Create PremiumUser Record
    premium_record = db.query(PremiumUser).filter(PremiumUser.user_id == user_id).first()

    if premium_record:
        # Update existing premium record
        premium_record.start_date = current_time
        premium_record.end_date = end_date
        premium_record.is_active = True
    else:
        # Create new premium record
        premium_record = PremiumUser(
            user_id=user_id,
            start_date=current_time,
            end_date=end_date,
            is_active=True
        )
        db.add(premium_record)
    
    db.commit()
    db.refresh(premium_record) # Refresh to get any auto-generated fields if needed

    # 4. Send Confirmation Email (asynchronous call)
    # It's good practice to run email sending in a background task to not block the API response.
    # For simplicity here, we'll await it. For production, consider FastAPI's BackgroundTasks.
    await send_premium_confirmation_email(
        recipient_email=user.email,
        recipient_name=recipient_name,
        expiry_date=end_date,
        subscription_period=subscription_period
    )

    # 5. Return Response
    return PremiumSubscriptionResponse(
        message="Premium subscription successful and confirmation email sent!",
        premiumExpiryDate=end_date,
        subscriptionPeriod=subscription_period
    )