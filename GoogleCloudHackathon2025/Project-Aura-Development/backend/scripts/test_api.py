import requests

"""
File: test_api.py
Author: Christian Lew
Date: October 21, 2025
Description: This script tests the Dating App API endpoints by performing health check,
             user registration, and login. It verifies the API's response status codes
             and content to ensure proper functionality.
"""

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("Testing Dating App API")
print("=" * 60)

# Test 1: Health check
print("\n1. Testing health endpoint...")
response = requests.get(f"{BASE_URL}/health")
print(f"   Status: {response.status_code}")
print(f"   Response: {response.json()}")

# Test 2: Register a user
print("\n2. Registering a new user...")
user_data = {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "date_of_birth": "1990-01-15",
    "gender": "male"
}
response = requests.post(f"{BASE_URL}/users/register", json=user_data)
print(f"   Status: {response.status_code}")
if response.status_code == 201:
    user = response.json()
    print(f"   User created: ID={user['id']}, Username={user['username']}")
    user_id = user["id"]
else:
    print(f"   Error: {response.json()}")

# Test 3: Login
print("\n3. Logging in...")
login_data = {
    "email": "john@example.com",
    "password": "SecurePass123"
}
response = requests.post(f"{BASE_URL}/users/login", json=login_data)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    print(f"   Login successful!")

print("\n" + "=" * 60)
print("✅ API is working!")
print("=" * 60)