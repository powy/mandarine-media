from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.password_reset_token import PasswordResetToken
from app.core.security import hash_reset_token, verify_reset_token


class CRUDPasswordReset:
    """CRUD operations for password reset tokens"""

    def create_reset_token(
        self,
        db: Session,
        *,
        user_id: str,
        token: str,
        expiry_hours: int = 1,
        ip_address: Optional[str] = None
    ) -> PasswordResetToken:
        """Create a new password reset token"""
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)
        hashed_token = hash_reset_token(token)

        db_obj = PasswordResetToken(
            user_id=user_id,
            token=hashed_token,
            expires_at=expires_at,
            ip_address=ip_address
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_valid_token(
        self,
        db: Session,
        *,
        token: str
    ) -> Optional[PasswordResetToken]:
        """Get a valid (not expired, not used) reset token"""
        # Get all tokens and check each one (since we store hashed)
        all_tokens = db.query(PasswordResetToken).filter(
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > datetime.now(timezone.utc)
        ).all()

        for db_token in all_tokens:
            if verify_reset_token(token, db_token.token):
                return db_token
        return None

    def mark_token_used(
        self,
        db: Session,
        *,
        token_id: str
    ) -> PasswordResetToken:
        """Mark a token as used"""
        db_obj = db.query(PasswordResetToken).filter(
            PasswordResetToken.id == token_id
        ).first()
        if db_obj:
            db_obj.used_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def delete_user_tokens(
        self,
        db: Session,
        *,
        user_id: str
    ) -> None:
        """Delete all reset tokens for a user"""
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id
        ).delete()
        db.commit()

    def cleanup_expired_tokens(self, db: Session) -> int:
        """Delete expired tokens (can be run periodically)"""
        count = db.query(PasswordResetToken).filter(
            PasswordResetToken.expires_at < datetime.now(timezone.utc)
        ).delete()
        db.commit()
        return count


password_reset = CRUDPasswordReset()
