import pytest
import tempfile
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db, Base
from app.core.config import settings
from app.crud.user import user as crud_user
from app.schemas.user import UserCreate
from app.core.security import create_access_token

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_session():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(db_session):
    """Provide a transactional database session for tests."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """Client fixture that uses the isolated database session."""
    def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_admin_user():
    """Create a test admin user."""
    db = TestingSessionLocal()
    user_in = UserCreate(
        email="admin@kyool.com",
        password="adminpassword",
        full_name="Admin User",
        is_admin=True
    )
    # Create admin user if it doesn't exist
    existing_user = crud_user.get_by_email(db, email=user_in.email)
    if not existing_user:
        user = crud_user.create(db, obj_in=user_in)
    else:
        user = existing_user
        # Ensure user is admin
        user.is_admin = True
        db.commit()
        db.refresh(user)
    db.close()
    return user


@pytest.fixture
def test_regular_user():
    """Create a test regular user."""
    db = TestingSessionLocal()
    user_in = UserCreate(
        email="user@kyool.com",
        password="userpassword",
        full_name="Regular User",
        is_admin=False
    )
    # Create regular user if it doesn't exist
    existing_user = crud_user.get_by_email(db, email=user_in.email)
    if not existing_user:
        user = crud_user.create(db, obj_in=user_in)
    else:
        user = existing_user
        # Ensure user is not admin
        user.is_admin = False
        db.commit()
        db.refresh(user)
    db.close()
    return user


@pytest.fixture
def admin_token(test_admin_user):
    """Create access token for admin user."""
    return create_access_token(subject=test_admin_user.email)


@pytest.fixture
def user_token(test_regular_user):
    """Create access token for regular user."""
    return create_access_token(subject=test_regular_user.email)


@pytest.fixture
def sample_media_description(db):
    """Create a sample media description for testing."""
    from app import crud
    from app.schemas.media_description import MediaDescriptionCreate
    
    media_data = MediaDescriptionCreate(
        episode_title="Test Media Description",
        media_type="video",
        file_number=999  # Use high number to avoid conflicts
    )
    
    return crud.media_description.create(db=db, obj_in=media_data)