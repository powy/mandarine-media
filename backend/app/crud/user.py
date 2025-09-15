from typing import Any, Dict, Optional, Union, List
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.subscription_plan import SubscriptionPlan
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser:
    def get(self, db: Session, id: Any) -> Optional[User]:
        return db.query(User).filter(User.id == id).first()

    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100):
        return db.query(User).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_active=obj_in.is_active,
            is_admin=obj_in.is_admin,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        if update_data.get("password"):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_admin(self, user: User) -> bool:
        return user.is_admin

    def add_subscription_plan(
        self, db: Session, *, user_id: UUID, plan_id: UUID
    ) -> Optional[User]:
        """Add a subscription plan to a user"""
        user_obj = db.query(User).filter(User.id == user_id).first()
        plan_obj = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()

        if user_obj and plan_obj:
            if plan_obj not in user_obj.subscription_plans:
                user_obj.subscription_plans.append(plan_obj)
                db.add(user_obj)
                db.commit()
                db.refresh(user_obj)
        return user_obj

    def remove_subscription_plan(
        self, db: Session, *, user_id: UUID, plan_id: UUID
    ) -> Optional[User]:
        """Remove a subscription plan from a user"""
        user_obj = db.query(User).filter(User.id == user_id).first()
        plan_obj = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()

        if user_obj and plan_obj:
            if plan_obj in user_obj.subscription_plans:
                user_obj.subscription_plans.remove(plan_obj)
                db.add(user_obj)
                db.commit()
                db.refresh(user_obj)
        return user_obj

    def update_subscription_plans(
        self, db: Session, *, user_id: UUID, plan_ids: List[UUID]
    ) -> Optional[User]:
        """Update all subscription plans for a user"""
        user_obj = db.query(User).filter(User.id == user_id).first()

        if user_obj:
            # Get the subscription plan objects
            plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.id.in_(plan_ids)).all()
            user_obj.subscription_plans = plans
            db.add(user_obj)
            db.commit()
            db.refresh(user_obj)
        return user_obj


user = CRUDUser()