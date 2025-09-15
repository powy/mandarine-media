from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
import uuid
from .subscription_plan import SubscriptionPlan


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    subscription_plans: Optional[List[SubscriptionPlan]] = Field(default_factory=list, description="User's subscription plans")


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = None
    subscription_plans: Optional[List[SubscriptionPlan]] = Field(default_factory=list, description="User's subscription plans")


class UserInDBBase(UserBase):
    id: uuid.UUID
    creation_date_utc: datetime

    model_config = {"from_attributes": True}


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None