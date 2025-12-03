import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_program_data():
    """Sample program data for testing."""
    return {
        "program_name": "Test Program for Seasons",
        "general_media_description_id": None  # Optional UUID field
    }


@pytest.fixture
def sample_season_data():
    """Sample season data for testing."""
    return {
        "season_number": 1
    }


@pytest.fixture
def sample_season_update_data():
    """Sample season update data for testing."""
    return {
        "season_number": 2
    }


@pytest.fixture
def created_program(client, admin_token, sample_program_data):
    """Create a program for testing seasons."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
    return response.json()


class TestSeasonsList:
    """Test seasons list endpoint."""
    
    def test_list_seasons_success(self, client, user_token):
        """Test successful retrieval of seasons list."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/seasons", headers=headers)

        assert response.status_code == 200
        assert "data" in response.json()
        assert "pagination" in response.json()
        assert isinstance(response.json()["data"], list)

    def test_list_seasons_with_pagination(self, client, user_token):
        """Test seasons list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/seasons?skip=0&limit=10", headers=headers)

        assert response.status_code == 200
        assert "data" in response.json()
        assert "pagination" in response.json()
        assert isinstance(response.json()["data"], list)

    def test_list_seasons_by_program(self, client, user_token, created_program):
        """Test seasons list filtered by program."""
        headers = {"Authorization": f"Bearer {user_token}"}
        program_id = created_program["id"]

        response = client.get(f"/api/v1/seasons?program_id={program_id}", headers=headers)

        assert response.status_code == 200
        assert "data" in response.json()
        assert "pagination" in response.json()
        assert isinstance(response.json()["data"], list)

    def test_list_seasons_unauthenticated(self, client):
        """(Test seasons list without authentication (now allowed).)"""
        response = client.get("/api/v1/seasons")

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)


class TestSeasonsCreate:
    """Test seasons create endpoint."""
    
    def test_create_season_success(self, client, admin_token, created_program, sample_season_data):
        """Test successful season creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        
        response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["season_number"] == sample_season_data["season_number"]
        assert data["program_id"] == created_program["id"]
        assert "id" in data
        assert "creation_date_utc" in data

    def test_create_season_invalid_program(self, client, admin_token, sample_season_data):
        """Test season creation with non-existent program fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_program_id = str(uuid.uuid4())
        season_data = {**sample_season_data, "program_id": fake_program_id}
        
        response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_create_season_duplicate_number(self, client, admin_token, created_program, sample_season_data):
        """Test season creation with duplicate season number fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        
        # Create first season
        response1 = client.post("/api/v1/seasons", json=season_data, headers=headers)
        assert response1.status_code == 200
        
        # Try to create second season with same number
        response2 = client.post("/api/v1/seasons", json=season_data, headers=headers)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]

    def test_create_season_missing_required_fields(self, client, admin_token):
        """Test season creation without required fields fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # v1.12: program_id is now optional, so this should succeed
        valid_data1 = {"season_number": 1}
        response1 = client.post("/api/v1/seasons", json=valid_data1, headers=headers)
        assert response1.status_code == 200
        
        # Missing season_number (still required)
        invalid_data2 = {"program_id": str(uuid.uuid4())}
        response2 = client.post("/api/v1/seasons", json=invalid_data2, headers=headers)
        assert response2.status_code == 422

    def test_create_season_regular_user_forbidden(self, client, user_token, created_program, sample_season_data):
        """Test regular user cannot create seasons."""
        headers = {"Authorization": f"Bearer {user_token}"}
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        
        response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        
        assert response.status_code == 403

    def test_create_season_unauthorized(self, client, created_program, sample_season_data):
        """Test season creation without authentication."""
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        
        response = client.post("/api/v1/seasons", json=season_data)
        
        assert response.status_code == 401


class TestSeasonsDetail:
    """Test seasons detail endpoint."""
    
    def test_get_season_success(self, client, user_token, admin_token, created_program, sample_season_data):
        """Test successful season retrieval."""
        # Create season first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        create_response = client.post("/api/v1/seasons", json=season_data, headers=admin_headers)
        season_id = create_response.json()["id"]
        
        # Get season
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/seasons/{season_id}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == season_id
        assert data["season_number"] == sample_season_data["season_number"]
        assert data["program_id"] == created_program["id"]

    def test_get_season_not_found(self, client, user_token):
        """Test season retrieval with non-existent ID."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/seasons/{fake_id}", headers=headers)
        
        assert response.status_code == 404

    def test_get_season_unauthenticated(self, client):
        """Test season retrieval without authentication (now allowed)."""
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/seasons/{fake_id}")
        
        # Should get 404 (not found) instead of 401 (unauthorized)
        assert response.status_code == 404


class TestSeasonsUpdate:
    """Test seasons update endpoint."""
    
    def test_update_season_success(self, client, admin_token, created_program, sample_season_data, sample_season_update_data):
        """Test successful season update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create season first
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        create_response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        season_id = create_response.json()["id"]
        
        # Update season
        response = client.put(f"/api/v1/seasons/{season_id}", json=sample_season_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["season_number"] == sample_season_update_data["season_number"]

    def test_update_season_duplicate_number(self, client, admin_token, created_program, sample_season_data):
        """Test season update with duplicate season number fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two seasons
        season_data1 = {**sample_season_data, "program_id": created_program["id"]}
        create_response1 = client.post("/api/v1/seasons", json=season_data1, headers=headers)
        season_id1 = create_response1.json()["id"]
        
        season_data2 = {"season_number": 2, "program_id": created_program["id"]}
        create_response2 = client.post("/api/v1/seasons", json=season_data2, headers=headers)
        season_id2 = create_response2.json()["id"]
        
        # Try to update second season with first season's number
        update_data = {"season_number": sample_season_data["season_number"]}
        response = client.put(f"/api/v1/seasons/{season_id2}", json=update_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_update_season_not_found(self, client, admin_token, sample_season_update_data):
        """Test season update with non-existent ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/seasons/{fake_id}", json=sample_season_update_data, headers=headers)
        
        assert response.status_code == 404

    def test_update_season_regular_user_forbidden(self, client, user_token, admin_token, created_program, sample_season_data, sample_season_update_data):
        """Test regular user cannot update seasons."""
        # Create season with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        create_response = client.post("/api/v1/seasons", json=season_data, headers=admin_headers)
        season_id = create_response.json()["id"]
        
        # Try to update with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.put(f"/api/v1/seasons/{season_id}", json=sample_season_update_data, headers=user_headers)
        
        assert response.status_code == 403

    def test_update_season_unauthorized(self, client, sample_season_update_data):
        """Test season update without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/seasons/{fake_id}", json=sample_season_update_data)
        
        assert response.status_code == 401


class TestSeasonsDelete:
    """Test seasons delete endpoint."""
    
    def test_delete_season_success(self, client, admin_token, created_program, sample_season_data):
        """Test successful season deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create season first
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        create_response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        season_id = create_response.json()["id"]
        
        # Delete season
        response = client.delete(f"/api/v1/seasons/{season_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify season is deleted
        get_response = client.get(f"/api/v1/seasons/{season_id}", headers=headers)
        assert get_response.status_code == 404

    def test_delete_season_not_found(self, client, admin_token):
        """Test season deletion with non-existent ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/seasons/{fake_id}", headers=headers)
        
        assert response.status_code == 404

    def test_delete_season_regular_user_forbidden(self, client, user_token, admin_token, created_program, sample_season_data):
        """Test regular user cannot delete seasons."""
        # Create season with admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        season_data = {**sample_season_data, "program_id": created_program["id"]}
        create_response = client.post("/api/v1/seasons", json=season_data, headers=admin_headers)
        season_id = create_response.json()["id"]
        
        # Try to delete with regular user
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.delete(f"/api/v1/seasons/{season_id}", headers=user_headers)
        
        assert response.status_code == 403

    def test_delete_season_unauthorized(self, client):
        """Test season deletion without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/seasons/{fake_id}")
        
        assert response.status_code == 401