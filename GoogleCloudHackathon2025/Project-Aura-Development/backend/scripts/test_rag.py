"""
Test script to verify RAG system is working.
Run this after starting the server to test the advice endpoint.
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_health_check():
    """Test the health endpoint."""
    print_section("1. Testing Health Check")

    try:
        response = requests.get(f"{BASE_URL}/api/v1/advice/health", timeout=10)

        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(f"\nStatus: {data.get('status')}")
            print(f"Vector Store Initialized: {data.get('vector_store_initialized')}")
            print(f"QA Chain Initialized: {data.get('qa_chain_initialized')}")
            print(f"Data Directory: {data.get('data_directory')}")

            if data.get('status') == 'healthy':
                return True
            else:
                print("\n❌ Service is not healthy. Check server logs.")
                return False
        else:
            print(f"❌ Health check failed with status code: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running?")
        print("   Start with: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_advice_endpoint():
    """Test the advice endpoint with a sample question."""
    print_section("2. Testing Advice Endpoint")

    test_question = "How can I improve communication with my partner?"

    print(f"Question: {test_question}")
    print("\nSending request...")

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/advice/",
            json={"question": test_question},
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            print("\n✅ Got response!")
            print("\n" + "-" * 60)
            print("ANSWER:")
            print("-" * 60)
            print(data['answer'])
            print("-" * 60)

            if data.get('sources'):
                print(f"\n📚 Sources: {len(data['sources'])} relevant chunks found")
                for i, source in enumerate(data['sources'][:2], 1):  # Show first 2 sources
                    print(f"\n  Source {i}:")
                    print(f"  - Content: {source['content'][:100]}...")
                    print(f"  - Metadata: {source['metadata']}")

            if data.get('error'):
                print(f"\n⚠️  Error: {data['error']}")

            return True
        else:
            print(f"❌ Request failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print("❌ Request timed out. Server might be processing slowly.")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_multiple_questions():
    """Test multiple questions to verify consistency."""
    print_section("3. Testing Multiple Questions")

    questions = [
        "What are love languages?",
        "How do I handle disagreements?",
        "What is attachment theory?"
    ]

    successful = 0

    for i, question in enumerate(questions, 1):
        print(f"\n[{i}/{len(questions)}] Testing: {question}")

        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/advice/",
                json={"question": question},
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                answer_preview = data['answer'][:100]
                print(f"  ✅ Got answer: {answer_preview}...")
                successful += 1
            else:
                print(f"  ❌ Failed with status: {response.status_code}")

        except Exception as e:
            print(f"  ❌ Error: {e}")

    print(f"\n📊 Results: {successful}/{len(questions)} questions answered successfully")
    return successful == len(questions)

def main():
    """Run all tests."""
    print_section("RAG System Test Suite")
    print("\nThis script will test if your RAG system is working correctly.")
    print("Make sure the server is running: uvicorn app.main:app --reload")

    input("\nPress Enter to start testing...")

    # Test 1: Health check
    health_ok = test_health_check()

    if not health_ok:
        print("\n❌ Health check failed. Cannot proceed with other tests.")
        print("\nTroubleshooting:")
        print("1. Make sure you renamed the PDF files (remove long filenames)")
        print("2. Check if PDFs exist in backend/data/relationship_books/")
        print("3. Check server logs for errors")
        print("4. Make sure GEMINI_API_KEY is set in .env")
        sys.exit(1)

    # Test 2: Single advice request
    print("\n")
    input("Press Enter to test the advice endpoint...")
    advice_ok = test_advice_endpoint()

    if not advice_ok:
        print("\n❌ Advice endpoint failed.")
        sys.exit(1)

    # Test 3: Multiple questions
    print("\n")
    input("Press Enter to test multiple questions...")
    multiple_ok = test_multiple_questions()

    # Final summary
    print_section("Test Summary")

    if health_ok and advice_ok and multiple_ok:
        print("\n🎉 All tests passed! Your RAG system is working perfectly!")
        print("\n✨ Next steps:")
        print("  - Integrate with your frontend")
        print("  - Add more PDF books to expand knowledge base")
        print("  - Try the API at http://localhost:8000/docs")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
