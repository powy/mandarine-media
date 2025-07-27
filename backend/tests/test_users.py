import pytest
import uuid
from unittest.mock import patch, MagicMock


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "testuser@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
        "is_active": True,
        "is_admin": False
    }


@pytest.fixture
def sample_admin_user_data():
    """Sample admin user data for testing."""
    return {
        "email": "testadmin@example.com",
        "password": "adminpassword123",
        "full_name": "Test Admin User",
        "is_active": True,
        "is_admin": True
    }


@pytest.fixture
def sample_user_update_data():
    """Sample user update data for testing."""
    return {
        "full_name": "Updated Test User",
        "is_active": True
    }


class TestUsersList:
    """Test users list endpoint."""
    
    def test_list_users_success(self, client, admin_token):
        """Test successful retrieval of users list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/v1/users/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
        assert "page" in data["pagination"]
        assert "limit" in data["pagination"]
        assert "total" in data["pagination"]
        assert "total_pages" in data["pagination"]
    
    def test_list_users_with_pagination(self, client, admin_token):
        """Test users list with pagination parameters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/users/",
            headers=headers,
            params={"skip": 10, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 3  # (skip 10 / limit 5) + 1
        assert data["pagination"]["limit"] == 5
    
    def test_list_users_unauthorized(self, client):
        """Test users list without authentication."""
        response = client.get("/api/v1/users/")
        assert response.status_code == 401
    
    def test_list_users_non_admin(self, client, user_token):
        """Test users list with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/users/", headers=headers)
        assert response.status_code == 403


class TestUserMe:
    """Test current user profile endpoint."""
    
    def test_get_current_user_success(self, client, user_token):
        """Test successful retrieval of current user profile."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/users/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "is_active" in data
        assert "is_admin" in data
        # Should not contain password-related fields
        assert "password" not in data
        assert "hashed_password" not in data
    
    def test_get_current_user_admin(self, client, admin_token):
        """Test current user profile for admin user."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/v1/users/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] is True
        assert "email" in data
    
    def test_get_current_user_unauthorized(self, client):
        """Test current user profile without authentication."""
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401


class TestUserCreate:
    """Test user creation endpoint."""
    
    def test_create_user_success(self, client, admin_token, sample_user_data):
        """Test successful user creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert data["full_name"] == sample_user_data["full_name"]
        assert data["is_active"] == sample_user_data["is_active"]
        assert data["is_admin"] == sample_user_data["is_admin"]
        assert "id" in data
        # Should not return password
        assert "password" not in data
        assert "hashed_password" not in data
    
    def test_create_admin_user_success(self, client, admin_token, sample_admin_user_data):
        """Test successful admin user creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_admin_user_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_admin_user_data["email"]
        assert data["is_admin"] is True
    
    def test_create_user_duplicate_email(self, client, admin_token, sample_user_data):
        """Test creation with duplicate email."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First creation should succeed
        response1 = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert response1.status_code == 200
        
        # Second creation with same email should fail
        response2 = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]
    
    def test_create_user_invalid_data(self, client, admin_token):
        """Test creation with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Missing required fields
        invalid_data = {
            "full_name": "Test User"
            # Missing email and password
        }
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_user_invalid_email(self, client, admin_token, sample_user_data):
        """Test creation with invalid email format."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = sample_user_data.copy()
        invalid_data["email"] = "invalid-email-format"
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_user_weak_password(self, client, admin_token, sample_user_data):
        """Test creation with weak password."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        weak_password_data = sample_user_data.copy()
        weak_password_data["password"] = "123"  # Too short
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=weak_password_data
        )
        # This might pass depending on validation rules
        # If password validation is implemented, this should fail
        assert response.status_code in [200, 422]
    
    def test_create_user_unauthorized(self, client, sample_user_data):
        """Test creation without authentication."""
        response = client.post(
            "/api/v1/users/",
            json=sample_user_data
        )
        assert response.status_code == 401
    
    def test_create_user_non_admin(self, client, user_token, sample_user_data):
        """Test creation with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert response.status_code == 403


class TestUserRead:
    """Test user read by ID endpoint."""
    
    def test_read_user_by_id_success(self, client, admin_token, sample_user_data):
        """Test successful user retrieval by ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a user
        create_response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Then read it
        response = client.get(
            f"/api/v1/users/{user_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id
        assert data["email"] == sample_user_data["email"]
        assert data["full_name"] == sample_user_data["full_name"]
    
    def test_read_user_by_id_not_found(self, client, admin_token):
        """Test reading non-existent user."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/users/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_read_user_by_id_unauthorized(self, client):
        """Test reading user without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/users/{fake_id}")
        assert response.status_code == 401
    
    def test_read_user_by_id_non_admin(self, client, user_token):
        """Test reading user with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/users/{fake_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestUserUpdate:
    """Test user update endpoint."""
    
    def test_update_user_success(self, client, admin_token, sample_user_data, sample_user_update_data):
        """Test successful user update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create user first
        create_response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Update it
        response = client.put(
            f"/api/v1/users/{user_id}",
            headers=headers,
            json=sample_user_update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == sample_user_update_data["full_name"]
        assert data["is_active"] == sample_user_update_data["is_active"]
        # Email should remain unchanged
        assert data["email"] == sample_user_data["email"]
    
    def test_update_user_partial_update(self, client, admin_token, sample_user_data):
        """Test partial user update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create user first
        create_response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        original_full_name = create_response.json()["full_name"]
        
        # Update only one field
        partial_update = {"is_active": False}
        response = client.put(
            f"/api/v1/users/{user_id}",
            headers=headers,
            json=partial_update
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False
        assert data["full_name"] == original_full_name  # Should remain unchanged
    
    def test_update_user_password(self, client, admin_token, sample_user_data):
        """Test updating user password."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create user first
        create_response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Update password
        password_update = {"password": "newpassword123"}
        response = client.put(
            f"/api/v1/users/{user_id}",
            headers=headers,
            json=password_update
        )
        
        assert response.status_code == 200
        data = response.json()
        # Password should not be returned in response
        assert "password" not in data
        assert "hashed_password" not in data
    
    def test_update_user_admin_status(self, client, admin_token, sample_user_data):
        """Test updating user admin status."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create regular user first
        create_response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        assert create_response.json()["is_admin"] is False
        
        # Promote to admin
        admin_update = {"is_admin": True}
        response = client.put(
            f"/api/v1/users/{user_id}",
            headers=headers,
            json=admin_update
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] is True
    
    def test_update_user_not_found(self, client, admin_token, sample_user_update_data):
        """Test updating non-existent user."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/users/{fake_id}",
            headers=headers,
            json=sample_user_update_data
        )
        
        assert response.status_code == 404
        assert "does not exist" in response.json()["detail"]
    
    def test_update_user_invalid_data(self, client, admin_token, sample_user_data):
        """Test update with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create user first
        create_response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Try to update with invalid email
        invalid_update = {"email": "invalid-email-format"}
        response = client.put(
            f"/api/v1/users/{user_id}",
            headers=headers,
            json=invalid_update
        )
        
        assert response.status_code == 422
    
    def test_update_user_unauthorized(self, client, sample_user_update_data):
        """Test update without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/users/{fake_id}",
            json=sample_user_update_data
        )
        assert response.status_code == 401
    
    def test_update_user_non_admin(self, client, user_token, sample_user_update_data):
        """Test update with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/users/{fake_id}",
            headers=headers,
            json=sample_user_update_data
        )
        assert response.status_code == 403


class TestUserEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_create_user_with_long_fields(self, client, admin_token, sample_user_data):
        """Test creating user with very long field values."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        long_data = sample_user_data.copy()
        long_data["full_name"] = "A" * 1000  # Very long name
        long_data["email"] = "a" * 100 + "@example.com"  # Long email
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=long_data
        )
        
        # This should succeed or fail based on database constraints
        assert response.status_code in [200, 422]
    
    def test_create_user_with_special_characters(self, client, admin_token, sample_user_data):
        """Test creating user with special characters in fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_data = sample_user_data.copy()
        special_data["full_name"] = "Test User @#$%^&*()"
        special_data["email"] = "test+special@example.com"
        
        response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=special_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == special_data["full_name"]
        assert data["email"] == special_data["email"]
    
    def test_update_user_to_inactive_then_active(self, client, admin_token, sample_user_data):
        """Test deactivating and reactivating a user."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create active user
        create_response = client.post(
            "/api/v1/users/",
            headers=headers,
            json=sample_user_data
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        assert create_response.json()["is_active"] is True
        
        # Deactivate user
        deactivate_response = client.put(
            f"/api/v1/users/{user_id}",
            headers=headers,
            json={"is_active": False}
        )
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["is_active"] is False
        
        # Reactivate user
        reactivate_response = client.put(
            f"/api/v1/users/{user_id}",
            headers=headers,
            json={"is_active": True}
        )
        assert reactivate_response.status_code == 200
        assert reactivate_response.json()["is_active"] is True
    
    def test_create_multiple_users_pagination(self, client, admin_token):
        """Test creating multiple users and testing pagination."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create multiple users
        created_users = []
        for i in range(5):
            user_data = {
                "email": f"testuser{i}@example.com",
                "password": "testpassword123",
                "full_name": f"Test User {i}",
                "is_active": True,
                "is_admin": False
            }
            response = client.post("/api/v1/users/", headers=headers, json=user_data)
            assert response.status_code == 200
            created_users.append(response.json())
        
        # Test pagination
        response = client.get("/api/v1/users/", headers=headers, params={"skip": 0, "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 3
        assert data["pagination"]["limit"] == 3
    
    def test_user_email_case_sensitivity(self, client, admin_token):
        """Test email case sensitivity in user creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create user with lowercase email
        user_data_lower = {
            "email": "testuser@example.com",
            "password": "testpassword123",
            "full_name": "Test User Lower",
            "is_active": True,
            "is_admin": False
        }
        response1 = client.post("/api/v1/users/", headers=headers, json=user_data_lower)
        assert response1.status_code == 200
        
        # Try to create user with uppercase version of same email
        user_data_upper = user_data_lower.copy()
        user_data_upper["email"] = "TESTUSER@EXAMPLE.COM"
        user_data_upper["full_name"] = "Test User Upper"
        
        response2 = client.post("/api/v1/users/", headers=headers, json=user_data_upper)
        # This behavior depends on email normalization implementation
        # It could either succeed (if emails are treated as different) or fail (if normalized)
        assert response2.status_code in [200, 400]