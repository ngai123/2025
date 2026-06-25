"""
Notification Service for Project Aura
Manages when and how to send notifications (email, push, etc.)
"""

from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.utils.gmail_api_service import (
    send_premium_confirmation_email,
    send_new_match_email,
    send_new_message_email,
    send_like_received_email,
    send_password_reset_email,
    send_welcome_email,
    send_premium_expiry_warning_email
)


class NotificationService:
    """
    Central service for managing all notifications.
    Checks user preferences and routes notifications to appropriate channels.
    """

    @staticmethod
    async def notify_premium_subscription(
        db: Session,
        user_email: str,
        user_name: str,
        expiry_date: datetime,
        subscription_period: str
    ):
        """Send premium subscription confirmation."""
        try:
            await send_premium_confirmation_email(
                recipient_email=user_email,
                recipient_name=user_name,
                expiry_date=expiry_date,
                subscription_period=subscription_period
            )
        except Exception as e:
            print(f"❌ Error sending premium subscription notification: {e}")

    @staticmethod
    async def notify_new_match(
        db: Session,
        user_email: str,
        user_name: str,
        match_name: str,
        match_photo_url: Optional[str] = None
    ):
        """Send new match notification."""
        # TODO: Check user notification preferences in database
        # For now, always send

        try:
            await send_new_match_email(
                recipient_email=user_email,
                recipient_name=user_name,
                match_name=match_name,
                match_photo_url=match_photo_url
            )
        except Exception as e:
            print(f"❌ Error sending new match notification: {e}")

    @staticmethod
    async def notify_new_message(
        db: Session,
        recipient_email: str,
        recipient_name: str,
        sender_name: str,
        message_preview: str
    ):
        """Send new message notification."""
        # TODO: Check user notification preferences in database
        # TODO: Implement rate limiting (don't spam for every message)

        try:
            await send_new_message_email(
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                sender_name=sender_name,
                message_preview=message_preview
            )
        except Exception as e:
            print(f"❌ Error sending new message notification: {e}")

    @staticmethod
    async def notify_like_received(
        db: Session,
        recipient_email: str,
        recipient_name: str,
        liker_name: str,
        is_super_like: bool = False
    ):
        """Send like received notification."""
        # TODO: Check user notification preferences in database
        # For super likes, always send. For regular likes, check preferences.

        try:
            await send_like_received_email(
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                liker_name=liker_name,
                is_super_like=is_super_like
            )
        except Exception as e:
            print(f"❌ Error sending like received notification: {e}")

    @staticmethod
    async def notify_password_reset(
        user_email: str,
        user_name: str,
        reset_token: str,
        reset_url: str
    ):
        """Send password reset email."""
        # Password reset emails should always be sent

        try:
            await send_password_reset_email(
                recipient_email=user_email,
                recipient_name=user_name,
                reset_token=reset_token,
                reset_url=reset_url
            )
        except Exception as e:
            print(f"❌ Error sending password reset notification: {e}")

    @staticmethod
    async def notify_welcome(
        user_email: str,
        user_name: str,
        verification_token: Optional[str] = None,
        verification_url: Optional[str] = None
    ):
        """Send welcome email to new users."""
        try:
            await send_welcome_email(
                recipient_email=user_email,
                recipient_name=user_name,
                verification_token=verification_token,
                verification_url=verification_url
            )
        except Exception as e:
            print(f"❌ Error sending welcome notification: {e}")

    @staticmethod
    async def notify_premium_expiry_warning(
        db: Session,
        user_email: str,
        user_name: str,
        days_remaining: int,
        expiry_date: datetime
    ):
        """Send premium expiry warning."""
        try:
            await send_premium_expiry_warning_email(
                recipient_email=user_email,
                recipient_name=user_name,
                days_remaining=days_remaining,
                expiry_date=expiry_date
            )
        except Exception as e:
            print(f"❌ Error sending premium expiry warning: {e}")


# Convenience functions for easy import
async def send_premium_notification(*args, **kwargs):
    """Backward compatible function for premium notifications."""
    await NotificationService.notify_premium_subscription(*args, **kwargs)


async def send_match_notification(*args, **kwargs):
    """Send match notification."""
    await NotificationService.notify_new_match(*args, **kwargs)


async def send_message_notification(*args, **kwargs):
    """Send message notification."""
    await NotificationService.notify_new_message(*args, **kwargs)


async def send_like_notification(*args, **kwargs):
    """Send like notification."""
    await NotificationService.notify_like_received(*args, **kwargs)
