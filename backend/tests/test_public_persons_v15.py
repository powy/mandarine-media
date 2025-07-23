import pytest
import uuid
from uuid import UUID


@pytest.fixture
def sample_public_person_data_v15():
    """Sample public person data for testing v1.5."""
    return {
        "stage_name_roman": "Yu Jae Seok",
        "first_name_hangul": "재석",
        "last_name_hangul": "유",
        "first_name_roman": "Jae Seok",
        "last_name_roman": "Yu",
        "stage_name_hangul": "유재석",
        "profession_list": ["actor", "host", "comedian"]
    }


@pytest.fixture
def sample_public_person_update_data_v15():
    """Sample public person update data for testing v1.5."""
    return {
        "stage_name_roman": "Updated Yu Jae Seok",
        "profession_list": ["host", "producer"]
    }


class TestPublicPersonV15List:
    """Test public persons list endpoint for v1.5."""
    
    def test_list_public_persons_success(self, client, user_token):
        """Test successful retrieval of public persons list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/persons", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)


class TestPublicPersonV15Create:
    """Test public person creation for v1.5."""
    
    def test_create_public_person_success(self, client, admin_token, sample_public_person_data_v15):
        """Test successful creation of public person with all fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data_v15
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == sample_public_person_data_v15["stage_name_roman"]
        assert data["first_name_hangul"] == sample_public_person_data_v15["first_name_hangul"]
        assert data["profession_list"] == sample_public_person_data_v15["profession_list"]
        assert "id" in data
        assert "creation_date_utc" in data
    
    def test_create_public_person_minimal_data(self, client, admin_token):
        """Test creation with only required field."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        minimal_data = {
            "stage_name_roman": "Minimal Person"
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=minimal_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == "Minimal Person"
        assert data["first_name_hangul"] is None
        assert data["profession_list"] is None
    
    def test_create_public_person_empty_stage_name(self, client, admin_token):
        """Test creation fails with empty stage name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = {
            "stage_name_roman": ""
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=invalid_data
        )
        
        assert response.status_code == 422
    
    def test_create_public_person_whitespace_stage_name(self, client, admin_token):
        """Test creation fails with whitespace-only stage name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = {
            "stage_name_roman": "   "
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=invalid_data
        )
        
        assert response.status_code == 422
    
    def test_create_public_person_missing_stage_name(self, client, admin_token):
        """Test creation fails without required stage name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = {
            "first_name_roman": "John"
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=invalid_data
        )
        
        assert response.status_code == 422
    
    def test_create_public_person_empty_optional_fields(self, client, admin_token):
        """Test creation fails with empty optional name fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = {
            "stage_name_roman": "Valid Name",
            "first_name_hangul": ""  # Empty optional field should fail
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=invalid_data
        )
        
        assert response.status_code == 422
    
    def test_create_public_person_unauthorized(self, client):
        """Test creation fails without authentication."""
        response = client.post(
            "/api/v1/persons",
            json={"stage_name_roman": "Test Person"}
        )
        
        assert response.status_code in [401, 403]
    
    def test_create_public_person_non_admin(self, client, user_token):
        """Test creation fails with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json={"stage_name_roman": "Test Person"}
        )
        
        assert response.status_code in [401, 403]


class TestPublicPersonV15Update:
    """Test public person updates for v1.5."""
    
    def test_update_public_person_success(self, client, admin_token, sample_public_person_data_v15, sample_public_person_update_data_v15):
        """Test successful update of public person."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data_v15
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Update public person
        response = client.put(
            f"/api/v1/persons/{person_id}",
            headers=headers,
            json=sample_public_person_update_data_v15
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == sample_public_person_update_data_v15["stage_name_roman"]
        assert data["profession_list"] == sample_public_person_update_data_v15["profession_list"]
    
    def test_update_public_person_partial(self, client, admin_token, sample_public_person_data_v15):
        """Test partial update of public person."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data_v15
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Partial update - only profession_list
        partial_update = {
            "profession_list": ["comedian"]
        }
        
        response = client.put(
            f"/api/v1/persons/{person_id}",
            headers=headers,
            json=partial_update
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["profession_list"] == ["comedian"]
        assert data["stage_name_roman"] == sample_public_person_data_v15["stage_name_roman"]  # Should remain unchanged
    
    def test_update_public_person_empty_stage_name(self, client, admin_token, sample_public_person_data_v15):
        """Test update fails with empty stage name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create public person
        create_response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=sample_public_person_data_v15
        )
        assert create_response.status_code == 200
        person_id = create_response.json()["id"]
        
        # Try to update with empty stage name
        invalid_update = {
            "stage_name_roman": ""
        }
        
        response = client.put(
            f"/api/v1/persons/{person_id}",
            headers=headers,
            json=invalid_update
        )
        
        assert response.status_code == 422


class TestPublicPersonV15Search:
    """Test public person search for v1.5."""
    
    def test_search_by_name_success(self, client, user_token, admin_token, sample_public_person_data_v15):
        """Test successful search by name."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a person to search for
        create_response = client.post(
            "/api/v1/persons",
            headers=admin_headers,
            json=sample_public_person_data_v15
        )
        assert create_response.status_code == 200
        
        # Search by name
        response = client.get(
            "/api/v1/persons/search/by-name?name=Jae",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPublicPersonV15Profession:
    """Test public person profession filtering for v1.5."""
    
    def test_get_by_profession_success(self, client, user_token, admin_token, sample_public_person_data_v15):
        """Test successful filtering by profession."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a person with specific profession
        create_response = client.post(
            "/api/v1/persons",
            headers=admin_headers,
            json=sample_public_person_data_v15
        )
        assert create_response.status_code == 200
        
        # Filter by profession
        response = client.get(
            "/api/v1/persons/profession/actor",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPublicPersonV15EdgeCases:
    """Test edge cases for v1.5."""
    
    def test_create_with_unicode_names(self, client, admin_token):
        """Test creation with Unicode characters in names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        unicode_data = {
            "stage_name_roman": "유재석",  # Korean in Roman field
            "first_name_hangul": "재석",
            "last_name_hangul": "유",
            "stage_name_hangul": "유재석"
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=unicode_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == "유재석"
        assert data["first_name_hangul"] == "재석"
    
    def test_create_with_special_characters(self, client, admin_token):
        """Test creation with special characters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_data = {
            "stage_name_roman": "Yu Jae-Seok (MC)",
            "first_name_roman": "Jae-Seok",
            "profession_list": ["host", "comedian"]
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=special_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == "Yu Jae-Seok (MC)"
    
    def test_create_with_very_long_profession_list(self, client, admin_token):
        """Test creation with very long profession list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        long_profession_data = {
            "stage_name_roman": "Multi-talented Person",
            "profession_list": [
                "actor", "singer", "dancer", "comedian", "host", "producer",
                "director", "writer", "musician", "artist", "model", "entertainer"
            ]
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=long_profession_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["profession_list"]) == 12
    
    def test_name_trimming(self, client, admin_token):
        """Test that names are properly trimmed."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        trimming_data = {
            "stage_name_roman": "  Trimmed Name  ",
            "first_name_hangul": "  재석  ",
            "last_name_hangul": "  유  "
        }
        
        response = client.post(
            "/api/v1/persons",
            headers=headers,
            json=trimming_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage_name_roman"] == "Trimmed Name"
        assert data["first_name_hangul"] == "재석"
        assert data["last_name_hangul"] == "유"