from pydantic import BaseModel, EmailStr


class PasswordResetRequest(BaseModel):
    """Request to initiate password reset"""
    email: EmailStr
    email_confirm: EmailStr
    turnstileToken: str


class PasswordResetRequestResponse(BaseModel):
    """Response for password reset request - always success for security"""
    success: bool = True
    message: str


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token"""
    token: str
    new_password: str
    new_password_confirm: str


class PasswordResetConfirmResponse(BaseModel):
    """Response for password reset confirmation"""
    success: bool
    message: str
