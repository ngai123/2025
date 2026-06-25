"""
Test script for Gmail API integration
Run: python -m app.utils.test_gmail_api
"""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.utils.gmail_api_service import (
    send_premium_confirmation_email,
    send_new_match_email,
    send_new_message_email,
    send_like_received_email,
    send_welcome_email,
    send_premium_expiry_warning_email,
    get_email_service
)


# ⚠️ CHANGE THIS TO YOUR TEST EMAIL ADDRESS
TEST_EMAIL = "cheefeng21@gmail.com"


async def test_service_initialization():
    """Test that the email service initializes correctly."""
    print("\n🔧 Testing Email Service Initialization...")

    email_service = get_email_service()

    if email_service.use_gmail_api:
        print("✅ Gmail API initialized successfully")
    else:
        print("⚠️ Gmail API not configured, using SMTP fallback")

    print(f"   Sender: {email_service._create_mime_message(TEST_EMAIL, 'Test', 'Test')['From']}")


async def test_premium_email():
    """Test premium confirmation email."""
    print("\n📧 Testing Premium Confirmation Email...")

    try:
        await send_premium_confirmation_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            expiry_date=datetime.now() + timedelta(days=30),
            subscription_period="1 Month"
        )
        print("✅ Premium confirmation email sent successfully")
    except Exception as e:
        print(f"❌ Failed to send premium confirmation email: {e}")


async def test_match_email():
    """Test match notification email."""
    print("\n💖 Testing Match Notification Email...")

    try:
        await send_new_match_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            match_name="Jane Smith",
            match_photo_url="https://i.pravatar.cc/300?img=5"
        )
        print("✅ Match notification email sent successfully")
    except Exception as e:
        print(f"❌ Failed to send match notification email: {e}")


async def test_message_email():
    """Test new message notification email."""
    print("\n💬 Testing New Message Email...")

    try:
        await send_new_message_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            sender_name="Jane Smith",
            message_preview="Hey! How are you doing? I saw your profile and thought we'd have a lot in common!"
        )
        print("✅ New message email sent successfully")
    except Exception as e:
        print(f"❌ Failed to send new message email: {e}")


async def test_like_email():
    """Test like received notification email."""
    print("\n❤️ Testing Like Received Email (Regular)...")

    try:
        await send_like_received_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            liker_name="Sarah Johnson",
            is_super_like=False
        )
        print("✅ Like received email sent successfully")
    except Exception as e:
        print(f"❌ Failed to send like received email: {e}")


async def test_super_like_email():
    """Test super like received notification email."""
    print("\n⭐ Testing Super Like Received Email...")

    try:
        await send_like_received_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            liker_name="Emma Wilson",
            is_super_like=True
        )
        print("✅ Super like received email sent successfully")
    except Exception as e:
        print(f"❌ Failed to send super like received email: {e}")


async def test_welcome_email():
    """Test welcome email."""
    print("\n🎉 Testing Welcome Email...")

    try:
        await send_welcome_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            verification_token="test_token_123456",
            verification_url="https://your-app-url.com/verify"
        )
        print("✅ Welcome email sent successfully")
    except Exception as e:
        print(f"❌ Failed to send welcome email: {e}")


async def test_premium_expiry_warning():
    """Test premium expiry warning email."""
    print("\n⚠️ Testing Premium Expiry Warning Email...")

    try:
        await send_premium_expiry_warning_email(
            recipient_email=TEST_EMAIL,
            recipient_name="John Doe",
            days_remaining=3,
            expiry_date=datetime.now() + timedelta(days=3)
        )
        print("✅ Premium expiry warning email sent successfully")
    except Exception as e:
        print(f"❌ Failed to send premium expiry warning email: {e}")


def print_banner():
    """Print test suite banner."""
    print("\n" + "=" * 70)
    print(" " * 15 + "Gmail API Email Service Test Suite")
    print("=" * 70)


def print_footer():
    """Print test suite footer."""
    print("\n" + "=" * 70)
    print("✅ All tests completed!")
    print("=" * 70)
    print("\n📬 Check your inbox at:", TEST_EMAIL)
    print("📁 Check spam folder if emails not visible in inbox")
    print("\n💡 Tips:")
    print("   - Wait a few seconds for emails to arrive")
    print("   - If using Gmail API, check Google Cloud Console for API calls")
    print("   - If using SMTP, check .env file has correct credentials")
    print("   - Review console output above for any error messages")
    print()


async def run_all_tests():
    """Run all email tests."""
    print_banner()

    # Check if test email is configured
    if TEST_EMAIL == "your-test-email@gmail.com":
        print("\n❌ ERROR: Please update TEST_EMAIL in test_gmail_api.py")
        print("   Change line 19 to your actual email address")
        return

    # Run tests
    await test_service_initialization()
    await asyncio.sleep(1)

    await test_premium_email()
    await asyncio.sleep(1)

    await test_match_email()
    await asyncio.sleep(1)

    await test_message_email()
    await asyncio.sleep(1)

    await test_like_email()
    await asyncio.sleep(1)

    await test_super_like_email()
    await asyncio.sleep(1)

    await test_welcome_email()
    await asyncio.sleep(1)

    await test_premium_expiry_warning()

    print_footer()


async def run_single_test(test_name: str):
    """Run a single test by name."""
    tests = {
        "premium": test_premium_email,
        "match": test_match_email,
        "message": test_message_email,
        "like": test_like_email,
        "super_like": test_super_like_email,
        "welcome": test_welcome_email,
        "expiry": test_premium_expiry_warning,
        "init": test_service_initialization
    }

    if test_name not in tests:
        print(f"❌ Unknown test: {test_name}")
        print(f"Available tests: {', '.join(tests.keys())}")
        return

    print_banner()
    await tests[test_name]()
    print_footer()


def main():
    """Main entry point."""
    import sys

    if len(sys.argv) > 1:
        # Run specific test
        test_name = sys.argv[1]
        asyncio.run(run_single_test(test_name))
    else:
        # Run all tests
        asyncio.run(run_all_tests())


if __name__ == "__main__":
    main()
