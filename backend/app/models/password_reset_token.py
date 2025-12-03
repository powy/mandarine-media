from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class PasswordResetToken(Base):
    """Model for storing password reset tokens"""
    __tablename__ = "password_reset_tokens"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)  # Hashed token (bcrypt)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    ip_address = Column(String, nullable=True)
