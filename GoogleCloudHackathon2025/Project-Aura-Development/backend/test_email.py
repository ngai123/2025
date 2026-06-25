"""
Quick test to verify email configuration is working
"""
import asyncio
import os
from dotenv import load_dotenv
from app.utils.email_sender import send_personality_analysis_email

load_dotenv()

async def test_email():
    # Replace with your own email to test
    test_email = "your-email@example.com"  # CHANGE THIS!
    test_name = "Test User"
    test_analysis = """1. **You are testing the email system.**

This is a test email to verify that your AURA personality analysis email system is working correctly.

2. **The system is configured properly.**

If you receive this email, it means SendGrid or SMTP is set up correctly!

3. **You can now send real personality analyses.**

Great job! The email feature is ready to use."""

    print(f"📧 Sending test email to: {test_email}")
    print(f"📧 Using provider: {os.getenv('EMAIL_PROVIDER', 'smtp')}")

    await send_personality_analysis_email(
        recipient_email=test_email,
        recipient_name=test_name,
        full_analysis=test_analysis
    )

    print("✅ Test complete! Check your email inbox.")

if __name__ == "__main__":
    asyncio.run(test_email())
