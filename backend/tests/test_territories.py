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
def sample_territory_data():
    """Sample territory data for testing."""
    return {
        "name": "Seoul Region"
    }


@pytest.fixture
def sample_territory_update_data():
    """Sample territory update data for testing."""
    return {
        "name": "Seoul Metropolitan Area"
    }


@pytest.fixture
def created_country(client, admin_token, sample_country_data):
    """Create a country for testing territories."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
    return response.json()


class TestTerritoriesCRUD:
    """Test territories CRUD operations."""
    
    def test_create_territory_success(self, client, admin_token, sample_territory_data):
        """Test successful territory creation without country."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/territories", json=sample_territory_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_territory_data["name"]
        assert data["country_id"] is None
        assert "id" in data
        assert "creation_date_utc" in data

    def test_create_territory_with_country(self, client, admin_token, created_country, sample_territory_data):
        """Test successful territory creation with country."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        territory_data = {**sample_territory_data, "country_id": created_country["id"]}
        
        response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_territory_data["name"]
        assert data["country_id"] == created_country["id"]

    def test_create_territory_invalid_country(self, client, admin_token, sample_territory_data):
        """Test territory creation with non-existent country fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_country_id = str(uuid.uuid4())
        territory_data = {**sample_territory_data, "country_id": fake_country_id}
        
        response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_list_territories_success(self, client, user_token):
        """Test successful retrieval of territories list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/territories", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_territories_by_country(self, client, user_token, created_country):
        """Test territories list filtered by country."""
        headers = {"Authorization": f"Bearer {user_token}"}
        country_id = created_country["id"]
        
        response = client.get(f"/api/v1/territories?country_id={country_id}", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_territory_success(self, client, user_token, admin_token, sample_territory_data):
        """Test successful territory retrieval."""
        # Create territory first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/territories", json=sample_territory_data, headers=admin_headers)
        territory_id = create_response.json()["id"]
        
        # Get territory
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/territories/{territory_id}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == territory_id
        assert data["name"] == sample_territory_data["name"]

    def test_update_territory_success(self, client, admin_token, sample_territory_data, sample_territory_update_data):
        """Test successful territory update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory first
        create_response = client.post("/api/v1/territories", json=sample_territory_data, headers=headers)
        territory_id = create_response.json()["id"]
        
        # Update territory
        response = client.put(f"/api/v1/territories/{territory_id}", json=sample_territory_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_territory_update_data["name"]

    def test_update_territory_add_country(self, client, admin_token, created_country, sample_territory_data):
        """Test adding country to territory."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory without country
        create_response = client.post("/api/v1/territories", json=sample_territory_data, headers=headers)
        territory_id = create_response.json()["id"]
        
        # Update territory to add country
        update_data = {"country_id": created_country["id"]}
        response = client.put(f"/api/v1/territories/{territory_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["country_id"] == created_country["id"]

    def test_delete_territory_success(self, client, admin_token, sample_territory_data):
        """Test successful territory deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory first
        create_response = client.post("/api/v1/territories", json=sample_territory_data, headers=headers)
        territory_id = create_response.json()["id"]
        
        # Delete territory
        response = client.delete(f"/api/v1/territories/{territory_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify territory is deleted
        get_response = client.get(f"/api/v1/territories/{territory_id}", headers=headers)
        assert get_response.status_code == 404

    def test_create_territory_duplicate_name(self, client, admin_token, sample_territory_data):
        """Test territory creation with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first territory
        response1 = client.post("/api/v1/territories", json=sample_territory_data, headers=headers)
        assert response1.status_code == 200
        
        # Try to create second territory with same name
        response2 = client.post("/api/v1/territories", json=sample_territory_data, headers=headers)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]

    def test_create_territory_regular_user_forbidden(self, client, user_token, sample_territory_data):
        """Test regular user cannot create territories."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/territories", json=sample_territory_data, headers=headers)
        
        assert response.status_code == 403

    def test_operations_unauthorized(self, client, sample_territory_data):
        """Test territory operations without authentication."""
        fake_id = str(uuid.uuid4())
        
        # List
        response1 = client.get("/api/v1/territories")
        assert response1.status_code == 401
        
        # Create
        response2 = client.post("/api/v1/territories", json=sample_territory_data)
        assert response2.status_code == 401
        
        # Get
        response3 = client.get(f"/api/v1/territories/{fake_id}")
        assert response3.status_code == 401
        
        # Update
        response4 = client.put(f"/api/v1/territories/{fake_id}", json=sample_territory_data)
        assert response4.status_code == 401
        
        # Delete
        response5 = client.delete(f"/api/v1/territories/{fake_id}")
        assert response5.status_code == 401