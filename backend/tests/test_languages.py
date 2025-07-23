import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_language_data():
    """Sample language data for testing."""
    return {
        "name": "Korean",
        "sigle": "ko"
    }


@pytest.fixture
def sample_language_update_data():
    """Sample language update data for testing."""
    return {
        "name": "Korean Updated",
        "sigle": "kr"
    }


class TestLanguagesList:
    """Test languages list endpoint."""
    
    def test_list_languages_success(self, client, user_token):
        """Test successful retrieval of languages list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/languages", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_languages_with_pagination(self, client, user_token):
        """Test languages list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/languages?skip=0&limit=10", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_languages_unauthorized(self, client):
        """Test languages list without authentication."""
        response = client.get("/api/v1/languages")
        
        assert response.status_code == 401


class TestLanguagesCreate:
    """Test languages create endpoint."""
    
    def test_create_language_success(self, client, admin_token, sample_language_data):
        """Test successful language creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_language_data["name"]
        assert data["sigle"] == sample_language_data["sigle"]
        assert "id" in data
        assert "creation_date_utc" in data

    def test_create_language_duplicate_sigle(self, client, admin_token, sample_language_data):
        """Test language creation with duplicate sigle fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first language
        response1 = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        assert response1.status_code == 200
        
        # Try to create second language with same sigle
        duplicate_data = {"name": "Korean Duplicate", "sigle": sample_language_data["sigle"]}
        response2 = client.post("/api/v1/languages", json=duplicate_data, headers=headers)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]

    def test_create_language_missing_required_fields(self, client, admin_token):
        """Test language creation without required fields fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Missing name
        invalid_data1 = {"sigle": "ko"}
        response1 = client.post("/api/v1/languages", json=invalid_data1, headers=headers)
        assert response1.status_code == 422
        
        # Missing sigle
        invalid_data2 = {"name": "Korean"}
        response2 = client.post("/api/v1/languages", json=invalid_data2, headers=headers)
        assert response2.status_code == 422

    def test_create_language_invalid_sigle_format(self, client, admin_token):
        """Test language creation with invalid sigle format fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Too long sigle
        invalid_data1 = {"name": "Korean", "sigle": "kor"}
        response1 = client.post("/api/v1/languages", json=invalid_data1, headers=headers)
        assert response1.status_code == 422
        
        # Empty sigle
        invalid_data2 = {"name": "Korean", "sigle": ""}
        response2 = client.post("/api/v1/languages", json=invalid_data2, headers=headers)
        assert response2.status_code == 422

    def test_create_language_regular_user_forbidden(self, client, user_token, sample_language_data):
        """Test regular user cannot create languages."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        
        assert response.status_code == 403

    def test_create_language_unauthorized(self, client, sample_language_data):
        """Test language creation without authentication."""
        response = client.post("/api/v1/languages", json=sample_language_data)
        
        assert response.status_code == 401


class TestLanguagesDetail:
    """Test languages detail endpoint."""
    
    def test_get_language_success(self, client, user_token, admin_token, sample_language_data):
        """Test successful language retrieval."""
        # Create language first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=admin_headers)
        language_id = create_response.json()["id"]
        
        # Get language
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/languages/{language_id}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == language_id
        assert data["name"] == sample_language_data["name"]
        assert data["sigle"] == sample_language_data["sigle"]

    def test_get_language_not_found(self, client, user_token):
        """Test language retrieval with non-existent ID."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/languages/{fake_id}", headers=headers)
        
        assert response.status_code == 404

    def test_get_language_unauthorized(self, client):
        """Test language retrieval without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/languages/{fake_id}")
        
        assert response.status_code == 401


class TestLanguagesUpdate:
    """Test languages update endpoint."""
    
    def test_update_language_success(self, client, admin_token, sample_language_data, sample_language_update_data):
        """Test successful language update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language first
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        language_id = create_response.json()["id"]
        
        # Update language
        response = client.put(f"/api/v1/languages/{language_id}", json=sample_language_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_language_update_data["name"]
        assert data["sigle"] == sample_language_update_data["sigle"]

    def test_update_language_partial(self, client, admin_token, sample_language_data):
        """Test partial language update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language first
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        language_id = create_response.json()["id"]
        
        # Update only name
        update_data = {"name": "Korean Updated"}
        response = client.put(f"/api/v1/languages/{language_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["sigle"] == sample_language_data["sigle"]

    def test_update_language_duplicate_sigle(self, client, admin_token, sample_language_data):
        """Test language update with duplicate sigle fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two languages
        create_response1 = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        language_id1 = create_response1.json()["id"]
        
        second_language_data = {"name": "English", "sigle": "en"}
        create_response2 = client.post("/api/v1/languages", json=second_language_data, headers=headers)
        language_id2 = create_response2.json()["id"]
        
        # Try to update second language with first language's sigle
        update_data = {"sigle": sample_language_data["sigle"]}
        response = client.put(f"/api/v1/languages/{language_id2}", json=update_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_update_language_not_found(self, client, admin_token, sample_language_update_data):
        """Test language update with non-existent ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/languages/{fake_id}", json=sample_language_update_data, headers=headers)
        
        assert response.status_code == 404

    def test_update_language_regular_user_forbidden(self, client, user_token, admin_token, sample_language_data, sample_language_update_data):
        """Test regular user cannot update languages."""
        # Create language with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=admin_headers)
        language_id = create_response.json()["id"]
        
        # Try to update with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.put(f"/api/v1/languages/{language_id}", json=sample_language_update_data, headers=user_headers)
        
        assert response.status_code == 403

    def test_update_language_unauthorized(self, client, sample_language_update_data):
        """Test language update without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/languages/{fake_id}", json=sample_language_update_data)
        
        assert response.status_code == 401


class TestLanguagesDelete:
    """Test languages delete endpoint."""
    
    def test_delete_language_success(self, client, admin_token, sample_language_data):
        """Test successful language deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language first
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        language_id = create_response.json()["id"]
        
        # Delete language
        response = client.delete(f"/api/v1/languages/{language_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify language is deleted
        get_response = client.get(f"/api/v1/languages/{language_id}", headers=headers)
        assert get_response.status_code == 404

    def test_delete_language_not_found(self, client, admin_token):
        """Test language deletion with non-existent ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/languages/{fake_id}", headers=headers)
        
        assert response.status_code == 404

    def test_delete_language_regular_user_forbidden(self, client, user_token, admin_token, sample_language_data):
        """Test regular user cannot delete languages."""
        # Create language with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=admin_headers)
        language_id = create_response.json()["id"]
        
        # Try to delete with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.delete(f"/api/v1/languages/{language_id}", headers=user_headers)
        
        assert response.status_code == 403

    def test_delete_language_unauthorized(self, client):
        """Test language deletion without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/languages/{fake_id}")
        
        assert response.status_code == 401