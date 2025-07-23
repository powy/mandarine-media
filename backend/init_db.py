#!/usr/bin/env python3
"""
Database initialization script for KYOOL Media Backend
Creates tables, runs migrations, and sets up admin user
"""
import sys
import os

# Add the current directory to the path to import app modules
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import engine, SessionLocal, Base
from app.crud.user import user as crud_user
from app.schemas.user import UserCreate
from app import models

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    # Import all models to ensure they're registered with Base
    from app.models import user, media_description, video_file, public_person, audience_category, subscription_plan
    
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

def create_admin_user():
    """Create default admin user"""
    print("Creating admin user...")
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        admin_email = "admin@kyool.com"
        existing_admin = crud_user.get_by_email(db, email=admin_email)
        
        if existing_admin:
            print(f"⚠️  Admin user already exists: {admin_email}")
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
        
        print(f"✅ Admin user created successfully")
        print(f"📧 Email: {admin_email}")
        print(f"🔑 Password: admin123")
        print("⚠️  Please change the password after first login!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main initialization function"""
    print("🚀 Initializing KYOOL Media Database...")
    print("=" * 50)
    
    try:
        # Create tables
        create_tables()
        print()
        
        # Create admin user
        create_admin_user()
        print()
        
        print("=" * 50)
        print("🎉 Database initialization completed successfully!")
        print()
        print("Next steps:")
        print("1. Start the backend server: ./start_server.sh")
        print("2. Access the back office at: http://localhost:3001")
        print("3. Login with admin@kyool.com / admin123")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()