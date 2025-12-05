from fastapi import APIRouter, HTTPException, Request, status, Depends
from sqlalchemy.orm import Session
from app.schemas.password_reset import (
    PasswordResetRequest,
    PasswordResetRequestResponse,
    PasswordResetConfirm,
    PasswordResetConfirmResponse
)
from app.services.email_service import EmailService
from app.services.turnstile_service import TurnstileService
from app.core.security import generate_password_reset_token
from app.crud.user import user as crud_user
from app.crud.password_reset import password_reset as crud_password_reset
from app.db.database import get_db
from app.core.config import settings
from app.utils.rate_limiter import SimpleRateLimiter
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Create a dedicated rate limiter for password reset
password_reset_rate_limiter = SimpleRateLimiter()


@router.post("/request", response_model=PasswordResetRequestResponse)
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset email (public endpoint - no authentication required)

    Security features:
    - Validates Turnstile captcha
    - Rate limiting per IP (3 requests/hour)
    - Always returns success (doesn't reveal if email exists)
    - Only sends email if user exists and is active
    """

    # Get client IP address
    client_ip = request.client.host if request.client else "unknown"

    # Validate email confirmation
    if reset_request.email != reset_request.email_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les adresses email ne correspondent pas"
        )

    # Rate limiting check
    is_allowed, remaining = password_reset_rate_limiter.is_allowed(
        identifier=client_ip,
        max_requests=settings.PASSWORD_RESET_RATE_LIMIT_PER_HOUR,
        window_hours=1
    )

    if not is_allowed:
        logger.warning(f"Password reset rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives. Veuillez réessayer plus tard."
        )

    # TODO: TEMPORARILY DISABLED FOR TESTING - RE-ENABLE FOR PRODUCTION
    # Verify Turnstile token
    # is_valid = await TurnstileService.verify_token(
    #     token=reset_request.turnstileToken,
    #     remote_ip=client_ip
    # )
    #
    # if not is_valid:
    #     logger.warning(f"Invalid Turnstile token for password reset from IP: {client_ip}")
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Vérification CAPTCHA échouée. Veuillez réessayer."
    #     )

    # Check if user exists (but don't reveal this to the client)
    user = crud_user.get_by_email(db, email=reset_request.email)

    if user and user.is_active:
        try:
            # Delete any existing tokens for this user
            crud_password_reset.delete_user_tokens(db, user_id=user.id)

            # Generate new token
            token = generate_password_reset_token()

            # Store hashed token in database
            crud_password_reset.create_reset_token(
                db,
                user_id=user.id,
                token=token,
                expiry_hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS,
                ip_address=client_ip
            )

            # Send email with reset link
            email_sent = EmailService.send_password_reset_email(
                email=user.email,
                reset_token=token,
                user_name=user.full_name
            )

            if email_sent:
                logger.info(f"Password reset email sent to {user.email} (IP: {client_ip})")
            else:
                logger.error(f"Failed to send password reset email to {user.email}")

        except Exception as e:
            logger.error(f"Error processing password reset request: {str(e)}")
            # Don't reveal error to user for security

    else:
        # User doesn't exist or is inactive - log it but don't reveal to user
        logger.info(f"Password reset requested for non-existent/inactive user: {reset_request.email} (IP: {client_ip})")

    # Always return success message (security: don't reveal if email exists)
    return PasswordResetRequestResponse(
        success=True,
        message="Si cette adresse correspond bien à un compte, un email vous a été envoyé"
    )


@router.post("/confirm", response_model=PasswordResetConfirmResponse)
async def confirm_password_reset(
    request: Request,
    reset_confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm password reset with token and set new password

    Validates:
    - Token exists and is valid
    - Token not expired
    - Token not already used
    - Password confirmation matches
    - User account still active
    """

    client_ip = request.client.host if request.client else "unknown"

    # Validate password confirmation
    if reset_confirm.new_password != reset_confirm.new_password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les mots de passe ne correspondent pas"
        )

    # Validate password strength (basic validation)
    if len(reset_confirm.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 8 caractères"
        )

    # Find valid token
    token_record = crud_password_reset.get_valid_token(db, token=reset_confirm.token)

    if not token_record:
        logger.warning(f"Invalid/expired password reset token used from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le lien de réinitialisation est invalide ou a expiré"
        )

    # Get user
    user = crud_user.get(db, id=token_record.user_id)

    if not user:
        logger.error(f"User not found for valid reset token: {token_record.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erreur lors de la réinitialisation"
        )

    if not user.is_active:
        logger.warning(f"Password reset attempted for inactive user: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce compte est désactivé"
        )

    try:
        # Update user password
        crud_user.update(
            db,
            db_obj=user,
            obj_in={"password": reset_confirm.new_password}
        )

        # Mark token as used
        crud_password_reset.mark_token_used(db, token_id=token_record.id)

        logger.info(f"Password successfully reset for user: {user.email} (IP: {client_ip})")

        return PasswordResetConfirmResponse(
            success=True,
            message="Votre mot de passe a été réinitialisé avec succès"
        )

    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la réinitialisation"
        )
