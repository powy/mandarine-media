import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_program_data():
    """Sample program data for testing."""
    return {
        "program_name": "Test Program",
        "general_media_description": "This is a test program description"
    }


@pytest.fixture
def sample_program_update_data():
    """Sample program update data for testing."""
    return {
        "program_name": "Updated Test Program",
        "general_media_description": "This is an updated test program description"
    }


class TestProgramsList:
    """Test programs list endpoint."""
    
    def test_list_programs_success(self, client, user_token):
        """Test successful retrieval of programs list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/programs", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_programs_with_pagination(self, client, user_token):
        """Test programs list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/programs?skip=0&limit=10", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_programs_unauthorized(self, client):
        """Test programs list without authentication."""
        response = client.get("/api/v1/programs")
        
        assert response.status_code == 401


class TestProgramsCreate:
    """Test programs create endpoint."""
    
    def test_create_program_success(self, client, admin_token, sample_program_data):
        """Test successful program creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["program_name"] == sample_program_data["program_name"]
        assert data["general_media_description"] == sample_program_data["general_media_description"]
        assert "id" in data
        assert "creation_date_utc" in data

    def test_create_program_minimal_data(self, client, admin_token):
        """Test program creation with minimal required data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        minimal_data = {"program_name": "Minimal Program"}
        
        response = client.post("/api/v1/programs", json=minimal_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["program_name"] == minimal_data["program_name"]
        assert data["general_media_description"] is None

    def test_create_program_duplicate_name(self, client, admin_token, sample_program_data):
        """Test program creation with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first program
        response1 = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        assert response1.status_code == 200
        
        # Try to create second program with same name
        response2 = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]

    def test_create_program_missing_required_field(self, client, admin_token):
        """Test program creation without required program_name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        invalid_data = {"general_media_description": "Description without name"}
        
        response = client.post("/api/v1/programs", json=invalid_data, headers=headers)
        
        assert response.status_code == 422

    def test_create_program_regular_user_forbidden(self, client, user_token, sample_program_data):
        """Test regular user cannot create programs."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        
        assert response.status_code == 403

    def test_create_program_unauthorized(self, client, sample_program_data):
        """Test program creation without authentication."""
        response = client.post("/api/v1/programs", json=sample_program_data)
        
        assert response.status_code == 401


class TestProgramsDetail:
    """Test programs detail endpoint."""
    
    def test_get_program_success(self, client, user_token, admin_token, sample_program_data):
        """Test successful program retrieval."""
        # Create program first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=admin_headers)
        program_id = create_response.json()["id"]
        
        # Get program
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/programs/{program_id}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == program_id
        assert data["program_name"] == sample_program_data["program_name"]

    def test_get_program_not_found(self, client, user_token):
        """Test program retrieval with non-existent ID."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/programs/{fake_id}", headers=headers)
        
        assert response.status_code == 404

    def test_get_program_unauthorized(self, client):
        """Test program retrieval without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/programs/{fake_id}")
        
        assert response.status_code == 401


class TestProgramsUpdate:
    """Test programs update endpoint."""
    
    def test_update_program_success(self, client, admin_token, sample_program_data, sample_program_update_data):
        """Test successful program update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program first
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id = create_response.json()["id"]
        
        # Update program
        response = client.put(f"/api/v1/programs/{program_id}", json=sample_program_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["program_name"] == sample_program_update_data["program_name"]
        assert data["general_media_description"] == sample_program_update_data["general_media_description"]

    def test_update_program_partial(self, client, admin_token, sample_program_data):
        """Test partial program update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program first
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id = create_response.json()["id"]
        
        # Update only name
        update_data = {"program_name": "Partially Updated Program"}
        response = client.put(f"/api/v1/programs/{program_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["program_name"] == update_data["program_name"]
        assert data["general_media_description"] == sample_program_data["general_media_description"]

    def test_update_program_duplicate_name(self, client, admin_token, sample_program_data):
        """Test program update with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two programs
        create_response1 = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id1 = create_response1.json()["id"]
        
        second_program_data = {"program_name": "Second Program"}
        create_response2 = client.post("/api/v1/programs", json=second_program_data, headers=headers)
        program_id2 = create_response2.json()["id"]
        
        # Try to update second program with first program's name
        update_data = {"program_name": sample_program_data["program_name"]}
        response = client.put(f"/api/v1/programs/{program_id2}", json=update_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_update_program_not_found(self, client, admin_token, sample_program_update_data):
        """Test program update with non-existent ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/programs/{fake_id}", json=sample_program_update_data, headers=headers)
        
        assert response.status_code == 404

    def test_update_program_regular_user_forbidden(self, client, user_token, admin_token, sample_program_data, sample_program_update_data):
        """Test regular user cannot update programs."""
        # Create program with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=admin_headers)
        program_id = create_response.json()["id"]
        
        # Try to update with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.put(f"/api/v1/programs/{program_id}", json=sample_program_update_data, headers=user_headers)
        
        assert response.status_code == 403

    def test_update_program_unauthorized(self, client, sample_program_update_data):
        """Test program update without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/programs/{fake_id}", json=sample_program_update_data)
        
        assert response.status_code == 401


class TestProgramsDelete:
    """Test programs delete endpoint."""
    
    def test_delete_program_success(self, client, admin_token, sample_program_data):
        """Test successful program deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program first
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id = create_response.json()["id"]
        
        # Delete program
        response = client.delete(f"/api/v1/programs/{program_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify program is deleted
        get_response = client.get(f"/api/v1/programs/{program_id}", headers=headers)
        assert get_response.status_code == 404

    def test_delete_program_not_found(self, client, admin_token):
        """Test program deletion with non-existent ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/programs/{fake_id}", headers=headers)
        
        assert response.status_code == 404

    def test_delete_program_regular_user_forbidden(self, client, user_token, admin_token, sample_program_data):
        """Test regular user cannot delete programs."""
        # Create program with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=admin_headers)
        program_id = create_response.json()["id"]
        
        # Try to delete with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.delete(f"/api/v1/programs/{program_id}", headers=user_headers)
        
        assert response.status_code == 403

    def test_delete_program_unauthorized(self, client):
        """Test program deletion without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/programs/{fake_id}")
        
        assert response.status_code == 401