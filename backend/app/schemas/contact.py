from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class ContactFormRequest(BaseModel):
    """Schema for contact form submission request"""
    name: str = Field(..., min_length=1, max_length=100, description="Sender name")
    email: EmailStr = Field(..., description="Sender email address")
    subject: str = Field(..., min_length=1, max_length=200, description="Message subject")
    message: str = Field(..., min_length=10, max_length=5000, description="Message content")
    turnstileToken: str = Field(..., description="Cloudflare Turnstile token")
    user_id: Optional[str] = Field(None, description="Authenticated user ID (UUID)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Jean Dupont",
                "email": "jean.dupont@example.com",
                "subject": "Question sur l'abonnement",
                "message": "Bonjour, j'aimerais avoir plus d'informations sur les options d'abonnement disponibles.",
                "turnstileToken": "xxxxx"
            }
        }
    }


class ContactFormResponse(BaseModel):
    """Schema for contact form submission response"""
    success: bool = Field(..., description="Whether the submission was successful")
    message: str = Field(..., description="Response message")
