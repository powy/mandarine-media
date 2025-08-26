import pytest
import uuid


@pytest.fixture
def sample_public_person_data():
    """Sample public person data for testing (v1.5)."""
    return {
        "stage_name_roman": "Minji",
        "first_name_hangul": "민지",
        "last_name_hangul": "김",
        "first_name_roman": "Minji",
        "last_name_roman": "Kim",
        "stage_name_hangul": "민지",
        "profession_list": ["singer", "dancer", "model"]
    }


@pytest.fixture
def sample_public_person_update_data():
    """Sample public person update data for testing (v1.5)."""
    return {
        "stage_name_roman": "Updated Minji",
        "profession_list": ["singer", "actress"]
    }


class TestPublicPersonsList:
    """Test public persons list endpoint."""
    
    def test_list_public_persons_success(self, client, user_token):
        """Test successful retrieval of public persons list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/persons", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
        assert "page" in data["pagination"]
        assert "limit" in data["pagination"]
        assert "total" in data["pagination"]
        assert "total_pages" in data["pagination"]
    
    def test_list_public_persons_with_pagination(self, client, user_token):
        """Test public persons list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons",
            headers=headers,
            params={"skip": 10, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 3  # (skip 10 / limit 5) + 1
        assert data["pagination"]["limit"] == 5
    
    def test_list_public_persons_with_search(self, client, user_token):
        """Test public persons list with search parameter."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons",
            headers=headers,
            params={"search": "Kim"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
    
    def test_list_public_persons_with_profession_filter(self, client, user_token):
        """Test public persons list with profession filter."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons",
            headers=headers,
            params={"profession": "Singer"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
    
    def test_list_public_persons_with_agency_filter(self, client, user_token):
        """Test public persons list with agency filter."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons",
            headers=headers,
            params={"agency": "ADOR"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
    
    def test_list_public_persons_active_only_false(self, client, user_token):
        """Test public persons list including inactive persons."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons",
            headers=headers,
            params={"active_only": False}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
    
    def test_list_public_persons_invalid_pagination(self, client, user_token):
        """Test public persons list with invalid pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Test negative skip
        response = client.get(
            "/api/v1/persons",
            headers=headers,
            params={"skip": -1}
        )
        assert response.status_code == 422
        
        # Test limit too high
        response = client.get(
            "/api/v1/persons",
            headers=headers,
            params={"limit": 101}
        )
        assert response.status_code == 422
    
    def test_list_public_persons_unauthenticated(self, client):
        """Test public persons list without authentication (now allowed)."""
        response = client.get("/api/v1/persons")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data


class TestPublicPersonCreate:
    """Test public person creation endpoint."""
    
    def test_create_public_person_success(self, client, admin_token, sample_public_person_data):
        """Test successful public person creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name_hangul"] == sample_public_person_data["first_name_hangul"]
        assert data["last_name_hangul"] == sample_public_person_data["last_name_hangul"]
        assert data["stage_name_roman"] == sample_public_person_data["stage_name_roman"]
        assert data["profession_list"] == sample_public_person_data["profession_list"]
        assert "id" in data
        assert "creation_date_utc" in data
    
    def test_create_public_person_minimal_data(self, client, admin_token):
        """Test creation with minimal required data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        minimal_data = {
            "first_name_hangul": "테스트",
            "last_name_hangul": "김",
            "first_name_roman": "Test",
            "last_name_roman": "Kim",
            "stage_name_hangul": "테스트",
            "stage_name_roman": "Test",
            "profession_list": ["Actor"]
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=minimal_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name_roman"] == "Test"
        assert data["profession_list"] == ["Actor"]
    
    def test_create_public_person_invalid_data(self, client, admin_token):
        """Test creation with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Missing required fields
        invalid_data = {
            "first_name_roman": "Test"
            # Missing many required fields
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_public_person_invalid_stage_name(self, client, admin_token, sample_public_person_data):
        """Test creation with invalid stage name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = sample_public_person_data.copy()
        invalid_data["stage_name_roman"] = ""  # Empty required field
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_public_person_invalid_profession_list(self, client, admin_token, sample_public_person_data):
        """Test creation with invalid profession list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = sample_public_person_data.copy()
        invalid_data["profession_list"] = "not_a_list"  # Should be a list
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_public_person_unauthorized(self, client, sample_public_person_data):
        """Test creation without authentication."""
        response = client.post(
            "/api/v1/persons",
            json=sample_public_person_data
        )
        assert response.status_code == 401
    
    def test_create_public_person_non_admin(self, client, user_token, sample_public_person_data):
        """Test creation with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data
        )
        assert response.status_code == 403


class TestPublicPersonRead:
    """Test public person read endpoint."""
    
    def test_read_public_person_success(self, client, user_token, admin_token, sample_public_person_data):
        """Test successful public person retrieval."""
        # First create a public person
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post(
            "/api/v1/persons",
            headers=admin_headers,
            json=sample_public_person_data
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Then read it
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(
            f"/api/v1/persons/{person_id}",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == person_id
        assert data["first_name_roman"] == sample_public_person_data["first_name_roman"]
        assert data["stage_name_hangul"] == sample_public_person_data["stage_name_hangul"]
    
    def test_read_public_person_not_found(self, client, user_token):
        """Test reading non-existent public person."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/persons/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_read_public_person_invalid_uuid(self, client, user_token):
        """Test reading with invalid UUID format."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_read_public_person_unauthenticated(self, client):
        """Test reading without authentication (now allowed)."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/persons/{fake_id}")
        # Should get 404 (not found) instead of 401 (unauthorized)
        assert response.status_code == 404


class TestPublicPersonUpdate:
    """Test public person update endpoint."""
    
    def test_update_public_person_success(self, client, admin_token, sample_public_person_data, sample_public_person_update_data):
        """Test successful public person update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person first
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Update it
        response = client.put(
            f"/api/v1/persons/{person_id}",
            headers=headers,
            json=sample_public_person_update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == sample_public_person_update_data["stage_name_roman"]
        assert data["profession_list"] == sample_public_person_update_data["profession_list"]
    
    def test_update_public_person_partial_update(self, client, admin_token, sample_public_person_data):
        """Test partial update of public person."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person first
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        original_name = create_response.json()["stage_name_roman"]
        
        # Update only one field
        partial_update = {"first_name_hangul": "새로운이름"}
        response = client.put(
            f"/api/v1/persons/{person_id}",
            headers=headers,
            json=partial_update
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name_hangul"] == "새로운이름"
        assert data["stage_name_roman"] == original_name  # Should remain unchanged
    
    def test_update_public_person_not_found(self, client, admin_token, sample_public_person_update_data):
        """Test updating non-existent public person."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/persons/{fake_id}",
            headers=headers,
            json=sample_public_person_update_data
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_update_public_person_invalid_data(self, client, admin_token, sample_public_person_data):
        """Test update with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person first
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Try to update with invalid stage name (empty)
        invalid_update = {"stage_name_roman": ""}
        response = client.put(
            f"/api/v1/persons/{person_id}",
            headers=headers,
            json=invalid_update
        )
        
        assert response.status_code == 422
    
    def test_update_public_person_unauthorized(self, client, sample_public_person_update_data):
        """Test update without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/persons/{fake_id}",
            json=sample_public_person_update_data
        )
        assert response.status_code == 401
    
    def test_update_public_person_non_admin(self, client, user_token, sample_public_person_update_data):
        """Test update with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/persons/{fake_id}",
            headers=headers,
            json=sample_public_person_update_data
        )
        assert response.status_code == 403


class TestPublicPersonDelete:
    """Test public person delete endpoint."""
    
    def test_delete_public_person_success(self, client, admin_token, sample_public_person_data):
        """Test successful public person deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person first
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(
            f"/api/v1/persons/{person_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == person_id
        
        # Verify it's deleted by trying to read it
        read_response = client.get(
            f"/api/v1/persons/{person_id}",
            headers=headers
        )
        assert read_response.status_code == 404
    
    def test_delete_public_person_not_found(self, client, admin_token):
        """Test deleting non-existent public person."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(
            f"/api/v1/persons/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_delete_public_person_unauthorized(self, client):
        """Test deletion without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.delete(f"/api/v1/persons/{fake_id}")
        assert response.status_code == 401
    
    def test_delete_public_person_non_admin(self, client, user_token):
        """Test deletion with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(
            f"/api/v1/persons/{fake_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestPublicPersonSearch:
    """Test public person search endpoints."""
    
    def test_search_by_name_success(self, client, user_token):
        """Test successful search by name."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons/search/by-name",
            headers=headers,
            params={"name": "Kim"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_search_by_name_with_pagination(self, client, user_token):
        """Test search by name with pagination."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons/search/by-name",
            headers=headers,
            params={"name": "Kim", "skip": 0, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_search_by_name_missing_parameter(self, client, user_token):
        """Test search by name without name parameter."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons/search/by-name",
            headers=headers
        )
        
        assert response.status_code == 422  # Missing required parameter
    
    def test_search_by_name_unauthorized(self, client):
        """Test search by name without authentication."""
        response = client.get(
            "/api/v1/persons/search/by-name",
            params={"name": "Kim"}
        )
        assert response.status_code == 401


class TestPublicPersonByProfession:
    """Test public person by profession endpoint."""
    
    def test_get_by_profession_success(self, client, user_token):
        """Test successful retrieval by profession."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons/profession/Singer",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_by_profession_with_pagination(self, client, user_token):
        """Test get by profession with pagination."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons/profession/Actor",
            headers=headers,
            params={"skip": 0, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10
    
    def test_get_by_profession_url_encoded(self, client, user_token):
        """Test get by profession with URL-encoded profession name."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/persons/profession/Voice%20Actor",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_by_profession_unauthenticated(self, client):
        """Test get by profession without authentication (now allowed)."""
        response = client.get("/api/v1/persons/profession/Singer")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)




class TestPublicPersonEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_create_public_person_with_empty_optional_fields(self, client, admin_token):
        """Test creating public person with empty optional fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Only required field
        minimal_data = {
            "stage_name_roman": "Test Artist"
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=minimal_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == "Test Artist"
    
    def test_create_public_person_with_multiple_professions(self, client, admin_token, sample_public_person_data):
        """Test creating public person with multiple professions."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        multi_prof_data = sample_public_person_data.copy()
        multi_prof_data["profession_list"] = ["singer", "dancer", "actress", "model", "songwriter"]
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=multi_prof_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["profession_list"]) == 5
        assert "songwriter" in data["profession_list"]
    
    def test_create_public_person_with_long_stage_name(self, client, admin_token, sample_public_person_data):
        """Test creating public person with very long stage name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        long_data = sample_public_person_data.copy()
        long_data["stage_name_roman"] = "A" * 200  # Very long stage name
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=long_data
        )
        
        # Should succeed unless there are database constraints
        assert response.status_code == 200
        data = response.json()
        assert len(data["stage_name_roman"]) == 200
    
    def test_update_public_person_profession_list(self, client, admin_token, sample_public_person_data):
        """Test updating public person profession list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Update profession list
        update_data = {"profession_list": ["actor", "director"]}
        response = client.put(
            f"/api/v1/persons/{person_id}",
            headers=headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert set(data["profession_list"]) == {"actor", "director"}
    
    def test_create_public_person_with_special_characters(self, client, admin_token, sample_public_person_data):
        """Test creating public person with special characters in names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_data = sample_public_person_data.copy()
        special_data["first_name_hangul"] = "민-지"  # Hyphenated name
        special_data["last_name_hangul"] = "김씨"
        special_data["stage_name_roman"] = "Minji (NewJeans)"  # Parentheses
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=special_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name_hangul"] == "민-지"
        assert data["stage_name_roman"] == "Minji (NewJeans)"