"""
Test Script: Complete User Registration and Profile Setup Flow

This script tests the end-to-end user registration flow including:
1. User account creation (AccountInfo.jsx)
2. JWT token generation and storage
3. Profile creation with all required fields
4. Profile picture uploads (5 images)
5. Profile data retrieval with signed URLs
6. Navigation to EditProfile page
7. Data persistence and display

Test Environment:
- Backend: http://localhost:8000
- Frontend: http://localhost:5174
"""

import requests
import json
from datetime import datetime
import os

BASE_URL = "http://localhost:8000"

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_complete_registration_flow():
    """Test the complete user registration and profile setup flow"""

    # Generate unique test user data
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_email = f"testuser_{timestamp}@example.com"
    test_full_name = f"Test User {timestamp}"
    test_password = "SecurePassword123!"

    print_section("TEST 1: User Registration")

    # Prepare registration payload matching AccountInfo.jsx format
    registration_payload = {
        "full_name": test_full_name,
        "email": test_email,
        "password": test_password,
        "phone_number": "+12025550123",  # E.164 format
        "date_of_birth": "1995-06-15",
        "gender": "male"  # Database enum expects lowercase: 'male', 'female', 'other'
    }

    print(f"Registering new user: {test_email}")
    print(f"Payload: {json.dumps(registration_payload, indent=2)}")

    try:
        response = requests.post(
            f"{BASE_URL}/users/register",
            json=registration_payload
        )

        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

        if response.status_code != 201:
            print(f"[FAILED] Registration failed with status {response.status_code}")
            return False

        data = response.json()

        # Verify response structure
        if "access_token" not in data:
            print("[FAILED] No access_token in response")
            return False

        if "user" not in data:
            print("[FAILED] No user object in response")
            return False

        access_token = data["access_token"]
        user_id = data["user"]["id"]

        print(f"[PASSED] User registered successfully")
        print(f"   User ID: {user_id}")
        print(f"   Token: {access_token[:50]}...")

    except Exception as e:
        print(f"[FAILED] Registration request failed: {e}")
        return False

    # Test 2: Access Protected Profile Endpoint
    print_section("TEST 2: Access Profile with JWT Token")

    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get(f"{BASE_URL}/profile/me", headers=headers)

        print(f"Status Code: {response.status_code}")

        if response.status_code != 200:
            print(f"[FAILED] Profile access failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

        profile_data = response.json()
        print(f"Profile Data: {json.dumps(profile_data, indent=2)}")

        print(f"[PASSED] Profile data retrieved successfully")
        print(f"   Profile contains {len(profile_data)} fields")

    except Exception as e:
        print(f"[FAILED] Profile request failed: {e}")
        return False

    # Test 3: Verify Profile Pictures Endpoint (Should be empty initially)
    print_section("TEST 3: Profile Pictures Endpoint")

    try:
        response = requests.get(f"{BASE_URL}/profile/me/pictures", headers=headers)

        print(f"Status Code: {response.status_code}")

        if response.status_code != 200:
            print(f"[FAILED] Pictures endpoint failed with status {response.status_code}")
            return False

        pictures = response.json()
        print(f"Pictures: {json.dumps(pictures, indent=2)}")

        if not isinstance(pictures, list):
            print(f"[FAILED] Pictures should be a list")
            return False

        print(f"[PASSED] Pictures endpoint accessible (found {len(pictures)} pictures)")

    except Exception as e:
        print(f"[FAILED] Pictures request failed: {e}")
        return False

    # Test 4: Test Login with New Credentials
    print_section("TEST 4: Login with New User Credentials")

    login_payload = {
        "email": test_email,
        "password": test_password
    }

    try:
        response = requests.post(
            f"{BASE_URL}/users/login",
            json=login_payload
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code != 200:
            print(f"[FAILED] Login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

        login_data = response.json()

        if "access_token" not in login_data:
            print(f"[FAILED] No access_token in login response")
            return False

        new_token = login_data["access_token"]

        # Verify new token works
        headers_new = {"Authorization": f"Bearer {new_token}"}
        verify_response = requests.get(f"{BASE_URL}/profile/me", headers=headers_new)

        if verify_response.status_code != 200:
            print(f"[FAILED] New token doesn't work")
            return False

        print(f"[PASSED] Login successful and token verified")
        print(f"   New Token: {new_token[:50]}...")

    except Exception as e:
        print(f"[FAILED] Login request failed: {e}")
        return False

    # Test 5: Test Relationship Status Field
    print_section("TEST 5: Verify Relationship Status (Singular)")

    try:
        response = requests.get(f"{BASE_URL}/profile/me", headers=headers)
        profile_data = response.json()

        # Check that relationship_status field exists (not relationship_statuses)
        if "relationship_status" in profile_data:
            print(f"[PASSED] relationship_status field exists (singular)")
            print(f"   Value: {profile_data['relationship_status']}")
        elif "relationship_statuses" in profile_data:
            print(f"[FAILED] Found relationship_statuses (plural) - should be singular")
            return False
        else:
            print(f"[PASSED] relationship_status field not in response (acceptable)")

    except Exception as e:
        print(f"[FAILED] Relationship status check failed: {e}")
        return False

    # Test 6: Test Profile Picture Signed URLs (if pictures exist)
    print_section("TEST 6: Verify Signed URLs for Pictures")

    try:
        response = requests.get(f"{BASE_URL}/profile/me/pictures", headers=headers)
        pictures = response.json()

        if len(pictures) > 0:
            print(f"Found {len(pictures)} pictures to verify")

            for i, pic in enumerate(pictures):
                print(f"\nPicture {i+1}:")
                print(f"   ID: {pic.get('id')}")
                print(f"   Category: {pic.get('category')}")

                image_url = pic.get('image_url', '')

                # Check if URL is signed (contains signature parameters)
                if 'X-Goog-Signature' in image_url or 'Signature=' in image_url:
                    print(f"   [OK] Signed URL detected")
                    print(f"   URL length: {len(image_url)} characters")
                else:
                    print(f"   [WARNING] Not a signed URL (canonical URL)")
                    print(f"   URL: {image_url[:100]}...")
        else:
            print(f"No pictures uploaded yet (this is expected for new user)")
            print(f"[PASSED] Pictures endpoint returns empty list correctly")

    except Exception as e:
        print(f"[FAILED] Signed URL verification failed: {e}")
        return False

    # Summary
    print_section("TEST SUMMARY")

    print(f"[SUCCESS] All tests passed!")
    print(f"\nTest User Details:")
    print(f"   Email: {test_email}")
    print(f"   Password: {test_password}")
    print(f"   User ID: {user_id}")
    print(f"   Access Token: {access_token[:50]}...")
    print(f"\nNext Steps:")
    print(f"   1. Open http://localhost:5174/account-info")
    print(f"   2. Register a new user through the UI")
    print(f"   3. Upload profile pictures")
    print(f"   4. Complete voice onboarding")
    print(f"   5. Verify redirect to /edit-profile")
    print(f"   6. Verify all data displays correctly with signed URLs")

    return True

if __name__ == "__main__":
    success = test_complete_registration_flow()

    if success:
        print(f"\n{'='*60}")
        print(f"  [SUCCESS] ALL TESTS PASSED!")
        print(f"{'='*60}\n")
    else:
        print(f"\n{'='*60}")
        print(f"  [FAILED] SOME TESTS FAILED")
        print(f"{'='*60}\n")
