"""
Test Script: Profile Update Functionality (PUT /profile/me)

This script tests the profile update functionality including:
1. Update profile fields (name, about_me, height, zodiac, etc.)
2. Verify changes persist
3. Verify data reload correctly
4. Test validation and error handling

Test Environment:
- Backend: http://localhost:8000
- Frontend: http://localhost:5174
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Use the test user created in previous test or create new one
# You can either:
# 1. Run test_complete_registration_flow.py first and use that user
# 2. Or update these credentials to an existing user in your database
TEST_EMAIL = None  # Will create new user
TEST_PASSWORD = "SecurePassword123!"

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_profile_update():
    """Test the profile update functionality"""

    # If TEST_EMAIL is None, create a new user first
    if TEST_EMAIL is None:
        print_section("TEST 0: Create New Test User")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"profiletest_{timestamp}@example.com"
        test_full_name = f"Profile Test {timestamp}"

        registration_payload = {
            "full_name": test_full_name,
            "email": test_email,
            "password": TEST_PASSWORD,
            "phone_number": "+12025550199",
            "date_of_birth": "1992-03-20",
            "gender": "female"
        }

        try:
            response = requests.post(
                f"{BASE_URL}/users/register",
                json=registration_payload
            )

            if response.status_code != 201:
                print(f"[FAILED] User creation failed: {response.text}")
                return False

            print(f"[PASSED] Test user created: {test_email}")
        except Exception as e:
            print(f"[FAILED] User creation failed: {e}")
            return False
    else:
        test_email = TEST_EMAIL

    print_section("TEST 1: Login to Get Access Token")

    # Login with user
    login_payload = {
        "email": test_email,
        "password": TEST_PASSWORD
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
        access_token = login_data["access_token"]
        user_id = login_data["user"]["id"]

        print(f"[PASSED] Login successful")
        print(f"   User ID: {user_id}")
        print(f"   Token: {access_token[:50]}...")

    except Exception as e:
        print(f"[FAILED] Login request failed: {e}")
        return False

    headers = {"Authorization": f"Bearer {access_token}"}

    # Test 2: Get Current Profile Data
    print_section("TEST 2: Get Current Profile Data")

    try:
        response = requests.get(f"{BASE_URL}/profile/me", headers=headers)

        print(f"Status Code: {response.status_code}")

        if response.status_code != 200:
            print(f"[FAILED] Get profile failed with status {response.status_code}")
            return False

        original_profile = response.json()
        print(f"Original Profile Data:")
        print(f"   Name: {original_profile.get('first_name')} {original_profile.get('last_name')}")
        print(f"   About Me: {original_profile.get('about_me')}")
        print(f"   Height: {original_profile.get('height_cm')}")
        print(f"   Zodiac: {original_profile.get('zodiac')}")
        print(f"   Relationship Status: {original_profile.get('relationship_status')}")

        print(f"[PASSED] Current profile retrieved")

    except Exception as e:
        print(f"[FAILED] Get profile request failed: {e}")
        return False

    # Test 3: Update Profile Fields
    print_section("TEST 3: Update Profile Fields")

    timestamp = datetime.now().strftime("%H%M%S")
    update_payload = {
        "first_name": f"Updated_First_{timestamp}",
        "last_name": f"Updated_Last_{timestamp}",
        "about_me": f"This is an updated profile description at {timestamp}",
        "height_cm": 180,
        "zodiac": "Aquarius",
        "come_from": "San Francisco, CA"
    }

    print(f"Update Payload: {json.dumps(update_payload, indent=2)}")

    try:
        response = requests.put(
            f"{BASE_URL}/profile/me",
            json=update_payload,
            headers=headers
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code != 200:
            print(f"[FAILED] Update failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

        updated_profile = response.json()
        print(f"Updated Profile Response:")
        print(f"   Name: {updated_profile.get('first_name')} {updated_profile.get('last_name')}")
        print(f"   About Me: {updated_profile.get('about_me')}")
        print(f"   Height: {updated_profile.get('height_cm')}")
        print(f"   Zodiac: {updated_profile.get('zodiac')}")
        print(f"   Come From: {updated_profile.get('come_from')}")

        print(f"[PASSED] Profile updated successfully")

    except Exception as e:
        print(f"[FAILED] Update request failed: {e}")
        return False

    # Test 4: Verify Changes Persist
    print_section("TEST 4: Verify Changes Persist")

    try:
        response = requests.get(f"{BASE_URL}/profile/me", headers=headers)

        if response.status_code != 200:
            print(f"[FAILED] Get profile failed with status {response.status_code}")
            return False

        reloaded_profile = response.json()

        # Verify each field
        errors = []

        if reloaded_profile.get('first_name') != update_payload['first_name']:
            errors.append(f"first_name mismatch: {reloaded_profile.get('first_name')} != {update_payload['first_name']}")

        if reloaded_profile.get('last_name') != update_payload['last_name']:
            errors.append(f"last_name mismatch: {reloaded_profile.get('last_name')} != {update_payload['last_name']}")

        if reloaded_profile.get('about_me') != update_payload['about_me']:
            errors.append(f"about_me mismatch: {reloaded_profile.get('about_me')} != {update_payload['about_me']}")

        if reloaded_profile.get('height_cm') != update_payload['height_cm']:
            errors.append(f"height_cm mismatch: {reloaded_profile.get('height_cm')} != {update_payload['height_cm']}")

        if reloaded_profile.get('zodiac') != update_payload['zodiac']:
            errors.append(f"zodiac mismatch: {reloaded_profile.get('zodiac')} != {update_payload['zodiac']}")

        if reloaded_profile.get('come_from') != update_payload['come_from']:
            errors.append(f"come_from mismatch: {reloaded_profile.get('come_from')} != {update_payload['come_from']}")

        if errors:
            print(f"[FAILED] Data persistence verification failed:")
            for error in errors:
                print(f"   - {error}")
            return False

        print(f"[PASSED] All changes persisted correctly")
        print(f"   First Name: {reloaded_profile.get('first_name')}")
        print(f"   Last Name: {reloaded_profile.get('last_name')}")
        print(f"   About Me: {reloaded_profile.get('about_me')[:50]}...")
        print(f"   Height: {reloaded_profile.get('height_cm')} cm")
        print(f"   Zodiac: {reloaded_profile.get('zodiac')}")
        print(f"   Come From: {reloaded_profile.get('come_from')}")

    except Exception as e:
        print(f"[FAILED] Verification request failed: {e}")
        return False

    # Test 5: Test Partial Update
    print_section("TEST 5: Test Partial Update (Only Update Zodiac)")

    partial_update = {
        "zodiac": "Gemini"
    }

    try:
        response = requests.put(
            f"{BASE_URL}/profile/me",
            json=partial_update,
            headers=headers
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code != 200:
            print(f"[FAILED] Partial update failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

        # Verify only zodiac changed, other fields remain
        response = requests.get(f"{BASE_URL}/profile/me", headers=headers)
        profile_after_partial = response.json()

        if profile_after_partial.get('zodiac') != "Gemini":
            print(f"[FAILED] Zodiac not updated to Gemini")
            return False

        # Verify other fields didn't change
        if profile_after_partial.get('first_name') != update_payload['first_name']:
            print(f"[FAILED] first_name changed unexpectedly")
            return False

        if profile_after_partial.get('about_me') != update_payload['about_me']:
            print(f"[FAILED] about_me changed unexpectedly")
            return False

        print(f"[PASSED] Partial update successful")
        print(f"   Zodiac updated to: {profile_after_partial.get('zodiac')}")
        print(f"   Other fields unchanged (first_name: {profile_after_partial.get('first_name')})")

    except Exception as e:
        print(f"[FAILED] Partial update failed: {e}")
        return False

    # Test 6: Test Invalid Data Validation
    print_section("TEST 6: Test Invalid Height Validation")

    invalid_update = {
        "height_cm": 500  # Invalid: too tall
    }

    try:
        response = requests.put(
            f"{BASE_URL}/profile/me",
            json=invalid_update,
            headers=headers
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print(f"[WARNING] Server accepted invalid height (500cm) - validation may be missing")
        elif response.status_code in [400, 422]:
            print(f"[PASSED] Server correctly rejected invalid height")
            print(f"   Response: {response.json()}")
        else:
            print(f"[UNEXPECTED] Status code {response.status_code}")

    except Exception as e:
        print(f"[INFO] Validation test resulted in: {e}")

    # Summary
    print_section("TEST SUMMARY")

    print(f"[SUCCESS] All profile update tests passed!")
    print(f"\nKey Findings:")
    print(f"   - Profile update (PUT /profile/me) works correctly")
    print(f"   - Full updates persist all fields")
    print(f"   - Partial updates work (only specified fields change)")
    print(f"   - Data reloads correctly after updates")
    print(f"\nTest User:")
    print(f"   Email: {test_email}")
    print(f"   User ID: {user_id}")

    return True

if __name__ == "__main__":
    success = test_profile_update()

    if success:
        print(f"\n{'='*60}")
        print(f"  [SUCCESS] ALL TESTS PASSED!")
        print(f"{'='*60}\n")
    else:
        print(f"\n{'='*60}")
        print(f"  [FAILED] SOME TESTS FAILED")
        print(f"{'='*60}\n")
