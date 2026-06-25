"""
Test Gmail API with REAL user data from database
This script sends test emails using actual user names from your database
"""
import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.database import get_db
from app.models import User
from app.utils.gmail_api_service import (
    send_new_match_email,
    send_new_message_email,
    send_like_received_email,
)


async def test_with_real_users():
    """Test emails using real user data from database"""

    print("=" * 70)
    print("Testing Emails with Real User Data")
    print("=" * 70)

    # Get database session
    db = next(get_db())

    try:
        # Get first 2 users from database
        users = db.query(User).limit(2).all()

        if len(users) < 2:
            print("\n[ERROR] Need at least 2 users in database to test")
            print("Please add users first or use test_email_simple.py")
            return

        user1 = users[0]
        user2 = users[1]

        print(f"\n[INFO] Using real users from database:")
        print(f"  User 1: {user1.full_name} ({user1.email})")
        print(f"  User 2: {user2.full_name} ({user2.email})")

        # Test 1: Match Notification
        print("\n[TEST] Sending match notification...")
        print(f"  To: {user1.email}")
        print(f"  Match with: {user2.full_name}")

        await send_new_match_email(
            recipient_email=user1.email,
            recipient_name=user1.full_name,
            match_name=user2.full_name
        )
        print("[OK] Match email sent")

        await asyncio.sleep(1)

        # Test 2: Message Notification
        print("\n[TEST] Sending message notification...")
        print(f"  To: {user1.email}")
        print(f"  From: {user2.full_name}")

        await send_new_message_email(
            recipient_email=user1.email,
            recipient_name=user1.full_name,
            sender_name=user2.full_name,
            message_preview="Hey! I saw your profile and thought we'd have a lot in common!"
        )
        print("[OK] Message email sent")

        await asyncio.sleep(1)

        # Test 3: Like Notification
        print("\n[TEST] Sending like notification...")
        print(f"  To: {user1.email}")
        print(f"  From: {user2.full_name}")

        await send_like_received_email(
            recipient_email=user1.email,
            recipient_name=user1.full_name,
            liker_name=user2.full_name,
            is_super_like=True
        )
        print("[OK] Like email sent")

        print("\n" + "=" * 70)
        print("[DONE] All emails sent with REAL user names!")
        print("=" * 70)
        print(f"\nCheck inbox: {user1.email}")
        print("The emails should show actual names from your database:")
        print(f"  - Match: 'You matched with {user2.full_name}'")
        print(f"  - Message: 'New message from {user2.full_name}'")
        print(f"  - Like: '{user2.full_name} likes you'")

    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(test_with_real_users())
