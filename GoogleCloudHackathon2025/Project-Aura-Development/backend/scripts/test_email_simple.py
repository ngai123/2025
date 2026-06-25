"""
Simple Gmail API Test - Windows Compatible (No Emojis)
"""
import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.utils.gmail_api_service import (
    send_premium_confirmation_email,
    send_new_match_email,
    send_new_message_email,
    send_like_received_email,
    send_welcome_email,
    get_email_service
)

# Test email address
TEST_EMAIL = "cheefeng21@gmail.com"


async def test_service_init():
    """Test service initialization"""
    print("\n[TEST] Email Service Initialization...")
    email_service = get_email_service()

    if email_service.use_gmail_api:
        print("[OK] Gmail API initialized successfully")
    else:
        print("[INFO] Using SMTP fallback")


async def test_premium_email():
    """Test premium confirmation email"""
    print("\n[TEST] Premium Confirmation Email...")

    try:
        await send_premium_confirmation_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            expiry_date=datetime.now() + timedelta(days=30),
            subscription_period="1 Month"
        )
        print("[OK] Premium email sent successfully")
    except Exception as e:
        print(f"[ERROR] Failed: {e}")


async def test_match_email():
    """Test match notification email"""
    print("\n[TEST] Match Notification Email...")

    try:
        await send_new_match_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            match_name="Jane Smith"
        )
        print("[OK] Match email sent successfully")
    except Exception as e:
        print(f"[ERROR] Failed: {e}")


async def test_message_email():
    """Test new message email"""
    print("\n[TEST] New Message Email...")

    try:
        await send_new_message_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            sender_name="Jane Smith",
            message_preview="Hey! How are you doing?"
        )
        print("[OK] Message email sent successfully")
    except Exception as e:
        print(f"[ERROR] Failed: {e}")


async def test_like_email():
    """Test like received email"""
    print("\n[TEST] Like Received Email...")

    try:
        await send_like_received_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            liker_name="Sarah Johnson",
            is_super_like=True
        )
        print("[OK] Like email sent successfully")
    except Exception as e:
        print(f"[ERROR] Failed: {e}")


async def test_welcome_email():
    """Test welcome email"""
    print("\n[TEST] Welcome Email...")

    try:
        await send_welcome_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe"
        )
        print("[OK] Welcome email sent successfully")
    except Exception as e:
        print(f"[ERROR] Failed: {e}")


async def main():
    print("=" * 70)
    print("Gmail API Email Service Test - Windows Compatible")
    print("=" * 70)
    print(f"Test email: {TEST_EMAIL}")

    await test_service_init()
    await asyncio.sleep(1)

    await test_premium_email()
    await asyncio.sleep(1)

    await test_match_email()
    await asyncio.sleep(1)

    await test_message_email()
    await asyncio.sleep(1)

    await test_like_email()
    await asyncio.sleep(1)

    await test_welcome_email()

    print("\n" + "=" * 70)
    print("[DONE] All tests completed!")
    print("=" * 70)
    print(f"\nCheck your inbox at: {TEST_EMAIL}")
    print("(Also check spam folder if emails not visible)")


if __name__ == "__main__":
    asyncio.run(main())
