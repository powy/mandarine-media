#!/usr/bin/env python3
import sys
import os

# Add the parent directory to the path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.database import SessionLocal
from app.crud.user import user as crud_user
from app.schemas.user import UserCreate


def create_admin_user():
    db = SessionLocal()
    
    # Check if admin user already exists
    admin_email = "admin@kyool.com"
    existing_admin = crud_user.get_by_email(db, email=admin_email)
    
    if existing_admin:
        print(f"Admin user already exists: {admin_email}")
        return
    
    # Create admin user
    admin_user_data = UserCreate(
        email=admin_email,
        password="admin123",  # Change this in production
        full_name="KYOOL Admin",
        is_active=True
    )
    
    admin_user = crud_user.create(db, obj_in=admin_user_data)
    
    # Set admin privileges
    admin_user.is_admin = True
    db.commit()
    
    print(f"Admin user created successfully: {admin_email}")
    print("Default password: admin123")
    print("Please change the password after first login!")
    
    db.close()


if __name__ == "__main__":
    create_admin_user()