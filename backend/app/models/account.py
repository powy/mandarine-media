"""
Account Model - Platform-specific user data and preferences

This model handles platform-specific user data separate from authentication (User model).
Follows account-specification-v1.6.md for separation of concerns between auth and platform data.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, CheckConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.database import Base
from app.models.common import GUID


class SubscriptionPlanEnum(str, enum.Enum):
    """Subscription plan types"""
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    VIP = "vip"
    TRIAL = "trial"


class AgeCategoryEnum(str, enum.Enum):
    """Age category for content filtering"""
    KID = "kid"      # < 13 years
    TEEN = "teen"    # 13-17 years
    ADULT = "adult"  # 18+ years


class Account(Base):
    """
    Platform-specific user account data.

    This table holds platform preferences, subscription status, and virtual currency.
    It has a one-to-one relationship with the User table (authentication).

    Key principles:
    - One account per user (created automatically on user registration)
    - Subscription managed via subscription_plan and subscription_expire_at
    - Virtual currency is read-only via normal APIs (use transaction endpoints)
    - All changes tracked via updated_at, updated_by
    """
    __tablename__ = "accounts"

    # Primary key and relationships
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )

    # Profile information
    full_name = Column(String(255), nullable=True)

    # Subscription information
    subscription_plan = Column(
        SQLEnum(SubscriptionPlanEnum, name="subscription_plan_enum"),
        nullable=False,
        default=SubscriptionPlanEnum.FREE,
        server_default="free"
    )
    subscription_expire_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="NULL means no expiration (free or lifetime)"
    )

    # User preferences
    language_preference = Column(
        String(5),
        nullable=False,
        default="en",
        server_default="en",
        comment="ISO 639-1 language code"
    )
    country = Column(
        String(2),
        nullable=True,
        comment="ISO-3166 country code for content rights"
    )
    age_category = Column(
        SQLEnum(AgeCategoryEnum, name="age_category_enum"),
        nullable=True
    )
    max_allowed_rating = Column(
        Integer,
        nullable=True,
        comment="Content rating limit: 7, 10, 12, 16, 18"
    )

    # Virtual currency (managed via transaction endpoints only)
    virtual_currency_balance = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Available balance - READ ONLY via normal APIs"
    )
    virtual_currency_locked = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Locked funds during pending transactions"
    )

    # Audit fields
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    created_by = Column(
        String(50),
        nullable=False,
        default="system",
        server_default="system",
        comment="Service or user identifier that created this account"
    )
    updated_by = Column(
        String(50),
        nullable=False,
        default="system",
        server_default="system",
        comment="Service or user identifier that last updated this account"
    )

    # Relationships
    user = relationship("User", back_populates="account", uselist=False)

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            virtual_currency_balance >= 0,
            name='chk_currency_balance_positive'
        ),
        CheckConstraint(
            virtual_currency_locked >= 0,
            name='chk_currency_locked_positive'
        ),
        CheckConstraint(
            "(virtual_currency_balance + virtual_currency_locked) <= 999999",
            name='chk_currency_total_limit'
        ),
    )

    @property
    def available_balance(self) -> int:
        """Calculate available balance (total - locked)"""
        return self.virtual_currency_balance - self.virtual_currency_locked

    def __repr__(self):
        return (
            f"<Account(id={self.id}, user_id={self.user_id}, "
            f"subscription_plan={self.subscription_plan}, "
            f"balance={self.virtual_currency_balance})>"
        )
