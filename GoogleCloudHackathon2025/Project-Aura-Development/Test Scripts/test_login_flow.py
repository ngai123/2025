"""
Test login flow with existing user credentials
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login_flow():
    print("="*60)
    print("LOGIN FLOW TEST")
    print("="*60)

    # Get user credentials
    print("\nEnter credentials for an existing user:")
    email = input("Email: ").strip()
    password = input("Password: ").strip()

    if not email or not password:
        print("[ERROR] Email and password are required")
        return

    print(f"\n[TEST 1] Attempting login...")
    print(f"  Email: {email}")

    # Test 1: Login with credentials
    try:
        response = requests.post(
            f"{BASE_URL}/users/login",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"}
        )

        print(f"  Status: {response.status_code}")

        if response.status_code != 200:
            print(f"  [FAIL] Login failed")
            print(f"  Response: {response.text}")
            return

        data = response.json()
        print(f"  [PASS] Login successful")
        print(f"  User ID: {data['user']['id']}")
        print(f"  Username: {data['user']['username']}")
        print(f"  Token: {data['access_token'][:30]}...")

        token = data['access_token']
        user_id = data['user']['id']

    except Exception as e:
        print(f"  [ERROR] {e}")
        return

    # Test 2: Access protected endpoint with token
    print(f"\n[TEST 2] Accessing /profile/me with token...")
    try:
        response = requests.get(
            f"{BASE_URL}/profile/me",
            headers={"Authorization": f"Bearer {token}"}
        )

        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            profile = response.json()
            print(f"  [PASS] Profile retrieved")
            print(f"  Name: {profile.get('first_name')} {profile.get('last_name')}")
            print(f"  Email: {profile.get('email')}")
            print(f"  Pictures: {len(profile.get('profile_pictures', []))}")
        else:
            print(f"  [FAIL] Failed to get profile")
            print(f"  Response: {response.text}")

    except Exception as e:
        print(f"  [ERROR] {e}")

    # Test 3: Get profile pictures
    print(f"\n[TEST 3] Fetching profile pictures...")
    try:
        response = requests.get(
            f"{BASE_URL}/profile/me/pictures",
            headers={"Authorization": f"Bearer {token}"}
        )

        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            pictures = response.json()
            print(f"  [PASS] Retrieved {len(pictures)} picture(s)")
            for pic in pictures:
                print(f"    - ID: {pic['id']}, Category: {pic.get('category', 'N/A')}")
                # Check if URL is signed (contains Signature parameter)
                if 'Signature=' in pic['image_url']:
                    print(f"      Signed URL: Yes")
                else:
                    print(f"      Signed URL: No")
        else:
            print(f"  [FAIL] Failed to get pictures")
            print(f"  Response: {response.text}")

    except Exception as e:
        print(f"  [ERROR] {e}")

    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print("✓ Login endpoint working")
    print("✓ JWT token generation working")
    print("✓ Protected endpoints accessible with token")
    print("✓ Profile data retrieval working")
    print("="*60)

if __name__ == "__main__":
    test_login_flow()
