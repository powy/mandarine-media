import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""

    @staticmethod
    def send_contact_email(
        name: str,
        email: str,
        subject: str,
        message: str,
        user_id: Optional[str] = None,
        user_full_name: Optional[str] = None
    ) -> bool:
        """
        Send contact form email to configured recipient

        Args:
            name: Sender name
            email: Sender email
            subject: Email subject
            message: Email message content
            user_id: Authenticated user ID (UUID)
            user_full_name: Authenticated user's full name

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Log email details for debugging (in all environments)
            print(f"[EMAIL] Sending contact form from {name} <{email}>")
            print(f"[EMAIL] User ID: {user_id}, Subject: {subject}")

            # Validate SMTP configuration
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                logger.error("SMTP credentials not configured")
                return False

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[Contact Form] {subject}"
            msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg['To'] = settings.CONTACT_RECIPIENT_EMAIL
            msg['Reply-To'] = email

            # Create email body (plain text and HTML)
            user_info = f"""
ID Utilisateur: {user_id}
Nom complet: {user_full_name}
""" if user_id else ""

            text_content = f"""
Nouveau message depuis le formulaire de contact

Nom: {name}
Email: {email}
Sujet: {subject}
{user_info}
Message:
{message}

---
Cet email provient du formulaire de contact de KYOOL Media.
"""

            user_info_html = f"""
        <p><strong>ID Utilisateur:</strong> {user_id}</p>
        <p><strong>Nom complet:</strong> {user_full_name}</p>
""" if user_id else ""

            html_content = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #28ceee;">Nouveau message depuis le formulaire de contact</h2>
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Nom:</strong> {name}</p>
        <p><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
        <p><strong>Sujet:</strong> {subject}</p>
{user_info_html}    </div>
    <div style="margin: 20px 0;">
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">{message}</p>
    </div>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="color: #888; font-size: 12px;">
        Cet email provient du formulaire de contact de KYOOL Media.
    </p>
</body>
</html>
"""

            # Attach both parts
            part1 = MIMEText(text_content, 'plain', 'utf-8')
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part1)
            msg.attach(part2)

            # Send email
            # Use SMTP_SSL for port 465, SMTP with STARTTLS for port 587
            if settings.SMTP_PORT == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    if settings.SMTP_TLS:
                        server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)

            logger.info(f"Contact email sent successfully from {email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send contact email: {str(e)}")
            return False

    @staticmethod
    def send_password_reset_email(
        email: str,
        reset_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send password reset email with reset link

        Args:
            email: Recipient email address
            reset_token: Reset token to include in URL
            user_name: Optional user name for personalization

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Log email details for debugging (in all environments)
            print(f"[EMAIL] Sending password reset to {email}")
            print(f"[EMAIL] User: {user_name}, Token: {reset_token[:20]}...")

            # Validate SMTP configuration
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                logger.error("SMTP credentials not configured")
                return False

            # Build reset URL
            frontend_base_url = settings.FRONTEND_BASE_URL
            reset_url = f"{frontend_base_url}/reset-password?token={reset_token}"

            greeting = f"Bonjour {user_name}," if user_name else "Bonjour,"

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "Réinitialisation de votre mot de passe KYOOL Media"
            msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg['To'] = email

            # Plain text version
            text_content = f"""
{greeting}

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte KYOOL Media.

Pour définir un nouveau mot de passe, cliquez sur le lien suivant :
{reset_url}

Ce lien est valable pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.

Cordialement,
L'équipe KYOOL Media

---
Cet email a été envoyé automatiquement, merci de ne pas y répondre.
"""

            # HTML version
            html_content = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #28ceee;">Réinitialisation de mot de passe</h2>

        <p>{greeting}</p>

        <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte KYOOL Media.</p>

        <div style="margin: 30px 0; text-align: center;">
            <a href="{reset_url}"
               style="background-color: #28ceee;
                      color: #000;
                      padding: 12px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      font-weight: bold;
                      display: inline-block;">
                Réinitialiser mon mot de passe
            </a>
        </div>

        <p style="color: #666; font-size: 14px;">
            Ce lien est valable pendant <strong>1 heure</strong>.
        </p>

        <p style="color: #666; font-size: 14px;">
            Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="color: #888; font-size: 12px;">
            Cordialement,<br>
            L'équipe KYOOL Media
        </p>

        <p style="color: #888; font-size: 11px;">
            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
    </div>
</body>
</html>
"""

            # Attach both parts
            part1 = MIMEText(text_content, 'plain', 'utf-8')
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part1)
            msg.attach(part2)

            # Send email
            # Use SMTP_SSL for port 465, SMTP with STARTTLS for port 587
            if settings.SMTP_PORT == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    if settings.SMTP_TLS:
                        server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)

            logger.info(f"Password reset email sent successfully to {email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return False
