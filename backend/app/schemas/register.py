from pydantic import BaseModel, EmailStr


class UserRegistrationRequest(BaseModel):
    """Request to register a new user"""
    email: EmailStr
    email_confirm: EmailStr
    turnstileToken: str


class UserRegistrationResponse(BaseModel):
    """Response for user registration"""
    success: bool
    message: str
