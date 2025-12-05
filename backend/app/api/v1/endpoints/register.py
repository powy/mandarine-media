from fastapi import APIRouter, HTTPException, Request, status, Depends
from sqlalchemy.orm import Session
import secrets
from app.schemas.register import UserRegistrationRequest, UserRegistrationResponse
from app.schemas.user import UserCreate
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

# Create a dedicated rate limiter for registration
registration_rate_limiter = SimpleRateLimiter()


@router.post("", response_model=UserRegistrationResponse)
async def register_user(
    request: Request,
    registration_request: UserRegistrationRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user account (public endpoint - no authentication required)

    Security features:
    - Validates Turnstile captcha
    - Rate limiting per IP (5 requests/hour)
    - Checks if email already exists
    - Creates user with secure temporary password
    - Sends password reset email for user to set their password
    """

    # Get client IP address
    client_ip = request.client.host if request.client else "unknown"

    # Validate email confirmation
    if registration_request.email != registration_request.email_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les adresses email ne correspondent pas"
        )

    # Rate limiting check
    is_allowed, remaining = registration_rate_limiter.is_allowed(
        identifier=client_ip,
        max_requests=settings.REGISTRATION_RATE_LIMIT_PER_HOUR,
        window_hours=1
    )

    if not is_allowed:
        logger.warning(f"Registration rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives. Veuillez réessayer plus tard."
        )

    # Verify Turnstile token
    is_valid = await TurnstileService.verify_token(
        token=registration_request.turnstileToken,
        remote_ip=client_ip
    )

    if not is_valid:
        logger.warning(f"Invalid Turnstile token for registration from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vérification CAPTCHA échouée. Veuillez réessayer."
        )

    # Check if user already exists
    existing_user = crud_user.get_by_email(db, email=registration_request.email)
    if existing_user:
        logger.info(f"Registration attempted for existing email: {registration_request.email} (IP: {client_ip})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cette adresse email"
        )

    try:
        # Generate a secure temporary password (user won't know this)
        temporary_password = secrets.token_urlsafe(32)

        # Create user with temporary password
        user_create = UserCreate(
            email=registration_request.email,
            password=temporary_password,
            full_name=None  # Optional field, not collected during registration
        )

        new_user = crud_user.create(db, obj_in=user_create)

        logger.info(f"User created successfully: {new_user.email} (IP: {client_ip})")

        # Generate password reset token
        token = generate_password_reset_token()

        # Store hashed token in database
        crud_password_reset.create_reset_token(
            db,
            user_id=new_user.id,
            token=token,
            expiry_hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS,
            ip_address=client_ip
        )

        # Send password reset email so user can set their password
        email_sent = EmailService.send_password_reset_email(
            email=new_user.email,
            reset_token=token,
            user_name=new_user.full_name
        )

        if email_sent:
            logger.info(f"Password setup email sent to new user: {new_user.email}")
        else:
            logger.error(f"Failed to send password setup email to {new_user.email}")
            # Don't fail registration if email fails - security best practice

        return UserRegistrationResponse(
            success=True,
            message="Compte créé avec succès. Un email vous a été envoyé pour définir votre mot de passe."
        )

    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création du compte. Veuillez réessayer."
        )
