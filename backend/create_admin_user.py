from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin_user():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == 'admin@example.com').first()
        
        if existing:
            print('Admin user already exists')
            return
        
        user = User(
            email='admin@example.com',
            hashed_password=get_password_hash('admin123'),
            full_name='Admin User',
            is_active=True,
            is_admin=True
        )
        
        db.add(user)
        db.commit()
        print('Admin user created successfully!')
        print('Email: admin@example.com')
        print('Password: admin123')
        
    except Exception as e:
        print(f'Error creating user: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    create_admin_user()