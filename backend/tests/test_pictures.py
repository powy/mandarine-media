import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_picture_data():
    """Sample picture data for testing."""
    return {
        "photo_url": "https://example.com/test-image.jpg",
        "file_name": "test-image.jpg",
        "file_size_bytes": 1024000,
        "width": 1920,
        "height": 1080,
        "alt_text": "Test image description"
    }


@pytest.fixture
def sample_picture_update_data():
    """Sample picture update data for testing."""
    return {
        "photo_url": "https://example.com/updated-image.jpg",
        "file_name": "updated-image.jpg",
        "alt_text": "Updated image description"
    }


@pytest.fixture
def minimal_picture_data():
    """Minimal picture data for testing."""
    return {
        "photo_url": "https://example.com/minimal.jpg"
    }


class TestPicturesCRUD:
    """Test pictures CRUD operations."""
    
    def test_create_picture_success(self, client, admin_token, sample_picture_data):
        """Test successful picture creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["photo_url"] == sample_picture_data["photo_url"]
        assert data["file_name"] == sample_picture_data["file_name"]
        assert data["file_size_bytes"] == sample_picture_data["file_size_bytes"]
        assert data["width"] == sample_picture_data["width"]
        assert data["height"] == sample_picture_data["height"]
        assert data["alt_text"] == sample_picture_data["alt_text"]
        assert "id" in data
        assert "creation_date_utc" in data

    def test_create_picture_minimal_data(self, client, admin_token, minimal_picture_data):
        """Test picture creation with minimal required data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/pictures", json=minimal_picture_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["photo_url"] == minimal_picture_data["photo_url"]
        assert data["file_name"] is None
        assert data["file_size_bytes"] is None
        assert data["width"] is None
        assert data["height"] is None
        assert data["alt_text"] is None

    def test_create_picture_duplicate_url(self, client, admin_token, sample_picture_data):
        """Test picture creation with duplicate URL fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first picture
        response1 = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        assert response1.status_code == 200
        
        # Try to create second picture with same URL
        duplicate_data = {**sample_picture_data, "file_name": "different-name.jpg"}
        response2 = client.post("/api/v1/pictures", json=duplicate_data, headers=headers)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]

    def test_create_picture_missing_url(self, client, admin_token):
        """Test picture creation without required photo_url fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        invalid_data = {"file_name": "test.jpg"}
        
        response = client.post("/api/v1/pictures", json=invalid_data, headers=headers)
        
        assert response.status_code == 422

    def test_list_pictures_success(self, client, user_token):
        """Test successful retrieval of pictures list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/pictures", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_pictures_with_pagination(self, client, user_token):
        """Test pictures list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/pictures?skip=0&limit=10", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_picture_success(self, client, user_token, admin_token, sample_picture_data):
        """Test successful picture retrieval."""
        # Create picture first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=admin_headers)
        picture_id = create_response.json()["id"]
        
        # Get picture
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/pictures/{picture_id}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == picture_id
        assert data["photo_url"] == sample_picture_data["photo_url"]

    def test_get_picture_not_found(self, client, user_token):
        """Test picture retrieval with non-existent ID."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/pictures/{fake_id}", headers=headers)
        
        assert response.status_code == 404

    def test_update_picture_success(self, client, admin_token, sample_picture_data, sample_picture_update_data):
        """Test successful picture update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create picture first
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        picture_id = create_response.json()["id"]
        
        # Update picture
        response = client.put(f"/api/v1/pictures/{picture_id}", json=sample_picture_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["photo_url"] == sample_picture_update_data["photo_url"]
        assert data["file_name"] == sample_picture_update_data["file_name"]
        assert data["alt_text"] == sample_picture_update_data["alt_text"]

    def test_update_picture_partial(self, client, admin_token, sample_picture_data):
        """Test partial picture update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create picture first
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        picture_id = create_response.json()["id"]
        
        # Update only alt_text
        update_data = {"alt_text": "Updated description"}
        response = client.put(f"/api/v1/pictures/{picture_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["alt_text"] == update_data["alt_text"]
        assert data["photo_url"] == sample_picture_data["photo_url"]

    def test_update_picture_duplicate_url(self, client, admin_token, sample_picture_data):
        """Test picture update with duplicate URL fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two pictures
        create_response1 = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        picture_id1 = create_response1.json()["id"]
        
        second_picture_data = {"photo_url": "https://example.com/second.jpg"}
        create_response2 = client.post("/api/v1/pictures", json=second_picture_data, headers=headers)
        picture_id2 = create_response2.json()["id"]
        
        # Try to update second picture with first picture's URL
        update_data = {"photo_url": sample_picture_data["photo_url"]}
        response = client.put(f"/api/v1/pictures/{picture_id2}", json=update_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_delete_picture_success(self, client, admin_token, sample_picture_data):
        """Test successful picture deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create picture first
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        picture_id = create_response.json()["id"]
        
        # Delete picture
        response = client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify picture is deleted
        get_response = client.get(f"/api/v1/pictures/{picture_id}", headers=headers)
        assert get_response.status_code == 404

    def test_create_picture_regular_user_forbidden(self, client, user_token, sample_picture_data):
        """Test regular user cannot create pictures."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        
        assert response.status_code == 403

    def test_update_picture_regular_user_forbidden(self, client, user_token, admin_token, sample_picture_data, sample_picture_update_data):
        """Test regular user cannot update pictures."""
        # Create picture with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=admin_headers)
        picture_id = create_response.json()["id"]
        
        # Try to update with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.put(f"/api/v1/pictures/{picture_id}", json=sample_picture_update_data, headers=user_headers)
        
        assert response.status_code == 403

    def test_delete_picture_regular_user_forbidden(self, client, user_token, admin_token, sample_picture_data):
        """Test regular user cannot delete pictures."""
        # Create picture with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=admin_headers)
        picture_id = create_response.json()["id"]
        
        # Try to delete with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.delete(f"/api/v1/pictures/{picture_id}", headers=user_headers)
        
        assert response.status_code == 403

    def test_operations_unauthorized(self, client, sample_picture_data):
        """Test picture operations without authentication."""
        fake_id = str(uuid.uuid4())
        
        # List
        response1 = client.get("/api/v1/pictures")
        assert response1.status_code == 401
        
        # Create
        response2 = client.post("/api/v1/pictures", json=sample_picture_data)
        assert response2.status_code == 401
        
        # Get
        response3 = client.get(f"/api/v1/pictures/{fake_id}")
        assert response3.status_code == 401
        
        # Update
        response4 = client.put(f"/api/v1/pictures/{fake_id}", json=sample_picture_data)
        assert response4.status_code == 401
        
        # Delete
        response5 = client.delete(f"/api/v1/pictures/{fake_id}")
        assert response5.status_code == 401