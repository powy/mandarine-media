from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
from app.models.associations import user_subscription_plans


class User(Base):
    """
    User Model - Authentication only

    This model handles authentication concerns only (email, password, access control).
    Platform-specific data (subscription, preferences, currency) is in the Account model.
    """
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True, comment="DEPRECATED: Use Account.full_name instead")
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # New fields from specification
    updated_at = Column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=func.now(),
        comment="Last authentication/user record update"
    )
    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last successful login timestamp"
    )
    last_login_ip = Column(
        String(45),
        nullable=True,
        comment="Last login IP address (supports IPv6)"
    )

    # Relationships
    # One-to-one relationship with Account
    account = relationship("Account", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # Many-to-many relationships with SubscriptionPlan (DEPRECATED: use Account.subscription_plan instead)
    subscription_plans = relationship("SubscriptionPlan", secondary=user_subscription_plans, back_populates="users")
