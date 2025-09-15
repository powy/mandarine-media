from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., description="Plan name")


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None


class SubscriptionPlanInDB(SubscriptionPlanBase):
    id: UUID
    creation_date_utc: datetime

    model_config = ConfigDict(from_attributes=True)


class SubscriptionPlan(SubscriptionPlanInDB):
    pass