from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID
from app.models.associations import media_description_eligible_plans


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plan"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String, nullable=False, unique=True)
    
    # Many-to-many relationships with MediaDescription
    eligible_media = relationship("MediaDescription", secondary=media_description_eligible_plans, back_populates="eligible_plan_id_list")