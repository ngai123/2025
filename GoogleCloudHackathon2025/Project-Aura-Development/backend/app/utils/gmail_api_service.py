"""
Gmail API Email Service for Project Aura
Supports both Gmail API (OAuth 2.0 & Service Account) and SMTP fallback
"""

import os
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from datetime import datetime
import json
import asyncio
from functools import wraps
import smtplib

from dotenv import load_dotenv

# Gmail API imports
try:
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GMAIL_API_AVAILABLE = True
except ImportError:
    GMAIL_API_AVAILABLE = False
    print("[WARNING] Gmail API libraries not installed. Using SMTP fallback only.")

load_dotenv()

# Configuration
GMAIL_API_ENABLED = os.getenv("GMAIL_API_ENABLED", "false").lower() == "true"
GMAIL_AUTH_TYPE = os.getenv("GMAIL_AUTH_TYPE", "service_account").lower()  # "oauth" or "service_account"

# OAuth 2.0 Configuration (for personal Gmail)
GMAIL_OAUTH_CREDENTIALS_FILE = os.getenv("GMAIL_OAUTH_CREDENTIALS_FILE", "app/config/gmail-oauth-credentials.json")
GMAIL_TOKEN_FILE = os.getenv("GMAIL_TOKEN_FILE", "app/config/token.json")

# Service Account Configuration (for workspace/domain)
GMAIL_SERVICE_ACCOUNT_FILE = os.getenv("GMAIL_SERVICE_ACCOUNT_FILE", "app/config/gmail-service-account.json")

# Sender Configuration
GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL") or os.getenv("EMAIL_USER")
GMAIL_SENDER_NAME = os.getenv("GMAIL_SENDER_NAME", "AURA")

# SMTP Fallback Configuration
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# Logo URL
AURA_LOGO_URL = os.getenv("AURA_LOGO_URL", "https://aura-dating-app.com/assets/logo-4IK4f81A.png")

# Gmail API Scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']


class EmailService:
    """
    Unified email service that supports both Gmail API and SMTP fallback.
    Supports OAuth 2.0 (personal Gmail) and Service Account (Workspace) authentication.
    Automatically falls back to SMTP if Gmail API is not configured or fails.
    """

    def __init__(self):
        self.gmail_service = None
        self.use_gmail_api = False
        self.credentials = None

        if GMAIL_API_ENABLED and GMAIL_API_AVAILABLE:
            try:
                self._initialize_gmail_api()
            except Exception as e:
                print(f"[WARNING] Gmail API initialization failed: {e}")
                print("[EMAIL] Falling back to SMTP")

    def _initialize_gmail_api(self):
        """Initialize Gmail API service with OAuth 2.0 or Service Account credentials."""
        if GMAIL_AUTH_TYPE == "oauth":
            self._initialize_oauth()
        else:
            self._initialize_service_account()

    def _initialize_oauth(self):
        """Initialize Gmail API with OAuth 2.0 credentials (for personal Gmail)."""
        creds = None

        # Check if token file exists
        if os.path.exists(GMAIL_TOKEN_FILE):
            try:
                creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_FILE, SCOPES)
            except Exception as e:
                print(f"[WARNING] Could not load token file: {e}")

        # If credentials are invalid or don't exist, raise error
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # Try to refresh the token
                try:
                    creds.refresh(Request())
                    # Save refreshed token
                    with open(GMAIL_TOKEN_FILE, 'w') as token:
                        token.write(creds.to_json())
                    print("[REFRESH] OAuth token refreshed")
                except Exception as e:
                    raise Exception(
                        f"Could not refresh OAuth token: {e}\n"
                        f"Please run: python -m app.utils.generate_gmail_token"
                    )
            else:
                raise FileNotFoundError(
                    f"OAuth token not found or invalid: {GMAIL_TOKEN_FILE}\n"
                    f"Please run: python -m app.utils.generate_gmail_token\n"
                    f"See PERSONAL_GMAIL_SETUP.md for instructions"
                )

        self.credentials = creds
        self.gmail_service = build('gmail', 'v1', credentials=creds)
        self.use_gmail_api = True
        print("[OK] Gmail API initialized successfully (OAuth 2.0)")

    def _initialize_service_account(self):
        """Initialize Gmail API with Service Account credentials (for Workspace)."""
        if not os.path.exists(GMAIL_SERVICE_ACCOUNT_FILE):
            raise FileNotFoundError(
                f"Service account file not found: {GMAIL_SERVICE_ACCOUNT_FILE}\n"
                f"Please follow setup instructions in GMAIL_API_SETUP.md"
            )

        credentials = service_account.Credentials.from_service_account_file(
            GMAIL_SERVICE_ACCOUNT_FILE,
            scopes=SCOPES
        )

        # If using domain-wide delegation, delegate to the sender email
        if GMAIL_SENDER_EMAIL:
            credentials = credentials.with_subject(GMAIL_SENDER_EMAIL)

        self.credentials = credentials
        self.gmail_service = build('gmail', 'v1', credentials=credentials)
        self.use_gmail_api = True
        print("[OK] Gmail API initialized successfully (Service Account)")

    def _create_mime_message(
        self,
        to: str,
        subject: str,
        html_content: str,
        from_name: Optional[str] = None
    ) -> MIMEMultipart:
        """Create a MIME multipart message."""
        message = MIMEMultipart("alternative")
        message["To"] = to
        message["Subject"] = subject

        sender_name = from_name or GMAIL_SENDER_NAME
        sender_email = GMAIL_SENDER_EMAIL or EMAIL_USER
        message["From"] = f"{sender_name} <{sender_email}>"

        html_part = MIMEText(html_content, "html")
        message.attach(html_part)

        return message

    async def _send_via_gmail_api(
        self,
        to: str,
        subject: str,
        html_content: str,
        from_name: Optional[str] = None
    ) -> bool:
        """Send email using Gmail API."""
        try:
            message = self._create_mime_message(to, subject, html_content, from_name)

            # Encode the message
            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

            create_message = {'raw': encoded_message}

            # Send the message
            send_message = self.gmail_service.users().messages().send(
                userId="me",
                body=create_message
            ).execute()

            print(f"[OK] Email sent via Gmail API to {to} (Message ID: {send_message['id']})")
            return True

        except HttpError as error:
            print(f"[ERROR] Gmail API error: {error}")
            return False
        except Exception as e:
            print(f"[ERROR] Unexpected error sending via Gmail API: {e}")
            return False

    async def _send_via_smtp(
        self,
        to: str,
        subject: str,
        html_content: str,
        from_name: Optional[str] = None
    ) -> bool:
        """Send email using SMTP (fallback method)."""
        if not EMAIL_USER or not EMAIL_PASS:
            print("[ERROR] SMTP credentials not configured. Cannot send email.")
            return False

        try:
            message = self._create_mime_message(to, subject, html_content, from_name)

            with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
                server.starttls()
                server.login(EMAIL_USER, EMAIL_PASS)
                server.sendmail(EMAIL_USER, to, message.as_string())

            print(f"[OK] Email sent via SMTP to {to}")
            return True

        except Exception as e:
            print(f"[ERROR] SMTP error: {e}")
            return False

    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        from_name: Optional[str] = None,
        retry_smtp_on_failure: bool = True
    ) -> bool:
        """
        Send email using Gmail API with SMTP fallback.

        Args:
            to: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            from_name: Optional sender name (defaults to GMAIL_SENDER_NAME)
            retry_smtp_on_failure: If Gmail API fails, retry with SMTP

        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        # Try Gmail API first if configured
        if self.use_gmail_api and self.gmail_service:
            success = await self._send_via_gmail_api(to, subject, html_content, from_name)
            if success:
                return True

            if not retry_smtp_on_failure:
                return False

            print("[REFRESH] Gmail API failed, falling back to SMTP...")

        # Fallback to SMTP
        return await self._send_via_smtp(to, subject, html_content, from_name)


# Singleton instance
_email_service = None


def get_email_service() -> EmailService:
    """Get or create the singleton email service instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service


# ============================================
# EMAIL TEMPLATES
# ============================================

def get_email_base_template(body_content: str) -> str:
    """
    Base email template with AURA branding.

    Args:
        body_content: The main content to insert into the template

    Returns:
        Complete HTML email string
    """
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Josefin Sans', sans-serif, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 20px auto; padding: 0; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%); text-align: center; padding: 30px 20px;">
                <img src="{AURA_LOGO_URL}" alt="AURA Logo" style="max-width: 80px; max-height: 80px; display: block; margin: 0 auto 15px;">
                <h1 style="color: #333; font-size: 32px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">AURA</h1>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px 25px;">
                {body_content}
            </div>

            <!-- Footer -->
            <div style="background: #f0f0f0; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 12px; color: #999; margin: 0;">
                    This is an automated email, please do not reply.<br>
                    © 2025 AURA. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


async def send_premium_confirmation_email(
    recipient_email: str,
    recipient_name: str,
    expiry_date: datetime,
    subscription_period: str
):
    """
    Send premium subscription confirmation email.
    Compatible with existing code - maintains same function signature.
    """
    email_service = get_email_service()

    formatted_expiry_date = expiry_date.strftime('%B %d, %Y')

    premium_features_html = """
    <div style="background: #ffffff; border-radius: 15px; padding: 25px; margin-top: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <h2 style="font-size: 22px; font-weight: 600; color: #333; margin-bottom: 25px; text-align: center;">Your Premium Privileges</h2>

        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 15px;">Unlimited Likes</p>

        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 15px;">See Who Likes You</p>

        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 15px;">30 Free Crushes Per Month</p>

        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">Unlock My Likes</p>
        <p style="font-size: 13px; color: #666; line-height: 1.4; margin: 5px 0 15px;">See everyone you've liked. Send Crush when you don't feel like waiting.</p>

        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">Premium Icon</p>
        <p style="font-size: 13px; color: #666; line-height: 1.4; margin: 5px 0 0;">Increase your matching chance by 2.5x. You can choose to hide it to keep it low-key.</p>
    </div>
    """

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Dear <strong>{recipient_name}</strong>,
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Thank you for subscribing to AURA Premium! Your <strong>{subscription_period}</strong> subscription is now active and ready to use.
        </p>

        <div style="background: linear-gradient(135deg, #FF7F7F 0%, #FFBEBE 100%); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center; box-shadow: 0 4px 12px rgba(255, 127, 127, 0.3);">
            <p style="font-size: 14px; color: white; margin: 0 0 8px; font-weight: 600;">Your Premium Subscription Expires On:</p>
            <p style="font-size: 24px; color: white; margin: 0; font-weight: 700;">{formatted_expiry_date}</p>
        </div>

        {premium_features_html}

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 30px;">
            Welcome to the AURA Premium family! We're excited for you to connect with your AURAs. 💖
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    subject = "AURA Premium Subscription Confirmation - Welcome to the Family!"

    success = await email_service.send_email(
        to=recipient_email,
        subject=subject,
        html_content=html_content
    )

    if not success:
        print(f"[WARNING] Failed to send premium confirmation email to {recipient_email}")


async def send_new_match_email(
    recipient_email: str,
    recipient_name: str,
    match_name: str,
    match_photo_url: Optional[str] = None
):
    """Send notification when user gets a new match."""
    email_service = get_email_service()

    photo_html = ""
    if match_photo_url:
        photo_html = f'<img src="{match_photo_url}" alt="{match_name}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 20px 0; border: 4px solid #FFD700;">'

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Hi <strong>{recipient_name}</strong>,
        </p>

        <div style="text-align: center;">
            {photo_html}
            <h2 style="font-size: 24px; font-weight: 600; color: #FF7F7F; margin: 15px 0;">It's a Match! 💖</h2>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0; text-align: center;">
            You and <strong>{match_name}</strong> have liked each other!
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://your-app-url.com/matches" style="display: inline-block; background: linear-gradient(135deg, #FF7F7F 0%, #FFBEBE 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: 600; font-size: 16px;">Start Chatting</a>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    return await email_service.send_email(
        to=recipient_email,
        subject=f"🎉 You matched with {match_name}!",
        html_content=html_content
    )


async def send_new_message_email(
    recipient_email: str,
    recipient_name: str,
    sender_name: str,
    message_preview: str
):
    """Send notification when user receives a new message."""
    email_service = get_email_service()

    # Truncate message preview if too long
    if len(message_preview) > 100:
        message_preview = message_preview[:100] + "..."

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Hi <strong>{recipient_name}</strong>,
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            <strong>{sender_name}</strong> sent you a message:
        </p>

        <div style="background: #f9f9f9; border-left: 4px solid #FFD700; padding: 15px 20px; margin: 20px 0; border-radius: 5px;">
            <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0; font-style: italic;">
                "{message_preview}"
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://your-app-url.com/messages" style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%); color: #333; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: 600; font-size: 16px;">Reply Now</a>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    return await email_service.send_email(
        to=recipient_email,
        subject=f"💬 New message from {sender_name}",
        html_content=html_content
    )


async def send_like_received_email(
    recipient_email: str,
    recipient_name: str,
    liker_name: str,
    is_super_like: bool = False
):
    """Send notification when user receives a like."""
    email_service = get_email_service()

    like_type = "Super Like" if is_super_like else "Like"
    emoji = "⭐" if is_super_like else "❤️"

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Hi <strong>{recipient_name}</strong>,
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 48px; margin-bottom: 15px;">{emoji}</div>
            <h2 style="font-size: 24px; font-weight: 600; color: #FF7F7F; margin: 15px 0;">
                {"Someone really likes you!" if is_super_like else "Someone likes you!"}
            </h2>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0; text-align: center;">
            <strong>{liker_name}</strong> sent you a {like_type}!
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://your-app-url.com/likes" style="display: inline-block; background: linear-gradient(135deg, #FF7F7F 0%, #FFBEBE 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: 600; font-size: 16px;">See Who Likes You</a>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 25px; text-align: center;">
            Like them back to start chatting!
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    return await email_service.send_email(
        to=recipient_email,
        subject=f"{emoji} {liker_name} likes you on AURA!",
        html_content=html_content
    )


async def send_password_reset_email(
    recipient_email: str,
    recipient_name: str,
    reset_token: str,
    reset_url: str
):
    """Send password reset email."""
    email_service = get_email_service()

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Hi <strong>{recipient_name}</strong>,
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            We received a request to reset your password. Click the button below to reset it:
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}?token={reset_token}" style="display: inline-block; background: linear-gradient(135deg, #FF7F7F 0%, #FFBEBE 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: 600; font-size: 16px;">Reset Password</a>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 20px 0;">
            Or copy and paste this link into your browser:<br>
            <a href="{reset_url}?token={reset_token}" style="color: #FF7F7F; word-break: break-all;">{reset_url}?token={reset_token}</a>
        </p>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0; border-radius: 5px;">
            <p style="font-size: 14px; color: #856404; line-height: 1.6; margin: 0;">
                <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    return await email_service.send_email(
        to=recipient_email,
        subject="🔐 Reset your AURA password",
        html_content=html_content
    )


async def send_welcome_email(
    recipient_email: str,
    recipient_name: str,
    verification_token: Optional[str] = None,
    verification_url: Optional[str] = None
):
    """Send welcome email to new users."""
    email_service = get_email_service()

    verification_html = ""
    if verification_token and verification_url:
        verification_html = f"""
        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px 20px; margin: 20px 0; border-radius: 5px;">
            <p style="font-size: 15px; color: #2e7d32; line-height: 1.6; margin: 0 0 10px;">
                <strong>One more step:</strong> Please verify your email address to get started.
            </p>
            <div style="text-align: center; margin-top: 15px;">
                <a href="{verification_url}?token={verification_token}" style="display: inline-block; background: #4caf50; color: white; text-decoration: none; padding: 12px 30px; border-radius: 20px; font-weight: 600; font-size: 14px;">Verify Email</a>
            </div>
        </div>
        """

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Hi <strong>{recipient_name}</strong>,
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Welcome to AURA! 🎉 We're excited to help you find meaningful connections.
        </p>

        {verification_html}

        <div style="background: #ffffff; border-radius: 15px; padding: 25px; margin-top: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <h2 style="font-size: 20px; font-weight: 600; color: #333; margin-bottom: 20px; text-align: center;">Getting Started</h2>

            <div style="margin-bottom: 15px;">
                <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 5px;">1. Complete Your Profile</p>
                <p style="font-size: 14px; color: #666; margin: 0;">Add photos and tell us about yourself</p>
            </div>

            <div style="margin-bottom: 15px;">
                <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 5px;">2. Set Your Preferences</p>
                <p style="font-size: 14px; color: #666; margin: 0;">Choose who you'd like to meet</p>
            </div>

            <div style="margin-bottom: 0;">
                <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 5px;">3. Start Swiping</p>
                <p style="font-size: 14px; color: #666; margin: 0;">Find your perfect match!</p>
            </div>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 30px;">
            Happy matching! 💖
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    return await email_service.send_email(
        to=recipient_email,
        subject="Welcome to AURA! 🎉",
        html_content=html_content
    )


import re

async def send_personality_analysis_email(
    recipient_email: str,
    recipient_name: str,
    full_analysis: str
):
    """Send full personality analysis to user's email."""
    email_service = get_email_service()

    # Convert markdown-style **text** to HTML bold
    formatted_analysis = re.sub(
        r'\*\*(.*?)\*\*',
        r'<strong style="color: #FF7F7F; font-weight: 700;">\1</strong>',
        full_analysis
    )
    formatted_analysis = formatted_analysis.replace('\n\n', '<br/><br/>')
    formatted_analysis = formatted_analysis.replace('\n', '<br/>')

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>{recipient_name}</strong>,
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 25px;">
            Thank you for completing your AURA personality analysis. Here is your complete, in-depth analysis of your relationship patterns and emotional world.
        </p>

        <div style="background: rgba(255, 127, 127, 0.05); border-left: 4px solid #FF7F7F; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <div style="font-size: 15px; color: #5C5B52; line-height: 1.8;">
                {formatted_analysis}
            </div>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 30px;">
            We hope this analysis helps you understand yourself better and build deeper connections. 💖
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    success = await email_service.send_email(
        to=recipient_email,
        subject="Your Complete AURA Personality Analysis",
        html_content=html_content
    )

    if not success:
        print(f"[WARNING] Failed to send personality analysis email to {recipient_email}")

    return success


async def send_premium_expiry_warning_email(
    recipient_email: str,
    recipient_name: str,
    days_remaining: int,
    expiry_date: datetime
):
    """Send warning email when premium subscription is about to expire."""
    email_service = get_email_service()

    formatted_expiry_date = expiry_date.strftime('%B %d, %Y')

    body_content = f"""
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
            Hi <strong>{recipient_name}</strong>,
        </p>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0; border-radius: 5px;">
            <p style="font-size: 16px; color: #856404; line-height: 1.6; margin: 0;">
                <strong>Reminder:</strong> Your AURA Premium subscription expires in <strong>{days_remaining} days</strong> on {formatted_expiry_date}.
            </p>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0;">
            Don't lose access to your premium features:
        </p>

        <ul style="font-size: 15px; color: #333; line-height: 1.8; padding-left: 20px;">
            <li>Unlimited Likes</li>
            <li>See Who Likes You</li>
            <li>30 Free Crushes Per Month</li>
            <li>Unlock My Likes</li>
            <li>Premium Icon</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://your-app-url.com/premium" style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%); color: #333; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: 600; font-size: 16px;">Renew Premium</a>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
            Best regards,<br>
            <strong>The AURA Team</strong>
        </p>
    """

    html_content = get_email_base_template(body_content)

    return await email_service.send_email(
        to=recipient_email,
        subject=f"[WARNING] Your AURA Premium expires in {days_remaining} days",
        html_content=html_content
    )
