import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_audience_category_data():
    """Sample audience category data for testing."""
    return {
        "name": "Family Friendly"
    }


@pytest.fixture
def sample_audience_category_update_data():
    """Sample audience category update data for testing."""
    return {
        "name": "All Ages"
    }


class TestAudienceCategoriesCRUD:
    """Test audience categories CRUD operations."""
    
    def test_create_audience_category_success(self, client, admin_token, sample_audience_category_data):
        """Test successful audience category creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_audience_category_data["name"]
        assert "id" in data
        assert "creation_date_utc" in data

    def test_create_audience_category_duplicate_name(self, client, admin_token, sample_audience_category_data):
        """Test audience category creation with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first audience category
        client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=headers)
        
        # Try to create duplicate
        response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_create_audience_category_requires_admin(self, client, user_token, sample_audience_category_data):
        """Test audience category creation requires admin access."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=headers)
        
        assert response.status_code == 403

    def test_create_audience_category_requires_auth(self, client, sample_audience_category_data):
        """Test audience category creation requires authentication."""
        response = client.post("/api/v1/audience-categories", json=sample_audience_category_data)
        
        assert response.status_code == 401

    def test_list_audience_categories_success(self, client, user_token):
        """Test successful retrieval of audience categories list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/audience-categories", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_audience_categories_requires_auth(self, client):
        """Test audience categories list requires authentication."""
        response = client.get("/api/v1/audience-categories")
        
        assert response.status_code == 401

    def test_get_audience_category_success(self, client, user_token, admin_token, sample_audience_category_data):
        """Test successful audience category retrieval."""
        # Create audience category first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=admin_headers)
        created_category = create_response.json()
        
        # Get the audience category
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/audience-categories/{created_category['id']}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_category["id"]
        assert data["name"] == sample_audience_category_data["name"]

    def test_get_audience_category_not_found(self, client, user_token):
        """Test audience category retrieval with invalid ID."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/audience-categories/{fake_id}", headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_audience_category_requires_auth(self, client):
        """Test audience category retrieval requires authentication."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/audience-categories/{fake_id}")
        
        assert response.status_code == 401

    def test_update_audience_category_success(self, client, admin_token, sample_audience_category_data, sample_audience_category_update_data):
        """Test successful audience category update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create audience category first
        create_response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=headers)
        created_category = create_response.json()
        
        # Update the audience category
        response = client.put(f"/api/v1/audience-categories/{created_category['id']}", json=sample_audience_category_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_category["id"]
        assert data["name"] == sample_audience_category_update_data["name"]

    def test_update_audience_category_not_found(self, client, admin_token, sample_audience_category_update_data):
        """Test audience category update with invalid ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/audience-categories/{fake_id}", json=sample_audience_category_update_data, headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_update_audience_category_duplicate_name(self, client, admin_token, sample_audience_category_data):
        """Test audience category update with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first audience category
        create_response1 = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=headers)
        
        # Create second audience category
        second_data = {"name": "Teen"}
        create_response2 = client.post("/api/v1/audience-categories", json=second_data, headers=headers)
        category2 = create_response2.json()
        
        # Try to update second to have same name as first
        response = client.put(f"/api/v1/audience-categories/{category2['id']}", json=sample_audience_category_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_update_audience_category_requires_admin(self, client, user_token, admin_token, sample_audience_category_data, sample_audience_category_update_data):
        """Test audience category update requires admin access."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create audience category as admin
        create_response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=admin_headers)
        created_category = create_response.json()
        
        # Try to update as user
        response = client.put(f"/api/v1/audience-categories/{created_category['id']}", json=sample_audience_category_update_data, headers=user_headers)
        
        assert response.status_code == 403

    def test_update_audience_category_requires_auth(self, client, sample_audience_category_update_data):
        """Test audience category update requires authentication."""
        fake_id = str(uuid.uuid4())
        response = client.put(f"/api/v1/audience-categories/{fake_id}", json=sample_audience_category_update_data)
        
        assert response.status_code == 401

    def test_delete_audience_category_success(self, client, admin_token, sample_audience_category_data):
        """Test successful audience category deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create audience category first
        create_response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=headers)
        created_category = create_response.json()
        
        # Delete the audience category
        response = client.delete(f"/api/v1/audience-categories/{created_category['id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_category["id"]
        
        # Verify it's deleted
        get_response = client.get(f"/api/v1/audience-categories/{created_category['id']}", headers=headers)
        assert get_response.status_code == 404

    def test_delete_audience_category_not_found(self, client, admin_token):
        """Test audience category deletion with invalid ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/audience-categories/{fake_id}", headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_delete_audience_category_requires_admin(self, client, user_token, admin_token, sample_audience_category_data):
        """Test audience category deletion requires admin access."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create audience category as admin
        create_response = client.post("/api/v1/audience-categories", json=sample_audience_category_data, headers=admin_headers)
        created_category = create_response.json()
        
        # Try to delete as user
        response = client.delete(f"/api/v1/audience-categories/{created_category['id']}", headers=user_headers)
        
        assert response.status_code == 403

    def test_delete_audience_category_requires_auth(self, client):
        """Test audience category deletion requires authentication."""
        fake_id = str(uuid.uuid4())
        response = client.delete(f"/api/v1/audience-categories/{fake_id}")
        
        assert response.status_code == 401

    def test_audience_categories_pagination(self, client, admin_token, user_token):
        """Test audience categories list pagination."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create multiple audience categories
        for i in range(5):
            category_data = {"name": f"Category {i}"}
            client.post("/api/v1/audience-categories", json=category_data, headers=admin_headers)
        
        # Test pagination
        response = client.get("/api/v1/audience-categories?skip=0&limit=2", headers=user_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        
        response = client.get("/api/v1/audience-categories?skip=2&limit=3", headers=user_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3