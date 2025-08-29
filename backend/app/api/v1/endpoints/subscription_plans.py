from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps

router = APIRouter()


@router.get("", response_model=List[schemas.subscription_plan.SubscriptionPlan])
def read_subscription_plans(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve subscription plans.
    """
    subscription_plans = crud.subscription_plan.get_multi(db=db, skip=skip, limit=limit)
    return subscription_plans


@router.post("", response_model=schemas.subscription_plan.SubscriptionPlan)
def create_subscription_plan(
    *,
    db: Session = Depends(deps.get_db),
    subscription_plan_in: schemas.subscription_plan.SubscriptionPlanCreate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new subscription plan. Admin only.
    """
    # Check if name already exists
    existing = crud.subscription_plan.get_by_name(db=db, name=subscription_plan_in.name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Subscription plan with name {subscription_plan_in.name} already exists",
        )
    
    subscription_plan = crud.subscription_plan.create(db=db, obj_in=subscription_plan_in)
    return subscription_plan


@router.get("/{id}", response_model=schemas.subscription_plan.SubscriptionPlan)
def read_subscription_plan(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get subscription plan by ID.
    """
    subscription_plan = crud.subscription_plan.get(db=db, id=id)
    if not subscription_plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")
    
    return subscription_plan


@router.put("/{id}", response_model=schemas.subscription_plan.SubscriptionPlan)
def update_subscription_plan(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    subscription_plan_in: schemas.subscription_plan.SubscriptionPlanUpdate,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a subscription plan. Admin only.
    """
    subscription_plan = crud.subscription_plan.get(db=db, id=id)
    if not subscription_plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")
    
    # Check if updating name to an existing one
    if subscription_plan_in.name is not None:
        existing = crud.subscription_plan.get_by_name(db=db, name=subscription_plan_in.name)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=409,
                detail=f"Subscription plan with name {subscription_plan_in.name} already exists",
            )
    
    subscription_plan = crud.subscription_plan.update(db=db, db_obj=subscription_plan, obj_in=subscription_plan_in)
    return subscription_plan


@router.delete("/{id}", response_model=schemas.subscription_plan.SubscriptionPlan)
def delete_subscription_plan(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: schemas.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a subscription plan. Admin only.
    """
    subscription_plan = crud.subscription_plan.get(db=db, id=id)
    if not subscription_plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")
    
    subscription_plan = crud.subscription_plan.remove(db=db, id=id)
    return subscription_plan