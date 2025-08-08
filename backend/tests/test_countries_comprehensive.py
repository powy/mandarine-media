import pytest
import uuid
from fastapi import status
from sqlalchemy.exc import IntegrityError


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


class TestCountriesEdgeCases:
    """Comprehensive edge case testing for countries."""
    
    def test_create_country_empty_name(self, client, admin_token):
        """Test country creation with empty name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Empty string
        response1 = client.post("/api/v1/countries", json={"name": ""}, headers=headers)
        assert response1.status_code == 422
        
        # Whitespace only
        response2 = client.post("/api/v1/countries", json={"name": "   "}, headers=headers)
        assert response2.status_code == 422
        
        # None value
        response3 = client.post("/api/v1/countries", json={"name": None}, headers=headers)
        assert response3.status_code == 422

    def test_create_country_very_long_name(self, client, admin_token):
        """Test country creation with very long name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Very long name (1000 characters)
        long_name = "A" * 1000
        data = {"name": long_name}
        
        response = client.post("/api/v1/countries", json=data, headers=headers)
        # Should either succeed or fail with validation error
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            country = response.json()
            assert country["name"] == long_name
            client.delete(f"/api/v1/countries/{country['id']}", headers=headers)

    def test_create_country_special_characters(self, client, admin_token):
        """Test country creation with special characters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_names = [
            "대한민국",  # Korean
            "中华人民共和国",  # Chinese
            "日本",  # Japanese
            "الولايات المتحدة الأمريكية",  # Arabic
            "Российская Федерация",  # Russian
            "République française",  # French
            "Reino de España",  # Spanish
            "República Federativa do Brasil",  # Portuguese
            "Bundesrepublik Deutschland",  # German
            "Ελληνική Δημοκρατία",  # Greek
            "Country with émojis 🇰🇷",
            "Country with symbols @#$%^&*()",
            "Country with quotes \"'",
            "Country with SQL ' OR '1'='1",
            "Country with newlines\\n\\r",
            "Country with tabs\\t",
        ]
        
        created_ids = []
        for name in special_names:
            data = {"name": name}
            response = client.post("/api/v1/countries", json=data, headers=headers)
            
            if response.status_code == 200:
                country = response.json()
                assert country["name"] == name
                created_ids.append(country["id"])
        
        # Clean up
        for country_id in created_ids:
            client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_create_country_case_sensitivity(self, client, admin_token):
        """Test case sensitivity of country names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country with lowercase
        data1 = {"name": "test country"}
        response1 = client.post("/api/v1/countries", json=data1, headers=headers)
        assert response1.status_code == 200
        country1_id = response1.json()["id"]
        
        # Try to create with uppercase
        data2 = {"name": "TEST COUNTRY"}
        response2 = client.post("/api/v1/countries", json=data2, headers=headers)
        
        # Should succeed if case sensitive, fail if case insensitive
        if response2.status_code == 200:
            country2_id = response2.json()["id"]
            client.delete(f"/api/v1/countries/{country2_id}", headers=headers)
        else:
            assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/countries/{country1_id}", headers=headers)

    def test_create_country_duplicate_name(self, client, admin_token):
        """Test creating countries with duplicate names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first country
        data1 = {"name": "Duplicate Test Country"}
        response1 = client.post("/api/v1/countries", json=data1, headers=headers)
        assert response1.status_code == 200
        country1_id = response1.json()["id"]
        
        # Try to create duplicate name
        data2 = {"name": "Duplicate Test Country"}
        response2 = client.post("/api/v1/countries", json=data2, headers=headers)
        assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/countries/{country1_id}", headers=headers)

    def test_create_country_similar_names(self, client, admin_token):
        """Test creating countries with similar but different names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        similar_names = [
            "United States",
            "United States of America",
            "USA",
            "US",
            "America",
        ]
        
        created_ids = []
        for name in similar_names:
            data = {"name": name}
            response = client.post("/api/v1/countries", json=data, headers=headers)
            
            if response.status_code == 200:
                country = response.json()
                assert country["name"] == name
                created_ids.append(country["id"])
        
        # Clean up
        for country_id in created_ids:
            client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_get_country_invalid_uuid_format(self, client, user_token):
        """Test getting country with invalid UUID format."""
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
            response = client.get(f"/api/v1/countries/{invalid_uuid}", headers=headers)
            assert response.status_code in [404, 422]

    def test_update_country_to_duplicate_name(self, client, admin_token):
        """Test updating country to duplicate name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two countries
        data1 = {"name": "Country 1"}
        response1 = client.post("/api/v1/countries", json=data1, headers=headers)
        country1_id = response1.json()["id"]
        
        data2 = {"name": "Country 2"}
        response2 = client.post("/api/v1/countries", json=data2, headers=headers)
        country2_id = response2.json()["id"]
        
        # Try to update country 2 to have same name as country 1
        update_data = {"name": "Country 1"}
        response = client.put(f"/api/v1/countries/{country2_id}", json=update_data, headers=headers)
        assert response.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/countries/{country1_id}", headers=headers)
        client.delete(f"/api/v1/countries/{country2_id}", headers=headers)

    def test_update_country_same_name(self, client, admin_token, sample_country_data):
        """Test updating country with same name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country
        create_response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        country_id = create_response.json()["id"]
        
        # Update with same name
        update_data = {"name": sample_country_data["name"]}
        response = client.put(f"/api/v1/countries/{country_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        # Clean up
        client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_update_country_empty_update(self, client, admin_token, sample_country_data):
        """Test updating country with empty update data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country
        create_response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        country_id = create_response.json()["id"]
        original_country = create_response.json()
        
        # Empty update
        response = client.put(f"/api/v1/countries/{country_id}", json={}, headers=headers)
        assert response.status_code == 200
        
        # Should return unchanged country
        updated_country = response.json()
        assert updated_country["name"] == original_country["name"]
        
        # Clean up
        client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_delete_country_twice(self, client, admin_token, sample_country_data):
        """Test deleting same country twice."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country
        create_response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        country_id = create_response.json()["id"]
        
        # Delete first time
        response1 = client.delete(f"/api/v1/countries/{country_id}", headers=headers)
        assert response1.status_code == 200
        
        # Delete second time
        response2 = client.delete(f"/api/v1/countries/{country_id}", headers=headers)
        assert response2.status_code == 404

    def test_country_operations_with_malformed_json(self, client, admin_token):
        """Test country operations with malformed JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data_sets = [
            {"name": 123},     # Number instead of string
            {"name": []},      # Array instead of string
            {"name": {}},      # Object instead of string
            {"name": True},    # Boolean instead of string
            {"name": 3.14},    # Float instead of string
        ]
        
        for invalid_data in invalid_data_sets:
            response = client.post("/api/v1/countries", json=invalid_data, headers=headers)
            assert response.status_code == 422

    def test_country_response_format_consistency(self, client, admin_token, sample_country_data):
        """Test country response format consistency across operations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country
        create_response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
        assert create_response.status_code == 200
        created_country = create_response.json()
        country_id = created_country["id"]
        
        # Required fields should be present
        required_fields = ["id", "creation_date_utc", "name"]
        for field in required_fields:
            assert field in created_country
            assert created_country[field] is not None
        
        # Get country
        get_response = client.get(f"/api/v1/countries/{country_id}", headers=headers)
        assert get_response.status_code == 200
        get_country = get_response.json()
        
        # Should have same structure
        assert set(created_country.keys()) == set(get_country.keys())
        
        # Update country
        update_data = {"name": "Updated Country"}
        update_response = client.put(f"/api/v1/countries/{country_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        updated_country = update_response.json()
        
        # Should have same structure
        assert set(created_country.keys()) == set(updated_country.keys())
        
        # Delete country
        delete_response = client.delete(f"/api/v1/countries/{country_id}", headers=headers)
        assert delete_response.status_code == 200
        deleted_country = delete_response.json()
        
        # Should have same structure
        assert set(created_country.keys()) == set(deleted_country.keys())

    def test_country_pagination_edge_cases(self, client, user_token):
        """Test country pagination edge cases."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Very large skip value
        response1 = client.get("/api/v1/countries?skip=999999", headers=headers)
        assert response1.status_code == 200
        data1 = response1.json()
        assert "data" in data1
        assert "pagination" in data1
        assert data1["data"] == []
        
        # Skip larger than total count
        response2 = client.get("/api/v1/countries?skip=1000000", headers=headers)
        assert response2.status_code == 200
        data2 = response2.json()
        assert "data" in data2
        assert "pagination" in data2
        assert data2["data"] == []
        
        # Maximum limit
        response3 = client.get("/api/v1/countries?limit=100", headers=headers)
        assert response3.status_code == 200
        data3 = response3.json()
        assert "data" in data3
        assert "pagination" in data3
        
        # Limit of 1
        response4 = client.get("/api/v1/countries?limit=1", headers=headers)
        assert response4.status_code == 200
        data4 = response4.json()
        assert "data" in data4
        assert "pagination" in data4
        assert len(data4["data"]) <= 1

    def test_country_operations_with_expired_token(self, client, admin_token):
        """Test country operations with various token issues."""
        # Invalid token format
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        response1 = client.get("/api/v1/countries", headers=invalid_headers)
        assert response1.status_code == 401
        
        # Missing Bearer prefix
        invalid_headers2 = {"Authorization": admin_token}
        response2 = client.get("/api/v1/countries", headers=invalid_headers2)
        assert response2.status_code in [401, 403]
        
        # Empty token
        invalid_headers3 = {"Authorization": "Bearer "}
        response3 = client.get("/api/v1/countries", headers=invalid_headers3)
        assert response3.status_code in [401, 403]
        
        # No Authorization header
        response4 = client.get("/api/v1/countries")
        assert response4.status_code in [401, 403]

    def test_country_name_with_leading_trailing_spaces(self, client, admin_token):
        """Test country name with leading/trailing spaces."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country with spaces
        data = {"name": "  Spaced Country  "}
        response = client.post("/api/v1/countries", json=data, headers=headers)
        
        if response.status_code == 200:
            country = response.json()
            # Check if spaces are preserved or trimmed
            assert country["name"] in ["  Spaced Country  ", "Spaced Country"]
            client.delete(f"/api/v1/countries/{country['id']}", headers=headers)

    def test_concurrent_country_creation(self, client, admin_token):
        """Test concurrent country creation with same name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # This test simulates race condition - both requests might succeed
        # before the duplicate check, but database constraint should prevent it
        data = {"name": "Concurrent Test Country"}
        
        # In real scenario, these would be truly concurrent
        # Here we simulate by creating two requests quickly
        response1 = client.post("/api/v1/countries", json=data, headers=headers)
        response2 = client.post("/api/v1/countries", json=data, headers=headers)
        
        # One should succeed, one should fail
        success_count = sum(1 for r in [response1, response2] if r.status_code == 200)
        error_count = sum(1 for r in [response1, response2] if r.status_code == 409)
        
        assert success_count == 1
        assert error_count == 1
        
        # Clean up successful creation
        for response in [response1, response2]:
            if response.status_code == 200:
                country_id = response.json()["id"]
                client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_country_list_consistency(self, client, admin_token, user_token):
        """Test country list consistency."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get initial count
        initial_response = client.get("/api/v1/countries", headers=user_headers)
        initial_data = initial_response.json()
        assert "data" in initial_data
        assert "pagination" in initial_data
        initial_count = len(initial_data["data"])
        
        # Create country
        data = {"name": "List Consistency Test"}
        create_response = client.post("/api/v1/countries", json=data, headers=admin_headers)
        assert create_response.status_code == 200
        country_id = create_response.json()["id"]
        
        # List should include new country
        after_create_response = client.get("/api/v1/countries", headers=user_headers)
        after_create_data = after_create_response.json()
        assert "data" in after_create_data
        assert "pagination" in after_create_data
        after_create_count = len(after_create_data["data"])
        assert after_create_count == initial_count + 1
        
        # Delete country
        delete_response = client.delete(f"/api/v1/countries/{country_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # List should return to original count
        after_delete_response = client.get("/api/v1/countries", headers=user_headers)
        after_delete_data = after_delete_response.json()
        assert "data" in after_delete_data
        assert "pagination" in after_delete_data
        after_delete_count = len(after_delete_data["data"])
        assert after_delete_count == initial_count

    def test_country_unicode_handling(self, client, admin_token):
        """Test Unicode character handling."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        unicode_names = [
            "한국",  # Korean
            "中国",  # Chinese
            "日本",  # Japanese
            "Россия",  # Russian
            "France",  # French
            "España",  # Spanish
            "البرازيل",  # Arabic
            "🇺🇸🇰🇷🇨🇳",  # Flag emojis
            "Country\\u0301",  # Combining characters
            "Country\\u200B",  # Zero-width space
        ]
        
        created_ids = []
        for name in unicode_names:
            data = {"name": name}
            response = client.post("/api/v1/countries", json=data, headers=headers)
            
            if response.status_code == 200:
                country = response.json()
                assert country["name"] == name
                created_ids.append(country["id"])
        
        # Clean up
        for country_id in created_ids:
            client.delete(f"/api/v1/countries/{country_id}", headers=headers)

    def test_country_database_constraint_violations(self, client, admin_token):
        """Test database constraint violations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create country to test constraints
        data = {"name": "Constraint Test Country"}
        response1 = client.post("/api/v1/countries", json=data, headers=headers)
        assert response1.status_code == 200
        country_id = response1.json()["id"]
        
        # Try to create duplicate (should be handled by application logic)
        response2 = client.post("/api/v1/countries", json=data, headers=headers)
        assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/countries/{country_id}", headers=headers)