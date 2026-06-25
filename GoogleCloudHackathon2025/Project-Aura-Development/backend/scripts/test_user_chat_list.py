"""
Test what chat list a specific user should see
This helps verify the get_enriched_chat_list function is working correctly
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.database import get_db
from app.crud.message import get_enriched_chat_list
from app.models import User


def test_user_chat_list(user_id: int):
    """Test chat list for a specific user"""

    print("=" * 80)
    print(f"TESTING CHAT LIST FOR USER {user_id}")
    print("=" * 80)

    db = next(get_db())

    try:
        # Get user info
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"[ERROR] User {user_id} not found!")
            return

        print(f"\n[INFO] User: {user.full_name} ({user.email})")
        print(f"[INFO] User ID: {user.id}")

        # Get chat list using CRUD function
        print("\n[INFO] Fetching chat list...")
        chat_list = get_enriched_chat_list(db, user_id)

        print(f"\n[INFO] Found {len(chat_list)} chats for this user:")
        print("-" * 80)

        for i, chat in enumerate(chat_list, 1):
            print(f"\n{i}. Chat Session {chat['sessionId']}:")
            print(f"   Name: {chat['name']}")
            print(f"   User ID: {chat['userId']}")
            print(f"   Last Message: {chat['message']}")
            print(f"   Time: {chat['time']}")
            print(f"   Unread: {chat['unread']}")
            print(f"   Verified: {chat['isVerified']}")
            print(f"   Blocked: {chat['isBlocked']}")

        print("\n" + "=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)

    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    # Test with User ID 1 (Justin Lew - appears in many chats)
    test_user_id = 1

    if len(sys.argv) > 1:
        test_user_id = int(sys.argv[1])

    test_user_chat_list(test_user_id)
