# app/schemas/premium.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class PaymentDetails(BaseModel):
    """
    Schema for mock payment details.
    Frontend sends this, but backend won't process it for mock.
    """
    cardNumber: str
    expiry: str
    cvc: str
    cardName: str

class PremiumSubscriptionRequest(BaseModel):
    """
    Schema for the incoming request to process a premium subscription.
    """
    userId: int
    subscriptionPeriod: str # e.g., "1 Week", "1 Month", "3 Months"
    paymentDetails: PaymentDetails # The fake payment data from the frontend

class PremiumSubscriptionResponse(BaseModel):
    """
    Schema for the response after a successful premium subscription.
    """
    message: str
    premiumExpiryDate: datetime
    subscriptionPeriod: str