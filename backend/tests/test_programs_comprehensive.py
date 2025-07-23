import pytest
import uuid
from fastapi import status
from sqlalchemy.exc import IntegrityError


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


class TestProgramsEdgeCases:
    """Comprehensive edge case testing for programs."""
    
    def test_create_program_empty_name(self, client, admin_token):
        """Test program creation with empty name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Empty string
        response1 = client.post("/api/v1/programs", json={"program_name": ""}, headers=headers)
        assert response1.status_code == 422
        
        # Whitespace only
        response2 = client.post("/api/v1/programs", json={"program_name": "   "}, headers=headers)
        assert response2.status_code == 422
        
        # None value
        response3 = client.post("/api/v1/programs", json={"program_name": None}, headers=headers)
        assert response3.status_code == 422

    def test_create_program_very_long_name(self, client, admin_token):
        """Test program creation with very long name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Very long name (1000 characters)
        long_name = "A" * 1000
        data = {"program_name": long_name}
        
        response = client.post("/api/v1/programs", json=data, headers=headers)
        # Should either succeed or fail with validation error
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            # If it succeeds, verify the name is stored correctly
            program = response.json()
            assert program["program_name"] == long_name

    def test_create_program_special_characters(self, client, admin_token):
        """Test program creation with special characters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_names = [
            "Program with émojis 🎬",
            "Program with 한글 Korean",
            "Program with symbols @#$%^&*()",
            "Program with quotes \"'",
            "Program with newlines\n\r",
            "Program with tabs\t",
            "Program with SQL ' OR '1'='1"
        ]
        
        for name in special_names:
            data = {"program_name": name}
            response = client.post("/api/v1/programs", json=data, headers=headers)
            
            if response.status_code == 200:
                program = response.json()
                # Account for validation stripping whitespace
                expected_name = name.strip()
                assert program["program_name"] == expected_name
                
                # Clean up for next test
                client.delete(f"/api/v1/programs/{program['id']}", headers=headers)

    def test_create_program_case_sensitivity(self, client, admin_token):
        """Test case sensitivity of program names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program with lowercase
        data1 = {"program_name": "test program"}
        response1 = client.post("/api/v1/programs", json=data1, headers=headers)
        assert response1.status_code == 200
        program1_id = response1.json()["id"]
        
        # Try to create with uppercase
        data2 = {"program_name": "TEST PROGRAM"}
        response2 = client.post("/api/v1/programs", json=data2, headers=headers)
        
        # Should succeed if case sensitive, fail if case insensitive
        if response2.status_code == 200:
            program2_id = response2.json()["id"]
            client.delete(f"/api/v1/programs/{program2_id}", headers=headers)
        else:
            assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/programs/{program1_id}", headers=headers)

    def test_create_program_null_description(self, client, admin_token):
        """Test program creation with null description."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Explicit null
        data1 = {"program_name": "Program with null desc", "general_media_description": None}
        response1 = client.post("/api/v1/programs", json=data1, headers=headers)
        assert response1.status_code == 200
        program1 = response1.json()
        assert program1["general_media_description"] is None
        
        # Missing field
        data2 = {"program_name": "Program without desc"}
        response2 = client.post("/api/v1/programs", json=data2, headers=headers)
        assert response2.status_code == 200
        program2 = response2.json()
        assert program2["general_media_description"] is None
        
        # Clean up
        client.delete(f"/api/v1/programs/{program1['id']}", headers=headers)
        client.delete(f"/api/v1/programs/{program2['id']}", headers=headers)

    def test_create_program_very_long_description(self, client, admin_token):
        """Test program creation with very long description."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Very long description (5000 characters)
        long_desc = "B" * 5000
        data = {
            "program_name": "Program with long desc",
            "general_media_description": long_desc
        }
        
        response = client.post("/api/v1/programs", json=data, headers=headers)
        # Should either succeed or fail with validation error
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            program = response.json()
            assert program["general_media_description"] == long_desc
            client.delete(f"/api/v1/programs/{program['id']}", headers=headers)

    def test_get_program_invalid_uuid_format(self, client, user_token):
        """Test getting program with invalid UUID format."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        invalid_uuids = [
            "not-a-uuid",
            "123",
            "abc-def-ghi",
            "12345678-1234-1234-1234-123456789012", # too long
            "12345678-1234-1234-1234-12345678901",  # too short
            "null",
            "undefined"
        ]
        
        for invalid_uuid in invalid_uuids:
            response = client.get(f"/api/v1/programs/{invalid_uuid}", headers=headers)
            assert response.status_code in [404, 422]  # FastAPI returns 404 for invalid UUID format

    def test_update_program_empty_update(self, client, admin_token, sample_program_data):
        """Test updating program with empty update data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id = create_response.json()["id"]
        original_program = create_response.json()
        
        # Empty update
        response = client.put(f"/api/v1/programs/{program_id}", json={}, headers=headers)
        assert response.status_code == 200
        
        # Should return unchanged program
        updated_program = response.json()
        assert updated_program["program_name"] == original_program["program_name"]
        assert updated_program["general_media_description"] == original_program["general_media_description"]
        
        # Clean up
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_update_program_partial_fields(self, client, admin_token, sample_program_data):
        """Test updating program with partial field updates."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id = create_response.json()["id"]
        
        # Update only name
        update_name = {"program_name": "Only Name Updated"}
        response1 = client.put(f"/api/v1/programs/{program_id}", json=update_name, headers=headers)
        assert response1.status_code == 200
        program1 = response1.json()
        assert program1["program_name"] == "Only Name Updated"
        assert program1["general_media_description"] == sample_program_data["general_media_description"]
        
        # Update only description
        update_desc = {"general_media_description": "Only Description Updated"}
        response2 = client.put(f"/api/v1/programs/{program_id}", json=update_desc, headers=headers)
        assert response2.status_code == 200
        program2 = response2.json()
        assert program2["program_name"] == "Only Name Updated"  # Should remain unchanged
        assert program2["general_media_description"] == "Only Description Updated"
        
        # Clean up
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_update_program_same_name(self, client, admin_token, sample_program_data):
        """Test updating program with same name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id = create_response.json()["id"]
        
        # Update with same name
        update_data = {"program_name": sample_program_data["program_name"]}
        response = client.put(f"/api/v1/programs/{program_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        # Clean up
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_concurrent_program_creation(self, client, admin_token):
        """Test concurrent program creation with same name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # This test simulates race condition - both requests might succeed
        # before the duplicate check, but database constraint should prevent it
        data = {"program_name": "Concurrent Test Program"}
        
        # In real scenario, these would be truly concurrent
        # Here we simulate by creating two requests quickly
        response1 = client.post("/api/v1/programs", json=data, headers=headers)
        response2 = client.post("/api/v1/programs", json=data, headers=headers)
        
        # One should succeed, one should fail
        success_count = sum(1 for r in [response1, response2] if r.status_code == 200)
        error_count = sum(1 for r in [response1, response2] if r.status_code == 409)
        
        assert success_count == 1
        assert error_count == 1
        
        # Clean up successful creation
        for response in [response1, response2]:
            if response.status_code == 200:
                program_id = response.json()["id"]
                client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_program_name_with_leading_trailing_spaces(self, client, admin_token):
        """Test program name with leading/trailing spaces."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program with spaces
        data = {"program_name": "  Spaced Program  "}
        response = client.post("/api/v1/programs", json=data, headers=headers)
        
        if response.status_code == 200:
            program = response.json()
            # Check if spaces are preserved or trimmed
            assert program["program_name"] in ["  Spaced Program  ", "Spaced Program"]
            client.delete(f"/api/v1/programs/{program['id']}", headers=headers)

    def test_delete_program_twice(self, client, admin_token, sample_program_data):
        """Test deleting same program twice."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        program_id = create_response.json()["id"]
        
        # Delete first time
        response1 = client.delete(f"/api/v1/programs/{program_id}", headers=headers)
        assert response1.status_code == 200
        
        # Delete second time
        response2 = client.delete(f"/api/v1/programs/{program_id}", headers=headers)
        assert response2.status_code == 404

    def test_program_operations_with_malformed_json(self, client, admin_token):
        """Test program operations with malformed JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # This is harder to test at this level since FastAPI handles JSON parsing
        # But we can test with invalid data types
        
        invalid_data_sets = [
            {"program_name": 123},  # Number instead of string
            {"program_name": []},   # Array instead of string
            {"program_name": {}},   # Object instead of string
            {"program_name": True}, # Boolean instead of string
            {"general_media_description": 123}, # Number instead of string
        ]
        
        for invalid_data in invalid_data_sets:
            response = client.post("/api/v1/programs", json=invalid_data, headers=headers)
            assert response.status_code == 422

    def test_program_pagination_edge_cases(self, client, user_token):
        """Test pagination edge cases."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Very large skip value
        response1 = client.get("/api/v1/programs?skip=999999", headers=headers)
        assert response1.status_code == 200
        assert response1.json() == []
        
        # Skip larger than total count
        response2 = client.get("/api/v1/programs?skip=1000000", headers=headers)
        assert response2.status_code == 200
        assert response2.json() == []
        
        # Maximum limit
        response3 = client.get("/api/v1/programs?limit=100", headers=headers)
        assert response3.status_code == 200
        
        # Limit of 1
        response4 = client.get("/api/v1/programs?limit=1", headers=headers)
        assert response4.status_code == 200
        programs = response4.json()
        assert len(programs) <= 1

    def test_program_operations_with_expired_token(self, client, admin_token):
        """Test program operations with various token issues."""
        # Invalid token format
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        response1 = client.get("/api/v1/programs", headers=invalid_headers)
        assert response1.status_code == 401
        
        # Missing Bearer prefix
        invalid_headers2 = {"Authorization": admin_token}
        response2 = client.get("/api/v1/programs", headers=invalid_headers2)
        assert response2.status_code in [401, 403]
        
        # Empty token
        invalid_headers3 = {"Authorization": "Bearer "}
        response3 = client.get("/api/v1/programs", headers=invalid_headers3)
        assert response3.status_code in [401, 403]
        
        # No Authorization header
        response4 = client.get("/api/v1/programs")
        assert response4.status_code in [401, 403]

    def test_program_database_constraint_violations(self, client, admin_token):
        """Test database constraint violations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program to test constraints
        data = {"program_name": "Constraint Test Program"}
        response1 = client.post("/api/v1/programs", json=data, headers=headers)
        assert response1.status_code == 200
        program_id = response1.json()["id"]
        
        # Try to create duplicate (should be handled by application logic)
        response2 = client.post("/api/v1/programs", json=data, headers=headers)
        assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_program_unicode_handling(self, client, admin_token):
        """Test Unicode character handling."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        unicode_names = [
            "프로그램",  # Korean
            "プログラム",  # Japanese  
            "программа",  # Russian
            "πρόγραμμα",  # Greek
            "برنامج",     # Arabic
            "🎬📺🎥",     # Emojis
            "Program\u0301",  # Combining characters
            "Program\u200B",  # Zero-width space
        ]
        
        created_ids = []
        for name in unicode_names:
            data = {"program_name": name}
            response = client.post("/api/v1/programs", json=data, headers=headers)
            
            if response.status_code == 200:
                program = response.json()
                assert program["program_name"] == name
                created_ids.append(program["id"])
        
        # Clean up
        for program_id in created_ids:
            client.delete(f"/api/v1/programs/{program_id}", headers=headers)

    def test_program_response_format_consistency(self, client, admin_token, sample_program_data):
        """Test response format consistency across operations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create program
        create_response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
        assert create_response.status_code == 200
        created_program = create_response.json()
        program_id = created_program["id"]
        
        # Required fields should be present
        required_fields = ["id", "creation_date_utc", "program_name"]
        for field in required_fields:
            assert field in created_program
            assert created_program[field] is not None
        
        # Get program
        get_response = client.get(f"/api/v1/programs/{program_id}", headers=headers)
        assert get_response.status_code == 200
        get_program = get_response.json()
        
        # Should have same structure
        assert set(created_program.keys()) == set(get_program.keys())
        
        # Update program
        update_data = {"program_name": "Updated Program"}
        update_response = client.put(f"/api/v1/programs/{program_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        updated_program = update_response.json()
        
        # Should have same structure
        assert set(created_program.keys()) == set(updated_program.keys())
        
        # Delete program
        delete_response = client.delete(f"/api/v1/programs/{program_id}", headers=headers)
        assert delete_response.status_code == 200
        deleted_program = delete_response.json()
        
        # Should have same structure
        assert set(created_program.keys()) == set(deleted_program.keys())

    def test_program_list_consistency(self, client, admin_token, user_token):
        """Test program list consistency."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get initial count
        initial_response = client.get("/api/v1/programs", headers=user_headers)
        initial_count = len(initial_response.json())
        
        # Create program
        data = {"program_name": "List Consistency Test"}
        create_response = client.post("/api/v1/programs", json=data, headers=admin_headers)
        assert create_response.status_code == 200
        program_id = create_response.json()["id"]
        
        # List should include new program
        after_create_response = client.get("/api/v1/programs", headers=user_headers)
        after_create_count = len(after_create_response.json())
        assert after_create_count == initial_count + 1
        
        # Delete program
        delete_response = client.delete(f"/api/v1/programs/{program_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # List should return to original count
        after_delete_response = client.get("/api/v1/programs", headers=user_headers)
        after_delete_count = len(after_delete_response.json())
        assert after_delete_count == initial_count