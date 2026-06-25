# File: test_advice_endpoint.py
# Author: Christian Lew
# Date: November 20, 2025
# Description: Test script for the relationship advice RAG endpoint.


import requests
import os

# --- Configuration ---
# Assuming the FastAPI server is running on localhost port 8000
BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
ADVICE_ENDPOINT = f"{BASE_URL}/api/v1/advice"
HEALTH_ENDPOINT = f"{ADVICE_ENDPOINT}/health"

# --- Test Cases ---

def test_health_check():
    """
    Tests if the advice service health check endpoint is responsive.
    """
    print("--- Running Test: Health Check ---")
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=10)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        data = response.json()
        print(f"Health check status: {data.get('status')}")
        
        assert response.status_code == 200
        assert "status" in data
        assert data["status"] in ["healthy", "initializing"], f"Unexpected status: {data.get('status')}"

        if data["status"] == "healthy":
            assert data["vector_store_initialized"] is True
            assert data["qa_chain_initialized"] is True
        
        print("✅ Health Check Test Passed")
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Health Check Test Failed: Could not connect to the server. {e}")
        print("   Please ensure the backend server is running.")
        return False
    except Exception as e:
        print(f"❌ Health Check Test Failed: {e}")
        return False


def test_get_advice_valid_question():
    """
    Tests the advice endpoint with a valid, well-formed question.
    """
    print("\n--- Running Test: Get Advice (Valid Question) ---")
    
    question = "How can I build more trust with my partner after a disagreement?"
    payload = {"question": question}
    
    print(f"Question: {question}")

    try:
        response = requests.post(ADVICE_ENDPOINT, json=payload, timeout=60) # RAG can be slow
        response.raise_for_status()

        data = response.json()

        assert response.status_code == 200
        assert "answer" in data
        assert "sources" in data
        assert isinstance(data["answer"], str) and len(data["answer"]) > 0
        assert isinstance(data["sources"], list)

        print(f"Answer received: {data['answer'][:100]}...")
        print(f"Number of sources: {len(data['sources'])}")
        
        if data["sources"]:
            print(f"Example source: {data['sources'][0]['metadata']}")

        print("✅ Get Advice (Valid Question) Test Passed")
        return True

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 503:
            print("❌ Get Advice Test Failed: Service Unavailable (503).")
            print("   This might mean the GOOGLE_API_KEY is not set in the backend environment.")
        else:
            print(f"❌ Get Advice Test Failed: HTTP Error {e.response.status_code}. Response: {e.response.text}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Get Advice Test Failed: Could not connect to the server. {e}")
        return False
    except Exception as e:
        print(f"❌ Get Advice Test Failed: {e}")
        return False


def test_get_advice_invalid_question():
    """
    Tests the advice endpoint with an invalid (too short) question.
    """
    print("\n--- Running Test: Get Advice (Invalid Question) ---")
    
    # This question is shorter than the 10-character minimum defined in the schema
    question = "Why?"
    payload = {"question": question}
    
    print(f"Question: {question}")

    try:
        response = requests.post(ADVICE_ENDPOINT, json=payload, timeout=10)

        assert response.status_code == 422, f"Expected status code 422, but got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"Received expected validation error: {data['detail'][0]['msg']}")

        print("✅ Get Advice (Invalid Question) Test Passed")
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Invalid Question Test Failed: Could not connect to the server. {e}")
        return False
    except Exception as e:
        print(f"❌ Invalid Question Test Failed: {e}")
        return False


# --- Main Execution ---

if __name__ == "__main__":
    print("=============================================")
    print("  Running Relationship Advice Endpoint Tests ")
    print("=============================================")
    
    # It's crucial that the health check passes before other tests
    if test_health_check():
        test_get_advice_valid_question()
        test_get_advice_invalid_question()
    
    print("\n=============================================")
    print("              All Tests Finished             ")
    print("=============================================")