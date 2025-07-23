import pytest
import uuid
from fastapi import status
from sqlalchemy.exc import IntegrityError


@pytest.fixture
def sample_territory_data():
    """Sample territory data for testing."""
    return {
        "name": "Seoul Metropolitan Area",
        "country_id": None  # Will be set dynamically in tests
    }


@pytest.fixture
def sample_territory_update_data():
    """Sample territory update data for testing."""
    return {
        "name": "Busan Metropolitan Area"
    }


class TestTerritoriesEdgeCases:
    """Comprehensive edge case testing for territories."""
    
    def test_create_territory_empty_name(self, client, admin_token):
        """Test territory creation with empty name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Empty string
        response1 = client.post("/api/v1/territories", json={"name": ""}, headers=headers)
        assert response1.status_code == 422
        
        # Whitespace only
        response2 = client.post("/api/v1/territories", json={"name": "   "}, headers=headers)
        assert response2.status_code == 422
        
        # None value
        response3 = client.post("/api/v1/territories", json={"name": None}, headers=headers)
        assert response3.status_code == 422

    def test_create_territory_very_long_name(self, client, admin_token):
        """Test territory creation with very long name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Very long name (1000 characters)
        long_name = "A" * 1000
        data = {"name": long_name}
        
        response = client.post("/api/v1/territories", json=data, headers=headers)
        # Should either succeed or fail with validation error
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            territory = response.json()
            assert territory["name"] == long_name
            client.delete(f"/api/v1/territories/{territory['id']}", headers=headers)

    def test_create_territory_with_country_id(self, client, admin_token):
        """Test territory creation with valid country ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test country first
        country_data = {"name": "Test Country for Territory"}
        country_response = client.post("/api/v1/countries", json=country_data, headers=headers)
        assert country_response.status_code == 200
        country_id = country_response.json()["id"]
        
        # Create territory with country_id
        territory_data = {"name": "Test Territory", "country_id": country_id}
        territory_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        assert territory_response.status_code == 200
        territory = territory_response.json()
        assert territory["country_id"] == country_id
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory['id']}", headers=headers)
        client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_create_territory_with_invalid_country_id(self, client, admin_token):
        """Test territory creation with invalid country ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_country_ids = [
            "not-a-uuid",
            "123",
            "abc-def-ghi",
            str(uuid.uuid4()),  # Valid UUID but non-existent country
            "",
            123,
            [],
            {},
            True
        ]
        
        for country_id in invalid_country_ids:
            data = {"name": "Test Territory", "country_id": country_id}
            response = client.post("/api/v1/territories", json=data, headers=headers)
            assert response.status_code in [404, 422]  # Not found or validation error

    def test_create_territory_without_country_id(self, client, admin_token):
        """Test territory creation without country ID (should be allowed)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory without country_id
        territory_data = {"name": "Independent Territory"}
        territory_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        assert territory_response.status_code == 200
        territory = territory_response.json()
        assert territory["country_id"] is None
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory['id']}", headers=headers)

    def test_create_territory_explicit_null_country_id(self, client, admin_token):
        """Test territory creation with explicit null country ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory with explicit null country_id
        territory_data = {"name": "Null Country Territory", "country_id": None}
        territory_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        assert territory_response.status_code == 200
        territory = territory_response.json()
        assert territory["country_id"] is None
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory['id']}", headers=headers)

    def test_create_territory_special_characters(self, client, admin_token):
        """Test territory creation with special characters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_names = [
            "서울특별시",  # Korean
            "北京市",  # Chinese
            "東京都",  # Japanese
            "محافظة القاهرة",  # Arabic
            "Московская область",  # Russian
            "Île-de-France",  # French
            "Cataluña",  # Spanish
            "São Paulo",  # Portuguese
            "Baden-Württemberg",  # German
            "Αττική",  # Greek
            "Territory with émojis 🏙️",
            "Territory with symbols @#$%^&*()",
            "Territory with quotes \"'",
            "Territory with SQL ' OR '1'='1",
            "Territory with newlines\\n\\r",
            "Territory with tabs\\t",
        ]
        
        created_ids = []
        for name in special_names:
            data = {"name": name}
            response = client.post("/api/v1/territories", json=data, headers=headers)
            
            if response.status_code == 200:
                territory = response.json()
                assert territory["name"] == name
                created_ids.append(territory["id"])
        
        # Clean up
        for territory_id in created_ids:
            client.delete(f"/api/v1/territories/{territory_id}", headers=headers)

    def test_create_territory_case_sensitivity(self, client, admin_token):
        """Test case sensitivity of territory names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory with lowercase
        data1 = {"name": "test territory"}
        response1 = client.post("/api/v1/territories", json=data1, headers=headers)
        assert response1.status_code == 200
        territory1_id = response1.json()["id"]
        
        # Try to create with uppercase
        data2 = {"name": "TEST TERRITORY"}
        response2 = client.post("/api/v1/territories", json=data2, headers=headers)
        
        # Should succeed if case sensitive, fail if case insensitive
        if response2.status_code == 200:
            territory2_id = response2.json()["id"]
            client.delete(f"/api/v1/territories/{territory2_id}", headers=headers)
        else:
            assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory1_id}", headers=headers)

    def test_create_territory_duplicate_name(self, client, admin_token):
        """Test creating territories with duplicate names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first territory
        data1 = {"name": "Duplicate Test Territory"}
        response1 = client.post("/api/v1/territories", json=data1, headers=headers)
        assert response1.status_code == 200
        territory1_id = response1.json()["id"]
        
        # Try to create duplicate name
        data2 = {"name": "Duplicate Test Territory"}
        response2 = client.post("/api/v1/territories", json=data2, headers=headers)
        assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory1_id}", headers=headers)

    def test_create_territory_same_name_different_countries(self, client, admin_token):
        """Test creating territories with same name in different countries."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two countries
        country1_data = {"name": "Country 1"}
        country1_response = client.post("/api/v1/countries", json=country1_data, headers=headers)
        country1_id = country1_response.json()["id"]
        
        country2_data = {"name": "Country 2"}
        country2_response = client.post("/api/v1/countries", json=country2_data, headers=headers)
        country2_id = country2_response.json()["id"]
        
        # Create territories with same name in different countries
        territory1_data = {"name": "Same Name Territory", "country_id": country1_id}
        territory1_response = client.post("/api/v1/territories", json=territory1_data, headers=headers)
        assert territory1_response.status_code == 200
        territory1_id = territory1_response.json()["id"]
        
        territory2_data = {"name": "Same Name Territory", "country_id": country2_id}
        territory2_response = client.post("/api/v1/territories", json=territory2_data, headers=headers)
        # Should succeed if territories can have same name in different countries
        # Or fail if global uniqueness is enforced
        assert territory2_response.status_code in [200, 409]
        
        if territory2_response.status_code == 200:
            territory2_id = territory2_response.json()["id"]
            client.delete(f"/api/v1/territories/{territory2_id}", headers=headers)
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory1_id}", headers=headers)
        client.delete(f"/api/v1/countries/{country1_id}", headers=headers)
        client.delete(f"/api/v1/countries/{country2_id}", headers=headers)

    def test_get_territory_invalid_uuid_format(self, client, user_token):
        """Test getting territory with invalid UUID format."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        invalid_uuids = [
            "not-a-uuid",
            "123",
            "abc-def-ghi",
            "12345678-1234-1234-1234-123456789012",  # too long
            "12345678-1234-1234-1234-12345678901",   # too short
            "null",
            "undefined"
        ]
        
        for invalid_uuid in invalid_uuids:
            response = client.get(f"/api/v1/territories/{invalid_uuid}", headers=headers)
            assert response.status_code in [404, 422]

    def test_update_territory_to_duplicate_name(self, client, admin_token):
        """Test updating territory to duplicate name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two territories
        data1 = {"name": "Territory 1"}
        response1 = client.post("/api/v1/territories", json=data1, headers=headers)
        territory1_id = response1.json()["id"]
        
        data2 = {"name": "Territory 2"}
        response2 = client.post("/api/v1/territories", json=data2, headers=headers)
        territory2_id = response2.json()["id"]
        
        # Try to update territory 2 to have same name as territory 1
        update_data = {"name": "Territory 1"}
        response = client.put(f"/api/v1/territories/{territory2_id}", json=update_data, headers=headers)
        assert response.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory1_id}", headers=headers)
        client.delete(f"/api/v1/territories/{territory2_id}", headers=headers)

    def test_update_territory_country_id(self, client, admin_token):
        """Test updating territory country ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two countries
        country1_data = {"name": "Country 1"}
        country1_response = client.post("/api/v1/countries", json=country1_data, headers=headers)
        country1_id = country1_response.json()["id"]
        
        country2_data = {"name": "Country 2"}
        country2_response = client.post("/api/v1/countries", json=country2_data, headers=headers)
        country2_id = country2_response.json()["id"]
        
        # Create territory with first country
        territory_data = {"name": "Test Territory", "country_id": country1_id}
        territory_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        territory_id = territory_response.json()["id"]
        
        # Update territory to second country
        update_data = {"country_id": country2_id}
        response = client.put(f"/api/v1/territories/{territory_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        updated_territory = response.json()
        assert updated_territory["country_id"] == country2_id
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory_id}", headers=headers)
        client.delete(f"/api/v1/countries/{country1_id}", headers=headers)
        client.delete(f"/api/v1/countries/{country2_id}", headers=headers)

    def test_update_territory_country_id_to_null(self, client, admin_token):
        """Test updating territory country ID to null."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a country
        country_data = {"name": "Country for Null Test"}
        country_response = client.post("/api/v1/countries", json=country_data, headers=headers)
        country_id = country_response.json()["id"]
        
        # Create territory with country
        territory_data = {"name": "Test Territory", "country_id": country_id}
        territory_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        territory_id = territory_response.json()["id"]
        
        # Update territory to null country
        update_data = {"country_id": None}
        response = client.put(f"/api/v1/territories/{territory_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        updated_territory = response.json()
        assert updated_territory["country_id"] is None
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory_id}", headers=headers)
        client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_update_territory_invalid_country_id(self, client, admin_token):
        """Test updating territory with invalid country ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory
        territory_data = {"name": "Test Territory"}
        territory_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        territory_id = territory_response.json()["id"]
        
        invalid_country_ids = [
            "not-a-uuid",
            "123",
            "abc-def-ghi",
            str(uuid.uuid4()),  # Valid UUID but non-existent country
            "",
            123,
            [],
            {},
            True
        ]
        
        for country_id in invalid_country_ids:
            update_data = {"country_id": country_id}
            response = client.put(f"/api/v1/territories/{territory_id}", json=update_data, headers=headers)
            assert response.status_code in [404, 422]
        
        # Clean up
        client.delete(f"/api/v1/territories/{territory_id}", headers=headers)

    def test_delete_territory_twice(self, client, admin_token):
        """Test deleting same territory twice."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory
        territory_data = {"name": "Test Territory"}
        territory_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        territory_id = territory_response.json()["id"]
        
        # Delete first time
        response1 = client.delete(f"/api/v1/territories/{territory_id}", headers=headers)
        assert response1.status_code == 200
        
        # Delete second time
        response2 = client.delete(f"/api/v1/territories/{territory_id}", headers=headers)
        assert response2.status_code == 404

    def test_territory_operations_with_malformed_json(self, client, admin_token):
        """Test territory operations with malformed JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data_sets = [
            {"name": 123},     # Number instead of string
            {"name": []},      # Array instead of string
            {"name": {}},      # Object instead of string
            {"name": True},    # Boolean instead of string
            {"name": 3.14},    # Float instead of string
            {"name": "Test", "country_id": "not-uuid"},  # Invalid UUID
            {"name": "Test", "country_id": 123},         # Number instead of string
            {"name": "Test", "country_id": []},          # Array instead of string
            {"name": "Test", "country_id": {}},          # Object instead of string
            {"name": "Test", "country_id": True},        # Boolean instead of string
        ]
        
        for invalid_data in invalid_data_sets:
            response = client.post("/api/v1/territories", json=invalid_data, headers=headers)
            assert response.status_code == 422

    def test_territory_response_format_consistency(self, client, admin_token):
        """Test territory response format consistency across operations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory
        territory_data = {"name": "Test Territory"}
        create_response = client.post("/api/v1/territories", json=territory_data, headers=headers)
        assert create_response.status_code == 200
        created_territory = create_response.json()
        territory_id = created_territory["id"]
        
        # Required fields should be present
        required_fields = ["id", "creation_date_utc", "name"]
        for field in required_fields:
            assert field in created_territory
            assert created_territory[field] is not None
        
        # Get territory
        get_response = client.get(f"/api/v1/territories/{territory_id}", headers=headers)
        assert get_response.status_code == 200
        get_territory = get_response.json()
        
        # Should have same structure
        assert set(created_territory.keys()) == set(get_territory.keys())
        
        # Update territory
        update_data = {"name": "Updated Territory"}
        update_response = client.put(f"/api/v1/territories/{territory_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        updated_territory = update_response.json()
        
        # Should have same structure
        assert set(created_territory.keys()) == set(updated_territory.keys())
        
        # Delete territory
        delete_response = client.delete(f"/api/v1/territories/{territory_id}", headers=headers)
        assert delete_response.status_code == 200
        deleted_territory = delete_response.json()
        
        # Should have same structure
        assert set(created_territory.keys()) == set(deleted_territory.keys())

    def test_territory_pagination_edge_cases(self, client, user_token):
        """Test territory pagination edge cases."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Very large skip value
        response1 = client.get("/api/v1/territories?skip=999999", headers=headers)
        assert response1.status_code == 200
        assert response1.json() == []
        
        # Skip larger than total count
        response2 = client.get("/api/v1/territories?skip=1000000", headers=headers)
        assert response2.status_code == 200
        assert response2.json() == []
        
        # Maximum limit
        response3 = client.get("/api/v1/territories?limit=100", headers=headers)
        assert response3.status_code == 200
        
        # Limit of 1
        response4 = client.get("/api/v1/territories?limit=1", headers=headers)
        assert response4.status_code == 200
        territories = response4.json()
        assert len(territories) <= 1

    def test_territory_operations_with_expired_token(self, client, admin_token):
        """Test territory operations with various token issues."""
        # Invalid token format
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        response1 = client.get("/api/v1/territories", headers=invalid_headers)
        assert response1.status_code == 401
        
        # Missing Bearer prefix
        invalid_headers2 = {"Authorization": admin_token}
        response2 = client.get("/api/v1/territories", headers=invalid_headers2)
        assert response2.status_code in [401, 403]
        
        # Empty token
        invalid_headers3 = {"Authorization": "Bearer "}
        response3 = client.get("/api/v1/territories", headers=invalid_headers3)
        assert response3.status_code in [401, 403]
        
        # No Authorization header
        response4 = client.get("/api/v1/territories")
        assert response4.status_code in [401, 403]

    def test_territory_name_with_leading_trailing_spaces(self, client, admin_token):
        """Test territory name with leading/trailing spaces."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create territory with spaces
        data = {"name": "  Spaced Territory  "}
        response = client.post("/api/v1/territories", json=data, headers=headers)
        
        if response.status_code == 200:
            territory = response.json()
            # Check if spaces are preserved or trimmed
            assert territory["name"] in ["  Spaced Territory  ", "Spaced Territory"]
            client.delete(f"/api/v1/territories/{territory['id']}", headers=headers)

    def test_territory_list_consistency(self, client, admin_token, user_token):
        """Test territory list consistency."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get initial count
        initial_response = client.get("/api/v1/territories", headers=user_headers)
        initial_count = len(initial_response.json())
        
        # Create territory
        data = {"name": "List Consistency Test"}
        create_response = client.post("/api/v1/territories", json=data, headers=admin_headers)
        assert create_response.status_code == 200
        territory_id = create_response.json()["id"]
        
        # List should include new territory
        after_create_response = client.get("/api/v1/territories", headers=user_headers)
        after_create_count = len(after_create_response.json())
        assert after_create_count == initial_count + 1
        
        # Delete territory
        delete_response = client.delete(f"/api/v1/territories/{territory_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # List should return to original count
        after_delete_response = client.get("/api/v1/territories", headers=user_headers)
        after_delete_count = len(after_delete_response.json())
        assert after_delete_count == initial_count