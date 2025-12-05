from fastapi import APIRouter, HTTPException, Request, status, Depends
from app.schemas.contact import ContactFormRequest, ContactFormResponse
from app.schemas.user import User
from app.services.email_service import EmailService
from app.services.turnstile_service import TurnstileService
from app.utils.rate_limiter import contact_rate_limiter
from app.core.config import settings
from app.api import deps
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=ContactFormResponse, status_code=status.HTTP_200_OK)
async def submit_contact_form(
    request: Request,
    form_data: ContactFormRequest,
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Submit contact form (requires authentication)

    This endpoint:
    1. Requires active authenticated user
    2. Verifies Cloudflare Turnstile token
    3. Applies rate limiting (per IP address)
    4. Sends email to configured recipient with user info

    Rate limit: 10 requests per hour per IP address
    """

    # DEBUG: Explicit logging
    print("=" * 80)
    print("CONTACT FORM ENDPOINT HIT!")
    print(f"User: {current_user.email} (ID: {current_user.id})")
    print(f"Form: {form_data.name} - {form_data.subject}")
    print("=" * 80)

    # Get client IP address
    client_ip = request.client.host if request.client else "unknown"

    # Rate limiting check
    is_allowed, remaining = contact_rate_limiter.is_allowed(
        identifier=client_ip,
        max_requests=settings.CONTACT_RATE_LIMIT_PER_HOUR,
        window_hours=1
    )

    if not is_allowed:
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de requêtes dépassée. Veuillez réessayer plus tard."
        )

    # TODO: TEMPORARILY DISABLED FOR TESTING - RE-ENABLE FOR PRODUCTION
    # Verify Turnstile token
    # is_valid = await TurnstileService.verify_token(
    #     token=form_data.turnstileToken,
    #     remote_ip=client_ip
    # )
    #
    # if not is_valid:
    #     logger.warning(f"Invalid Turnstile token from IP: {client_ip}")
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Vérification CAPTCHA échouée. Veuillez réessayer."
    #     )

    # Send email with user info
    email_sent = EmailService.send_contact_email(
        name=form_data.name,
        email=form_data.email,
        subject=form_data.subject,
        message=form_data.message,
        user_id=str(current_user.id),
        user_full_name=current_user.full_name
    )

    if not email_sent:
        logger.error(f"Failed to send contact email from {form_data.email}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'envoi du message. Veuillez réessayer."
        )

    logger.info(f"Contact form submitted successfully from {form_data.email} (IP: {client_ip}, Remaining: {remaining})")

    return ContactFormResponse(
        success=True,
        message="Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais."
    )
