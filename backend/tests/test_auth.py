import pytest
from app.crud.user import user as crud_user
from app.schemas.user import UserCreate
from tests.conftest import TestingSessionLocal


@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword",
        full_name="Test User"
    )
    # Create test user if it doesn't exist
    existing_user = crud_user.get_by_email(db, email=user_in.email)
    if not existing_user:
        user = crud_user.create(db, obj_in=user_in)
    else:
        user = existing_user
    db.close()
    return user


def test_login_success(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "testpassword"},
    )
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_login_failure(client):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401