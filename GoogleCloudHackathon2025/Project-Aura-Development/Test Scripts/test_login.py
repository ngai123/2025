"""
Test script to verify login functionality with existing users
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    print("=" * 60)
    print("TESTING LOGIN FUNCTIONALITY")
    print("=" * 60)

    # You need to provide credentials for an existing user
    # Replace these with actual test credentials
    email = input("Enter email: ")
    password = input("Enter password: ")

    print(f"\nAttempting to login with email: {email}")

    try:
        response = requests.post(
            f"{BASE_URL}/users/login",
            json={"email": email, "password": password}
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("[SUCCESS] Login successful!")
            print(f"  User ID: {data['user']['id']}")
            print(f"  Username: {data['user']['username']}")
            print(f"  Email: {data['user']['email']}")
            print(f"  Token: {data['access_token'][:30]}...")
            return True
        else:
            print(f"[ERROR] Login failed")
            print(f"  Response: {response.text}")
            return False

    except Exception as e:
        print(f"[ERROR] Exception occurred: {e}")
        return False

if __name__ == "__main__":
    test_login()
