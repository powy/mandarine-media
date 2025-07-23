import pytest
import uuid
from fastapi import status
from sqlalchemy.exc import IntegrityError


@pytest.fixture
def sample_season_data():
    """Sample season data for testing."""
    return {
        "season_number": 1,
        "program_id": str(uuid.uuid4())  # Will be replaced with actual program ID
    }


@pytest.fixture
def sample_season_update_data():
    """Sample season update data for testing."""
    return {
        "season_number": 2
    }


class TestSeasonsEdgeCases:
    """Comprehensive edge case testing for seasons."""
    
    def test_create_season_invalid_season_number(self, client, admin_token):
        """Test season creation with invalid season numbers."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program first
        program_data = {"program_name": "Test Program for Season"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        invalid_season_numbers = [
            0,          # Zero season number
            -1,         # Negative season number
            -100,       # Large negative number
            None,       # None value
            "string",   # String instead of number
            [],         # Array instead of number
            {},         # Object instead of number
            3.14,       # Float instead of integer
        ]
        
        for season_num in invalid_season_numbers:
            data = {"season_number": season_num, "program_id": program_id}
            response = client.post("/api/v1/seasons", json=data, headers=headers)
            assert response.status_code == 422
        
        # Clean up
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_create_season_very_large_season_number(self, client, admin_token):
        """Test season creation with very large season numbers."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program first
        program_data = {"program_name": "Test Program for Large Season"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        large_season_numbers = [
            999999,      # Very large season number
            2147483647,  # Max 32-bit integer
            1000000000,  # One billion
        ]
        
        for season_num in large_season_numbers:
            data = {"season_number": season_num, "program_id": program_id}
            response = client.post("/api/v1/seasons", json=data, headers=headers)
            # Should either succeed or fail with validation error
            assert response.status_code in [200, 422]
            
            if response.status_code == 200:
                season = response.json()
                assert season["season_number"] == season_num
                client.delete(f"/api/v1/seasons/{season['id']}", headers=headers)
        
        # Clean up
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_create_season_invalid_program_id(self, client, admin_token):
        """Test season creation with invalid program IDs."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_program_ids = [
            "not-a-uuid",
            "123",
            "abc-def-ghi",
            str(uuid.uuid4()),  # Valid UUID but non-existent program
            "",
            None,
            123,
            [],
            {},
            True
        ]
        
        for program_id in invalid_program_ids:
            data = {"season_number": 1, "program_id": program_id}
            response = client.post("/api/v1/seasons", json=data, headers=headers)
            assert response.status_code in [404, 422]  # Not found or validation error

    def test_create_season_duplicate_season_number(self, client, admin_token):
        """Test creating seasons with duplicate season numbers for same program."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program first
        program_data = {"program_name": "Test Program for Duplicate Season"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        # Create first season
        season_data = {"season_number": 1, "program_id": program_id}
        response1 = client.post("/api/v1/seasons", json=season_data, headers=headers)
        assert response1.status_code == 200
        season1_id = response1.json()["id"]
        
        # Try to create duplicate season number
        response2 = client.post("/api/v1/seasons", json=season_data, headers=headers)
        assert response2.status_code == 409  # Conflict
        
        # Clean up
        client.delete(f"/api/v1/seasons/{season1_id}", headers=headers)
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_create_season_different_programs_same_number(self, client, admin_token):
        """Test creating seasons with same number for different programs."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two test programs
        program_data1 = {"program_name": "Test Program 1"}
        program_response1 = client.post("/api/v1/programs", json=program_data1, headers=headers)
        program_id1 = program_response1.json()["id"]
        
        program_data2 = {"program_name": "Test Program 2"}
        program_response2 = client.post("/api/v1/programs", json=program_data2, headers=headers)
        program_id2 = program_response2.json()["id"]
        
        # Create seasons with same number for different programs
        season_data1 = {"season_number": 1, "program_id": program_id1}
        response1 = client.post("/api/v1/seasons", json=season_data1, headers=headers)
        assert response1.status_code == 200
        season1_id = response1.json()["id"]
        
        season_data2 = {"season_number": 1, "program_id": program_id2}
        response2 = client.post("/api/v1/seasons", json=season_data2, headers=headers)
        assert response2.status_code == 200  # Should succeed
        season2_id = response2.json()["id"]
        
        # Clean up
        client.delete(f"/api/v1/seasons/{season1_id}", headers=headers)
        client.delete(f"/api/v1/seasons/{season2_id}", headers=headers)
        client.delete(f"/api/v1/programs/{program_id1}", headers=headers)
        client.delete(f"/api/v1/programs/{program_id2}", headers=headers)

    def test_get_season_invalid_uuid_format(self, client, user_token):
        """Test getting season with invalid UUID format."""
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
            response = client.get(f"/api/v1/seasons/{invalid_uuid}", headers=headers)
            assert response.status_code in [404, 422]

    def test_update_season_invalid_data(self, client, admin_token):
        """Test updating season with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program and season
        program_data = {"program_name": "Test Program for Update"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        season_data = {"season_number": 1, "program_id": program_id}
        season_response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        season_id = season_response.json()["id"]
        
        # Test invalid updates
        invalid_updates = [
            {"season_number": 0},
            {"season_number": -1},
            {"season_number": "string"},
            {"season_number": []},
            {"season_number": {}},
            {"season_number": 3.14},
        ]
        
        for update_data in invalid_updates:
            response = client.put(f"/api/v1/seasons/{season_id}", json=update_data, headers=headers)
            assert response.status_code == 422
            
        # Test None update separately - should be caught by validation now
        none_update = {"season_number": None}
        response = client.put(f"/api/v1/seasons/{season_id}", json=none_update, headers=headers)
        assert response.status_code == 422  # Validation error
        
        # Clean up
        client.delete(f"/api/v1/seasons/{season_id}", headers=headers)
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_update_season_to_duplicate_number(self, client, admin_token):
        """Test updating season to duplicate season number."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program
        program_data = {"program_name": "Test Program for Duplicate Update"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        # Create two seasons
        season_data1 = {"season_number": 1, "program_id": program_id}
        season_response1 = client.post("/api/v1/seasons", json=season_data1, headers=headers)
        season1_id = season_response1.json()["id"]
        
        season_data2 = {"season_number": 2, "program_id": program_id}
        season_response2 = client.post("/api/v1/seasons", json=season_data2, headers=headers)
        season2_id = season_response2.json()["id"]
        
        # Try to update season 2 to have same number as season 1
        update_data = {"season_number": 1}
        response = client.put(f"/api/v1/seasons/{season2_id}", json=update_data, headers=headers)
        assert response.status_code == 409  # Conflict
        
        # Clean up
        client.delete(f"/api/v1/seasons/{season1_id}", headers=headers)
        client.delete(f"/api/v1/seasons/{season2_id}", headers=headers)
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_update_season_same_number(self, client, admin_token):
        """Test updating season with same season number."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program and season
        program_data = {"program_name": "Test Program for Same Update"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        season_data = {"season_number": 1, "program_id": program_id}
        season_response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        season_id = season_response.json()["id"]
        
        # Update with same season number
        update_data = {"season_number": 1}
        response = client.put(f"/api/v1/seasons/{season_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        # Clean up
        client.delete(f"/api/v1/seasons/{season_id}", headers=headers)
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_delete_season_twice(self, client, admin_token):
        """Test deleting same season twice."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program and season
        program_data = {"program_name": "Test Program for Delete"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        season_data = {"season_number": 1, "program_id": program_id}
        season_response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        season_id = season_response.json()["id"]
        
        # Delete first time
        response1 = client.delete(f"/api/v1/seasons/{season_id}", headers=headers)
        assert response1.status_code == 200
        
        # Delete second time
        response2 = client.delete(f"/api/v1/seasons/{season_id}", headers=headers)
        assert response2.status_code == 404
        
        # Clean up program
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_season_response_format_consistency(self, client, admin_token):
        """Test season response format consistency across operations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test program
        program_data = {"program_name": "Test Program for Format"}
        program_response = client.post("/api/v1/programs", json=program_data, headers=headers)
        program_id = program_response.json()["id"]
        
        # Create season
        season_data = {"season_number": 1, "program_id": program_id}
        create_response = client.post("/api/v1/seasons", json=season_data, headers=headers)
        assert create_response.status_code == 200
        created_season = create_response.json()
        season_id = created_season["id"]
        
        # Required fields should be present
        required_fields = ["id", "creation_date_utc", "season_number", "program_id"]
        for field in required_fields:
            assert field in created_season
            assert created_season[field] is not None
        
        # Get season
        get_response = client.get(f"/api/v1/seasons/{season_id}", headers=headers)
        assert get_response.status_code == 200
        get_season = get_response.json()
        
        # Should have same structure
        assert set(created_season.keys()) == set(get_season.keys())
        
        # Update season
        update_data = {"season_number": 2}
        update_response = client.put(f"/api/v1/seasons/{season_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        updated_season = update_response.json()
        
        # Should have same structure
        assert set(created_season.keys()) == set(updated_season.keys())
        
        # Delete season
        delete_response = client.delete(f"/api/v1/seasons/{season_id}", headers=headers)
        assert delete_response.status_code == 200
        deleted_season = delete_response.json()
        
        # Should have same structure
        assert set(created_season.keys()) == set(deleted_season.keys())
        
        # Clean up program
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_season_pagination_edge_cases(self, client, user_token):
        """Test season pagination edge cases."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Very large skip value
        response1 = client.get("/api/v1/seasons?skip=999999", headers=headers)
        assert response1.status_code == 200
        assert response1.json() == []
        
        # Skip larger than total count
        response2 = client.get("/api/v1/seasons?skip=1000000", headers=headers)
        assert response2.status_code == 200
        assert response2.json() == []
        
        # Maximum limit
        response3 = client.get("/api/v1/seasons?limit=100", headers=headers)
        assert response3.status_code == 200
        
        # Limit of 1
        response4 = client.get("/api/v1/seasons?limit=1", headers=headers)
        assert response4.status_code == 200
        seasons = response4.json()
        assert len(seasons) <= 1

    def test_season_operations_with_expired_token(self, client, admin_token):
        """Test season operations with various token issues."""
        # Invalid token format
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        response1 = client.get("/api/v1/seasons", headers=invalid_headers)
        assert response1.status_code == 401
        
        # Missing Bearer prefix
        invalid_headers2 = {"Authorization": admin_token}
        response2 = client.get("/api/v1/seasons", headers=invalid_headers2)
        assert response2.status_code in [401, 403]
        
        # Empty token
        invalid_headers3 = {"Authorization": "Bearer "}
        response3 = client.get("/api/v1/seasons", headers=invalid_headers3)
        assert response3.status_code in [401, 403]
        
        # No Authorization header
        response4 = client.get("/api/v1/seasons")
        assert response4.status_code in [401, 403]