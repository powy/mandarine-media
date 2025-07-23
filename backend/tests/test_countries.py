import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_country_data():
    """Sample country data for testing."""
    return {
        "name": "South Korea"
    }


@pytest.fixture
def sample_country_update_data():
    """Sample country update data for testing."""
    return {
        "name": "Republic of Korea"
    }


class TestCountriesCRUD:
    """Test countries CRUD operations."""
    
    def test_create_country_success(self, client, admin_token, sample_country_data):
        """Test successful country creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_country_data["name"]
        assert "id" in data
        assert "creation_date_utc" in data

    def test_list_countries_success(self, client, user_token):
        """Test successful retrieval of countries list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/countries", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_country_success(self, client, user_token, admin_token, sample_country_data):
        """Test successful country retrieval."""
        # Create country first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/countries", json=sample_country_data, headers=admin_headers)
        country_id = create_response.json()["id"]
        
        # Get country
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/countries/{country_id}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == country_id
        assert data["name"] == sample_country_data["name"]

    def test_update_country_success(self, client, admin_token, sample_country_data, sample_country_update_data):
        """Test successful country update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country first
        create_response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        country_id = create_response.json()["id"]
        
        # Update country
        response = client.put(f"/api/v1/countries/{country_id}", json=sample_country_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_country_update_data["name"]

    def test_delete_country_success(self, client, admin_token, sample_country_data):
        """Test successful country deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country first
        create_response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        country_id = create_response.json()["id"]
        
        # Delete country
        response = client.delete(f"/api/v1/countries/{country_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify country is deleted
        get_response = client.get(f"/api/v1/countries/{country_id}", headers=headers)
        assert get_response.status_code == 404

    def test_create_country_duplicate_name(self, client, admin_token, sample_country_data):
        """Test country creation with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first country
        response1 = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        assert response1.status_code == 200
        
        # Try to create second country with same name
        response2 = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]

    def test_create_country_regular_user_forbidden(self, client, user_token, sample_country_data):
        """Test regular user cannot create countries."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        
        assert response.status_code == 403

    def test_operations_unauthorized(self, client, sample_country_data):
        """Test country operations without authentication."""
        fake_id = str(uuid.uuid4())
        
        # List
        response1 = client.get("/api/v1/countries")
        assert response1.status_code == 401
        
        # Create
        response2 = client.post("/api/v1/countries", json=sample_country_data)
        assert response2.status_code == 401
        
        # Get
        response3 = client.get(f"/api/v1/countries/{fake_id}")
        assert response3.status_code == 401
        
        # Update
        response4 = client.put(f"/api/v1/countries/{fake_id}", json=sample_country_data)
        assert response4.status_code == 401
        
        # Delete
        response5 = client.delete(f"/api/v1/countries/{fake_id}")
        assert response5.status_code == 401