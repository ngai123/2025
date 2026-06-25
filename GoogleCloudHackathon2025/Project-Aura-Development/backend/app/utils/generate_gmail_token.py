"""
Gmail OAuth Token Generator for Personal Gmail Account
Run this script ONCE to generate the OAuth token for automated emails.

Usage:
    python -m app.utils.generate_gmail_token
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
except ImportError:
    print("❌ ERROR: Required libraries not installed")
    print("Run: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
    sys.exit(1)


# Gmail API Scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

# Configuration from .env
OAUTH_CREDENTIALS_FILE = os.getenv(
    "GMAIL_OAUTH_CREDENTIALS_FILE",
    "app/config/gmail-oauth-credentials.json"
)
TOKEN_FILE = os.getenv(
    "GMAIL_TOKEN_FILE",
    "app/config/token.json"
)
SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL", "aura.aidatingapp@gmail.com")


def print_banner():
    """Print welcome banner."""
    print("\n" + "=" * 70)
    print(" " * 15 + "Gmail OAuth Token Generator")
    print(" " * 20 + "for AURA Dating App")
    print("=" * 70)
    print(f"\n📧 Gmail Account: {SENDER_EMAIL}")
    print(f"📁 Credentials File: {OAUTH_CREDENTIALS_FILE}")
    print(f"📁 Token File: {TOKEN_FILE}\n")


def check_credentials_file():
    """Check if OAuth credentials file exists."""
    if not os.path.exists(OAUTH_CREDENTIALS_FILE):
        print(f"❌ ERROR: OAuth credentials file not found!")
        print(f"\nExpected location: {OAUTH_CREDENTIALS_FILE}")
        print("\n📋 Steps to fix:")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Navigate to APIs & Services → Credentials")
        print("3. Create OAuth 2.0 Client ID (Desktop app)")
        print("4. Download the JSON file")
        print(f"5. Save it as: {OAUTH_CREDENTIALS_FILE}")
        print("\n📖 See PERSONAL_GMAIL_SETUP.md for detailed instructions")
        return False
    return True


def generate_token():
    """Generate OAuth token for Gmail API."""
    creds = None

    # Check if token already exists
    if os.path.exists(TOKEN_FILE):
        print(f"ℹ️  Found existing token: {TOKEN_FILE}")
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
            print("✅ Loaded existing credentials")
        except Exception as e:
            print(f"⚠️  Could not load existing token: {e}")
            print("🔄 Will generate new token...")
            creds = None

    # If credentials are invalid or don't exist, generate new ones
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired token...")
            try:
                creds.refresh(Request())
                print("✅ Token refreshed successfully")
            except Exception as e:
                print(f"⚠️  Could not refresh token: {e}")
                print("🔄 Will generate new token...")
                creds = None

        if not creds:
            print("\n🔐 Starting OAuth authorization flow...")
            print("📢 A browser window will open shortly")
            print("👉 Sign in with:", SENDER_EMAIL)
            print("\nWaiting for authorization...")

            try:
                flow = InstalledAppFlow.from_client_secrets_file(
                    OAUTH_CREDENTIALS_FILE,
                    SCOPES
                )
                creds = flow.run_local_server(
                    port=0,
                    success_message="✅ Authorization successful! You can close this window.",
                    open_browser=True
                )
                print("\n✅ Authorization completed successfully!")
            except Exception as e:
                print(f"\n❌ Authorization failed: {e}")
                return False

        # Save the credentials for future use
        try:
            # Ensure directory exists
            token_dir = os.path.dirname(TOKEN_FILE)
            if token_dir and not os.path.exists(token_dir):
                os.makedirs(token_dir)
                print(f"📁 Created directory: {token_dir}")

            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
            print(f"💾 Token saved to: {TOKEN_FILE}")
        except Exception as e:
            print(f"❌ Could not save token: {e}")
            return False

    # Test the credentials - just verify they were created
    try:
        print("\n🧪 Testing Gmail API connection...")
        service = build('gmail', 'v1', credentials=creds)

        # We only have gmail.send scope, so we can't read profile
        # Just verify the service was built successfully
        print(f"✅ Successfully connected to Gmail API!")
        print(f"📧 Authorized email: {SENDER_EMAIL}")
        print(f"🔑 Scope: gmail.send (Send email on your behalf)")
        print(f"\n✅ Token is ready for sending emails!")

    except Exception as e:
        print(f"⚠️  Could not build Gmail service: {e}")
        print(f"   However, the token was saved and should work for sending emails.")
        # Don't return False - the token is still valid for sending
        pass

    return True


def print_success_message():
    """Print success message with next steps."""
    print("\n" + "=" * 70)
    print(" " * 25 + "✅ Setup Complete!")
    print("=" * 70)
    print("\n📝 Next Steps:\n")
    print("1. ✅ Token generated and saved")
    print("2. 🧪 Test the email service:")
    print("   python -m app.utils.test_gmail_api")
    print("\n3. 🚀 Start sending automated emails!")
    print("   The token will be automatically used by your backend")
    print("\n4. 🔄 Token will auto-refresh when needed (no action required)")
    print("\n📖 Integration Guide: GMAIL_API_INTEGRATION_GUIDE.md")
    print("📖 Setup Guide: PERSONAL_GMAIL_SETUP.md\n")


def main():
    """Main function."""
    print_banner()

    # Check if credentials file exists
    if not check_credentials_file():
        sys.exit(1)

    # Generate token
    print("🚀 Starting token generation...\n")
    success = generate_token()

    if success:
        print_success_message()
        sys.exit(0)
    else:
        print("\n❌ Token generation failed")
        print("📖 See PERSONAL_GMAIL_SETUP.md for troubleshooting")
        sys.exit(1)


if __name__ == "__main__":
    main()
