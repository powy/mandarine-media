#!/usr/bin/env python3
import sqlite3
import uuid
from datetime import datetime
from passlib.context import CryptContext

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    # Connect to database
    conn = sqlite3.connect('kyool_media.db')
    cursor = conn.cursor()
    
    # Admin user details
    admin_email = "admin@kyool.com"
    admin_password = "admin123"
    admin_name = "KYOOL Admin"
    
    # Check if admin already exists
    cursor.execute("SELECT email FROM users WHERE email = ?", (admin_email,))
    if cursor.fetchone():
        print(f"Admin user already exists: {admin_email}")
        conn.close()
        return
    
    # Generate UUID and hash password
    user_id = str(uuid.uuid4()).replace('-', '')  # 32 char GUID
    hashed_password = pwd_context.hash(admin_password)
    creation_date = datetime.now().isoformat()
    
    # Insert admin user
    cursor.execute("""
        INSERT INTO users (id, creation_date_utc, email, hashed_password, full_name, is_active, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, creation_date, admin_email, hashed_password, admin_name, 1, 1))
    
    conn.commit()
    conn.close()
    
    print("Admin user created successfully!")
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")
    print("Please change the password after first login!")

if __name__ == "__main__":
    create_admin_user()