"""
Test script to verify the complete authentication flow
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_full_flow():
    print("=" * 60)
    print("TESTING FULL AUTHENTICATION FLOW")
    print("=" * 60)

    # Step 1: Register a new user
    print("\n1. Registering new user...")
    register_data = {
        "username": f"testuser_{int(__import__('time').time())}",
        "email": f"test_{int(__import__('time').time())}@example.com",
        "password": "TestPassword123!",
        "phone_number": "+1234567890",
        "date_of_birth": "1990-01-01",
        "gender": "male"
    }

    try:
        response = requests.post(f"{BASE_URL}/users/register", json=register_data)
        print(f"   Status: {response.status_code}")

        if response.status_code != 201:
            print(f"   ERROR: {response.text}")
            return

        data = response.json()
        print(f"   [OK] User registered with ID: {data['user']['id']}")
        print(f"   [OK] Token received: {data['access_token'][:30]}...")

        token = data['access_token']
        user_id = data['user']['id']

    except Exception as e:
        print(f"   ERROR: {e}")
        return

    # Step 2: Test accessing /profile/me with the token
    print("\n2. Accessing /profile/me with token...")
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(f"{BASE_URL}/profile/me", headers=headers)
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Profile retrieved successfully")
            print(f"   [OK] User ID: {data.get('user_id')}")
            print(f"   [OK] Username: {data.get('username')}")
            print(f"   [OK] First name: {data.get('first_name')}")
        else:
            print(f"   ERROR: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"   ERROR: {e}")
        return

    print("\n" + "=" * 60)
    print("TEST COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    test_full_flow()
