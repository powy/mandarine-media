import httpx
from typing import Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class TurnstileService:
    """Service for verifying Cloudflare Turnstile tokens"""

    VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

    @staticmethod
    async def verify_token(token: str, remote_ip: Optional[str] = None) -> bool:
        """
        Verify Cloudflare Turnstile token

        Args:
            token: Turnstile token from frontend
            remote_ip: Optional IP address of the user

        Returns:
            bool: True if token is valid, False otherwise
        """
        if not settings.TURNSTILE_SECRET_KEY:
            logger.error("TURNSTILE_SECRET_KEY not configured")
            return False

        try:
            data = {
                "secret": settings.TURNSTILE_SECRET_KEY,
                "response": token,
            }

            if remote_ip:
                data["remoteip"] = remote_ip

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    TurnstileService.VERIFY_URL,
                    data=data,
                    timeout=10.0
                )

                if response.status_code != 200:
                    logger.error(f"Turnstile API error: {response.status_code}")
                    return False

                result = response.json()

                if result.get("success"):
                    logger.info("Turnstile token verified successfully")
                    return True
                else:
                    logger.warning(f"Turnstile verification failed: {result.get('error-codes')}")
                    return False

        except Exception as e:
            logger.error(f"Turnstile verification exception: {str(e)}")
            return False
