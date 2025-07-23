from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.subscription_plan import SubscriptionPlan
from app.schemas.subscription_plan import SubscriptionPlanCreate, SubscriptionPlanUpdate


class CRUDSubscriptionPlan(CRUDBase[SubscriptionPlan, SubscriptionPlanCreate, SubscriptionPlanUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[SubscriptionPlan]:
        return db.query(SubscriptionPlan).filter(SubscriptionPlan.name == name).first()


subscription_plan = CRUDSubscriptionPlan(SubscriptionPlan)