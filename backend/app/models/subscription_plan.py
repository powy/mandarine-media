from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plan"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False, unique=True)