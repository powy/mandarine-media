from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.api.deps import get_current_active_user, get_current_admin_user
from app.crud.user import user as crud_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import paginate_query

router = APIRouter()


@router.get("", response_model=PaginatedResponse[UserSchema])
def read_users(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    is_admin: Optional[bool] = Query(None),
    q: Optional[str] = Query(None, description="Search by email or name"),
    order_by: Optional[str] = Query(None, description="Field to sort by"),
    order_dir: Optional[str] = Query('asc', description="Sort direction (asc|desc)"),
    current_admin: User = Depends(get_current_admin_user),
):
    query = db.query(User)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if is_admin is not None:
        query = query.filter(User.is_admin == is_admin)

    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(or_(User.email.ilike(search_term), User.full_name.ilike(search_term)))

    users, pagination = paginate_query(
        query,
        User,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir,
        default_sort='creation_date_utc',
        allowed_sort_fields=(
            'creation_date_utc',
            'email',
            'full_name',
            'is_active',
            'is_admin',
            'id',
        ),
    )

    return PaginatedResponse[UserSchema](data=users, pagination=pagination)


@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(get_current_active_user),
):
    return current_user


@router.post("", response_model=UserSchema)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_admin: User = Depends(get_current_admin_user),
):
    user = crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = crud_user.create(db, obj_in=user_in)
    return user


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: UUID,
    user_in: UserUpdate,
    current_admin: User = Depends(get_current_admin_user),
):
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system",
        )
    user = crud_user.update(db, db_obj=user, obj_in=user_in)
    return user


@router.get("/{user_id}", response_model=UserSchema)
def read_user_by_id(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# Subscription Plan Relationship Endpoints

@router.post("/{user_id}/subscription_plans/{plan_id}", response_model=UserSchema)
def add_subscription_plan_to_user(
    *,
    db: Session = Depends(get_db),
    user_id: UUID,
    plan_id: UUID,
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Add a subscription plan to a user.
    """
    user = crud_user.get(db=db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    updated_user = crud_user.add_subscription_plan(
        db=db, user_id=user_id, plan_id=plan_id
    )

    if not updated_user:
        raise HTTPException(
            status_code=400,
            detail="Failed to add subscription plan to user"
        )

    return updated_user


@router.delete("/{user_id}/subscription_plans/{plan_id}", response_model=UserSchema)
def remove_subscription_plan_from_user(
    *,
    db: Session = Depends(get_db),
    user_id: UUID,
    plan_id: UUID,
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Remove a subscription plan from a user.
    """
    user = crud_user.get(db=db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    updated_user = crud_user.remove_subscription_plan(
        db=db, user_id=user_id, plan_id=plan_id
    )

    if not updated_user:
        raise HTTPException(
            status_code=400,
            detail="Failed to remove subscription plan from user"
        )

    return updated_user


@router.put("/{user_id}/subscription_plans", response_model=UserSchema)
def update_user_subscription_plans(
    *,
    db: Session = Depends(get_db),
    user_id: UUID,
    plan_ids: List[UUID],
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Update all subscription plans for a user.
    """
    user = crud_user.get(db=db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    updated_user = crud_user.update_subscription_plans(
        db=db, user_id=user_id, plan_ids=plan_ids
    )

    if not updated_user:
        raise HTTPException(
            status_code=400,
            detail="Failed to update subscription plans for user"
        )

    return updated_user
