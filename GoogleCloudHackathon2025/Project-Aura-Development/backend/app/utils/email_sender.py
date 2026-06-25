import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import re
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Email provider configuration
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "smtp")  # 'sendgrid' or 'smtp'
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM") or os.getenv("EMAIL_USER")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "AURA")

# SMTP configuration (if using Gmail/SMTP)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))

# Sanitize env values to remove inline comments and accidental whitespace
def _clean_env(value: str) -> str:
    if not value:
        return value
    # Remove anything after an inline '#', then strip
    value = value.split('#', 1)[0].strip()
    return value

# Clean user and pass; Gmail app passwords are 16 chars without spaces
_raw_user = os.getenv("EMAIL_USER")
_raw_pass = os.getenv("EMAIL_PASS")
EMAIL_USER = _clean_env(_raw_user) if _raw_user else None
EMAIL_PASS = _clean_env(_raw_pass) if _raw_pass else None
if EMAIL_PASS:
    # Remove all whitespace from app password
    EMAIL_PASS = "".join(EMAIL_PASS.split())

AURA_LOGO_URL = os.getenv("AURA_LOGO_URL", "https://project-1-practice-28a42.web.app/assets/logo-4IK4f81A.png")


def _send_email_via_sendgrid(to_email: str, subject: str, html_content: str):
    """Send email using SendGrid API"""
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, Content

        message = Mail(
            from_email=Email(EMAIL_FROM, EMAIL_FROM_NAME),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )

        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"✅ SendGrid email sent to {to_email} (Status: {response.status_code})")
        return True
    except ImportError:
        print("❌ ERROR: SendGrid library not installed. Run: pip install sendgrid")
        return False
    except Exception as e:
        print(f"❌ ERROR: Failed to send email via SendGrid: {e}")
        return False


def _send_email_via_smtp(to_email: str, subject: str, html_content: str, from_email: str = None):
    """Send email using SMTP (Gmail)"""
    if not EMAIL_USER or not EMAIL_PASS:
        print("WARNING: EMAIL_USER or EMAIL_PASS not set. Skipping SMTP email.")
        return False

    from_addr = from_email or EMAIL_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{EMAIL_FROM_NAME} <{from_addr}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(from_addr, to_email, msg.as_string())
        print(f"✅ SMTP email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ ERROR: Failed to send email via SMTP: {e}")
        return False

async def send_premium_confirmation_email(
    recipient_email: str,
    recipient_name: str,
    expiry_date: datetime,
    subscription_period: str
):
    """
    Sends a premium subscription confirmation email to the user.
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "AURA Premium Subscription Confirmation - Welcome to the Family!"
    msg["From"] = f"AURA <{EMAIL_USER}>"
    msg["To"] = recipient_email

    formatted_expiry_date = expiry_date.strftime('%B %d, %Y')

    # --- MODIFIED: Premium Features HTML (icons removed, simplified structure) ---
    premium_features_html = """
    <div style="background: #ffffff; border-radius: 15px; padding: 25px; margin-top: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <h2 style="font-size: 22px; font-weight: 600; color: #333; margin-bottom: 25px; text-align: center;">Your Premium Privileges</h2>

        <!-- Unlimited Likes -->
        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 15px;">Unlimited Likes</p>
        
        <!-- See Who Likes You -->
        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 15px;">See Who Likes You</p>
        
        <!-- 30 Free Crushes -->
        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0 0 15px;">30 Free Crushes Per Month</p>
        
        <!-- Unlock My Likes -->
        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">Unlock My Likes</p>
        <p style="font-size: 13px; color: #666; line-height: 1.4; margin: 5px 0 15px;">See everyone you've liked. Send Crush when you don't feel like waiting.</p>
        
        <!-- Premium Icon -->
        <p style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">Premium Icon</p>
        <p style="font-size: 13px; color: #666; line-height: 1.4; margin: 5px 0 0;">Increase your matching chance by 2.5x. You can choose to hide it to keep it low-key.</p>
    </div>
    """
    # --- END MODIFIED: Premium Features HTML ---

    # HTML content for the email
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- Removed external Google Fonts link to reduce email size and improve compatibility -->
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Josefin Sans', sans-serif, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 20px auto; padding: 0; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%); text-align: center; padding: 30px 20px;">
                <img src="{AURA_LOGO_URL}" alt="AURA Logo" style="max-width: 80px; max-height: 80px; display: block; margin: 0 auto 15px;">
                <h1 style="color: #333; font-size: 32px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">AURA Premium</h1>
                <p style="color: #555; font-size: 14px; margin: 8px 0 0; font-weight: 500;">Welcome to Premium!</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px 25px;">
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
    
    # Send email using configured provider
    subject = "AURA Premium Subscription Confirmation - Welcome to the Family!"

    if EMAIL_PROVIDER == "sendgrid" and SENDGRID_API_KEY:
        success = _send_email_via_sendgrid(recipient_email, subject, html_content)
    else:
        success = _send_email_via_smtp(recipient_email, subject, html_content)

    if not success:
        print(f"❌ Failed to send premium confirmation email to {recipient_email}")


async def send_personality_analysis_email(
    recipient_email: str,
    recipient_name: str,
    full_analysis: str
):
    """
    Sends the full personality analysis to the user's email.
    """
    # Convert markdown-style **text** to HTML bold
    formatted_analysis = re.sub(r'\*\*(.*?)\*\*', r'<strong style="color: #FF7F7F; font-weight: 700;">\1</strong>', full_analysis)
    formatted_analysis = formatted_analysis.replace('\n\n', '<br/><br/>')
    formatted_analysis = formatted_analysis.replace('\n', '<br/>')

    # HTML content for the email
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F9F4E2; font-family: 'Poppins', sans-serif, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 20px auto; padding: 0; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #FF7F7F 0%, #FFA0A0 100%); text-align: center; padding: 30px 20px;">
                <img src="{AURA_LOGO_URL}" alt="AURA Logo" style="max-width: 80px; max-height: 80px; display: block; margin: 0 auto 15px;">
                <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Your Personality Analysis</h1>
                <p style="color: rgba(255,255,255,0.95); font-size: 14px; margin: 8px 0 0; font-weight: 500;">Discover your unique relationship patterns</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px 25px;">
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

    # Send email using configured provider
    subject = "Your Complete AURA Personality Analysis"

    if EMAIL_PROVIDER == "sendgrid" and SENDGRID_API_KEY:
        success = _send_email_via_sendgrid(recipient_email, subject, html_content)
    else:
        success = _send_email_via_smtp(recipient_email, subject, html_content)

    if not success:
        print(f"❌ Failed to send personality analysis email to {recipient_email}")


# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart
# import os
# from dotenv import load_dotenv
# from datetime import datetime

# load_dotenv()

# EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
# EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
# EMAIL_USER = os.getenv("EMAIL_USER")
# EMAIL_PASS = os.getenv("EMAIL_PASS")

# # Replace this with your actual public GCS URL for the logo
# AURA_LOGO_URL = os.getenv("AURA_LOGO_URL", "https://project-1-practice-28a42.web.app/assets/logo-4IK4f81A.png") # Make this an env var too!

# async def send_premium_confirmation_email(
#     recipient_email: str,
#     recipient_name: str,
#     expiry_date: datetime,
#     subscription_period: str
# ):
#     """
#     Sends a premium subscription confirmation email to the user.
#     """
#     if not EMAIL_USER or not EMAIL_PASS:
#         print("WARNING: Email credentials (EMAIL_USER or EMAIL_PASS) not set in .env. Skipping email sending.")
#         return

#     msg = MIMEMultipart("alternative")
#     msg["Subject"] = "AURA Premium Subscription Confirmation - Welcome to the Family!"
#     msg["From"] = f"AURA <{EMAIL_USER}>"
#     msg["To"] = recipient_email

#     formatted_expiry_date = expiry_date.strftime('%B %d, %Y')

#     # --- NEW: Premium Features HTML ---
#     premium_features_html = """
#     <div style="background: #ffffff; border-radius: 15px; padding: 20px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
#         <h2 style="font-size: 20px; font-weight: 600; color: #333; margin-bottom: 20px; text-align: center;">Your Premium Privileges</h2>

#         <div style="display: flex; align-items: center; margin-bottom: 15px;">
#             <div style="width: 35px; height: 35px; border-radius: 50%; background: #FFA0A0; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; margin-right: 15px;">&infin;</div>
#             <div style="flex-grow: 1;">
#                 <h3 style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">Unlimited Likes</h3>
#             </div>
#         </div>

#         <div style="display: flex; align-items: center; margin-bottom: 15px;">
#             <div style="width: 35px; height: 35px; border-radius: 50%; background: #FF7F7F; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; margin-right: 15px;">&hearts;</div>
#             <div style="flex-grow: 1;">
#                 <h3 style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">See Who Likes You</h3>
#             </div>
#         </div>

#         <div style="display: flex; align-items: center; margin-bottom: 15px;">
#             <div style="width: 35px; height: 35px; border-radius: 50%; background: #2ECC71; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; margin-right: 15px;">&#128536;</div> <!-- KissWinkHeart emoji -->
#             <div style="flex-grow: 1;">
#                 <h3 style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">30 Free Crushes Per Month</h3>
#             </div>
#         </div>

#         <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
#             <div style="width: 35px; height: 35px; border-radius: 50%; background: #E67E22; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; margin-right: 15px;">&#128275;</div> <!-- FaLockOpen emoji -->
#             <div style="flex-grow: 1;">
#                 <h3 style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">Unlock My Likes</h3>
#                 <p style="font-size: 12px; color: #666; line-height: 1.4; margin-top: 3px;">See everyone you've liked. Send Crush when you don't feel like waiting.</p>
#             </div>
#         </div>

#         <div style="display: flex; align-items: flex-start; margin-bottom: 0;">
#             <div style="width: 35px; height: 35px; border-radius: 50%; background: #F39C12; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; margin-right: 15px;">&#127894;</div> <!-- FaAward emoji -->
#             <div style="flex-grow: 1;">
#                 <h3 style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">Premium Icon</h3>
#                 <p style="font-size: 12px; color: #666; line-height: 1.4; margin-top: 3px;">Increase your matching chance by 2.5x. You can choose to hide it to keep it low-key.</p>
#             </div>
#         </div>
#     </div>
#     """
#     # --- END NEW: Premium Features HTML ---

#     # HTML content for the email
#     html_content = f"""
#     <div style="font-family: 'Josefin Sans', sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f4e2;">
#         <div style="text-align: center; margin-bottom: 20px;">
#             <img src="{AURA_LOGO_URL}" alt="AURA Logo" style="max-width: 100px; margin-bottom: 10px;">
#             <h1 style="color: #FFD700; font-size: 28px; margin: 0;">AURA Premium</h1>
#         </div>
#         <p style="font-size: 16px; color: #333; line-height: 1.6;">Dear {recipient_name},</p>
#         <p style="font-size: 16px; color: #333; line-height: 1.6;">
#             Thank you for subscribing to AURA Premium! Your {subscription_period} subscription is now active.
#         </p>
#         <p style="font-size: 16px; color: #333; line-height: 1.6;">
#             <strong>Your Premium subscription will expire on: {formatted_expiry_date}.</strong>
#         </p>

#         {premium_features_html} <!-- NEW: Insert the features HTML here -->

#         <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 30px;">Welcome to the AURA Premium family! We're excited for you to connect with your AURAs.</p>
#         <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 20px;">Best regards,</p>
#         <p style="font-size: 16px; color: #333; line-height: 1.6;">The AURA Team</p>
#         <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px; margin-bottom: 15px;">
#         <p style="font-size: 12px; color: #999; text-align: center;">
#             This is an automated email, please do not reply.
#         </p>
#     </div>
#     """
#     part1 = MIMEText(html_content, "html")
#     msg.attach(part1)

#     try:
#         with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
#             server.starttls()
#             server.login(EMAIL_USER, EMAIL_PASS)
#             server.sendmail(EMAIL_USER, recipient_email, msg.as_string())
#         print(f"Premium confirmation email sent to {recipient_email}")
#     except Exception as e:
#         print(f"ERROR: Failed to send premium confirmation email to {recipient_email}: {e}")