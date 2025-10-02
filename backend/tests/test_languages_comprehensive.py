import pytest
import uuid
from fastapi import status
from sqlalchemy.exc import IntegrityError


@pytest.fixture
def sample_language_data():
    """Sample language data for testing."""
    return {
        "name": "Korean",
        "sigle": "ko"
    }


@pytest.fixture
def sample_language_update_data():
    """Sample language update data for testing."""
    return {
        "name": "Korean Updated",
        "sigle": "ko-KR"
    }


class TestLanguagesEdgeCases:
    """Comprehensive edge case testing for languages."""
    
    def test_create_language_empty_name(self, client, admin_token):
        """Test language creation with empty name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Empty string
        response1 = client.post("/api/v1/languages", json={"name": "", "sigle": "xx"}, headers=headers)
        assert response1.status_code == 422
        
        # Whitespace only
        response2 = client.post("/api/v1/languages", json={"name": "   ", "sigle": "xx"}, headers=headers)
        assert response2.status_code == 422
        
        # None value
        response3 = client.post("/api/v1/languages", json={"name": None, "sigle": "xx"}, headers=headers)
        assert response3.status_code == 422

    def test_create_language_empty_sigle(self, client, admin_token):
        """Test language creation with empty sigle fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Empty string
        response1 = client.post("/api/v1/languages", json={"name": "Test Language", "sigle": ""}, headers=headers)
        assert response1.status_code == 422
        
        # Whitespace only
        response2 = client.post("/api/v1/languages", json={"name": "Test Language", "sigle": "   "}, headers=headers)
        assert response2.status_code == 422
        
        # None value
        response3 = client.post("/api/v1/languages", json={"name": "Test Language", "sigle": None}, headers=headers)
        assert response3.status_code == 422

    def test_create_language_very_long_name(self, client, admin_token):
        """Test language creation with very long name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Very long name (1000 characters)
        long_name = "A" * 1000
        data = {"name": long_name, "sigle": "xx"}
        
        response = client.post("/api/v1/languages", json=data, headers=headers)
        # Should either succeed or fail with validation error
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            language = response.json()
            assert language["name"] == long_name
            client.delete(f"/api/v1/languages/{language['id']}", headers=headers)

    def test_create_language_very_long_sigle(self, client, admin_token):
        """Test language creation with very long sigle."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with exactly 20 characters (should succeed)
        valid_long_sigle = "en-US-California-ext"  # exactly 20 chars
        data = {"name": "Test Language 20", "sigle": valid_long_sigle}
        response = client.post("/api/v1/languages", json=data, headers=headers)
        assert response.status_code == 200
        created_id = response.json()["id"]
        assert response.json()["sigle"] == valid_long_sigle
        
        # Test with 21 characters (should fail)
        too_long_sigle = "en-US-California-ext1"  # 21 chars
        data2 = {"name": "Test Language 21", "sigle": too_long_sigle}
        response2 = client.post("/api/v1/languages", json=data2, headers=headers)
        assert response2.status_code == 422
        
        # Very long sigle (100 characters) - should fail
        very_long_sigle = "x" * 100
        data3 = {"name": "Test Language 100", "sigle": very_long_sigle}
        response3 = client.post("/api/v1/languages", json=data3, headers=headers)
        assert response3.status_code == 422
        
        # Clean up
        client.delete(f"/api/v1/languages/{created_id}", headers=headers)

    def test_create_language_special_characters(self, client, admin_token):
        """Test language creation with special characters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_names = [
            "한국어",  # Korean characters
            "Français",  # French with accents
            "Español",  # Spanish with accents
            "Português",  # Portuguese with accents
            "日本語",  # Japanese
            "中文",  # Chinese
            "العربية",  # Arabic
            "Русский",  # Russian
            "Ελληνικά",  # Greek
            "Name with émojis 🇰🇷",
            "Name with symbols @#$%^&*()",
            "Name with quotes \"'",
            "Name with SQL ' OR '1'='1",
        ]
        
        created_ids = []
        for name in special_names:
            data = {"name": name, "sigle": f"x{len(created_ids)}"}
            response = client.post("/api/v1/languages", json=data, headers=headers)
            
            if response.status_code == 200:
                language = response.json()
                assert language["name"] == name
                created_ids.append(language["id"])
        
        # Clean up
        for language_id in created_ids:
            client.delete(f"/api/v1/languages/{language_id}", headers=headers)

    def test_create_language_special_sigle_characters(self, client, admin_token):
        """Test language creation with special sigle characters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_sigles = [
            "zh-CN",  # Chinese Simplified
            "zh-TW",  # Chinese Traditional
            "pt-BR",  # Portuguese Brazil
            "en-US",  # English US
            "fr-CA",  # French Canada
            "es-MX",  # Spanish Mexico
            "ar-SA",  # Arabic Saudi Arabia
            "ko-KR",  # Korean South Korea
            "ja-JP",  # Japanese Japan
            "de-DE",  # German Germany
            "it-IT",  # Italian Italy
            "ru-RU",  # Russian Russia
            "hi-IN",  # Hindi India
            "th-TH",  # Thai Thailand
            "vi-VN",  # Vietnamese Vietnam
        ]
        
        created_ids = []
        for sigle in special_sigles:
            data = {"name": f"Test Language {len(created_ids)}", "sigle": sigle}
            response = client.post("/api/v1/languages", json=data, headers=headers)
            
            if response.status_code == 200:
                language = response.json()
                assert language["sigle"] == sigle
                created_ids.append(language["id"])
        
        # Clean up
        for language_id in created_ids:
            client.delete(f"/api/v1/languages/{language_id}", headers=headers)

    def test_create_language_case_sensitivity(self, client, admin_token):
        """Test case sensitivity of language names and sigles."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language with lowercase
        data1 = {"name": "test language", "sigle": "tl"}
        response1 = client.post("/api/v1/languages", json=data1, headers=headers)
        assert response1.status_code == 200
        language1_id = response1.json()["id"]
        
        # Try to create with uppercase name
        data2 = {"name": "TEST LANGUAGE", "sigle": "TL"}
        response2 = client.post("/api/v1/languages", json=data2, headers=headers)
        
        # Should succeed if case sensitive, fail if case insensitive
        if response2.status_code == 200:
            language2_id = response2.json()["id"]
            client.delete(f"/api/v1/languages/{language2_id}", headers=headers)
        else:
            assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/languages/{language1_id}", headers=headers)

    def test_create_language_duplicate_name(self, client, admin_token):
        """Test creating languages with duplicate names is allowed (only sigle must be unique)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first language
        data1 = {"name": "French", "sigle": "fr"}
        response1 = client.post("/api/v1/languages", json=data1, headers=headers)
        assert response1.status_code == 200
        language1_id = response1.json()["id"]
        
        # Create second language with same name but different sigle (should succeed)
        data2 = {"name": "French", "sigle": "fc"}
        response2 = client.post("/api/v1/languages", json=data2, headers=headers)
        assert response2.status_code == 200  # Should succeed as names can be duplicate
        language2_id = response2.json()["id"]
        
        # Clean up
        client.delete(f"/api/v1/languages/{language1_id}", headers=headers)
        client.delete(f"/api/v1/languages/{language2_id}", headers=headers)

    def test_create_language_duplicate_sigle(self, client, admin_token):
        """Test creating languages with duplicate sigles."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first language
        data1 = {"name": "Test Language 1", "sigle": "xx"}
        response1 = client.post("/api/v1/languages", json=data1, headers=headers)
        assert response1.status_code == 200
        language1_id = response1.json()["id"]
        
        # Try to create duplicate sigle
        data2 = {"name": "Test Language 2", "sigle": "xx"}
        response2 = client.post("/api/v1/languages", json=data2, headers=headers)
        assert response2.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/languages/{language1_id}", headers=headers)

    def test_get_language_invalid_uuid_format(self, client, user_token):
        """Test getting language with invalid UUID format."""
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
            response = client.get(f"/api/v1/languages/{invalid_uuid}", headers=headers)
            assert response.status_code in [404, 422]

    def test_update_language_to_duplicate_name(self, client, admin_token):
        """Test updating language to duplicate name is allowed (only sigle must be unique)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two languages
        data1 = {"name": "English", "sigle": "en"}
        response1 = client.post("/api/v1/languages", json=data1, headers=headers)
        language1_id = response1.json()["id"]
        
        data2 = {"name": "French", "sigle": "fr"}
        response2 = client.post("/api/v1/languages", json=data2, headers=headers)
        language2_id = response2.json()["id"]
        
        # Try to update language 2 to have same name as language 1 (should succeed)
        update_data = {"name": "English"}
        response = client.put(f"/api/v1/languages/{language2_id}", json=update_data, headers=headers)
        assert response.status_code == 200  # Should succeed as names can be duplicate
        
        # Clean up
        client.delete(f"/api/v1/languages/{language1_id}", headers=headers)
        client.delete(f"/api/v1/languages/{language2_id}", headers=headers)

    def test_update_language_to_duplicate_sigle(self, client, admin_token):
        """Test updating language to duplicate sigle."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create two languages
        data1 = {"name": "Language 1", "sigle": "l1"}
        response1 = client.post("/api/v1/languages", json=data1, headers=headers)
        language1_id = response1.json()["id"]
        
        data2 = {"name": "Language 2", "sigle": "l2"}
        response2 = client.post("/api/v1/languages", json=data2, headers=headers)
        language2_id = response2.json()["id"]
        
        # Try to update language 2 to have same sigle as language 1
        update_data = {"sigle": "l1"}
        response = client.put(f"/api/v1/languages/{language2_id}", json=update_data, headers=headers)
        assert response.status_code == 409
        
        # Clean up
        client.delete(f"/api/v1/languages/{language1_id}", headers=headers)
        client.delete(f"/api/v1/languages/{language2_id}", headers=headers)

    def test_update_language_same_values(self, client, admin_token, sample_language_data):
        """Test updating language with same values."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        language_id = create_response.json()["id"]
        
        # Update with same values
        update_data = sample_language_data
        response = client.put(f"/api/v1/languages/{language_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        # Clean up
        client.delete(f"/api/v1/languages/{language_id}", headers=headers)

    def test_update_language_partial_fields(self, client, admin_token, sample_language_data):
        """Test updating language with partial field updates."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        language_id = create_response.json()["id"]
        
        # Update only name
        update_name = {"name": "Only Name Updated"}
        response1 = client.put(f"/api/v1/languages/{language_id}", json=update_name, headers=headers)
        assert response1.status_code == 200
        language1 = response1.json()
        assert language1["name"] == "Only Name Updated"
        assert language1["sigle"] == sample_language_data["sigle"]
        
        # Update only sigle
        update_sigle = {"sigle": "up"}
        response2 = client.put(f"/api/v1/languages/{language_id}", json=update_sigle, headers=headers)
        assert response2.status_code == 200
        language2 = response2.json()
        assert language2["name"] == "Only Name Updated"  # Should remain unchanged
        assert language2["sigle"] == "up"
        
        # Clean up
        client.delete(f"/api/v1/languages/{language_id}", headers=headers)

    def test_delete_language_twice(self, client, admin_token, sample_language_data):
        """Test deleting same language twice."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        language_id = create_response.json()["id"]
        
        # Delete first time
        response1 = client.delete(f"/api/v1/languages/{language_id}", headers=headers)
        assert response1.status_code == 200
        
        # Delete second time
        response2 = client.delete(f"/api/v1/languages/{language_id}", headers=headers)
        assert response2.status_code == 404

    def test_language_operations_with_malformed_json(self, client, admin_token):
        """Test language operations with malformed JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data_sets = [
            {"name": 123, "sigle": "xx"},  # Number instead of string
            {"name": [], "sigle": "xx"},   # Array instead of string
            {"name": {}, "sigle": "xx"},   # Object instead of string
            {"name": True, "sigle": "xx"}, # Boolean instead of string
            {"name": "Test", "sigle": 123}, # Number instead of string
            {"name": "Test", "sigle": []},  # Array instead of string
            {"name": "Test", "sigle": {}},  # Object instead of string
            {"name": "Test", "sigle": True}, # Boolean instead of string
        ]
        
        for invalid_data in invalid_data_sets:
            response = client.post("/api/v1/languages", json=invalid_data, headers=headers)
            assert response.status_code == 422

    def test_language_response_format_consistency(self, client, admin_token, sample_language_data):
        """Test language response format consistency across operations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language
        create_response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
        assert create_response.status_code == 200
        created_language = create_response.json()
        language_id = created_language["id"]
        
        # Required fields should be present
        required_fields = ["id", "creation_date_utc", "name", "sigle"]
        for field in required_fields:
            assert field in created_language
            assert created_language[field] is not None
        
        # Get language
        get_response = client.get(f"/api/v1/languages/{language_id}", headers=headers)
        assert get_response.status_code == 200
        get_language = get_response.json()
        
        # Should have same structure
        assert set(created_language.keys()) == set(get_language.keys())
        
        # Update language
        update_data = {"name": "Updated Language"}
        update_response = client.put(f"/api/v1/languages/{language_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        updated_language = update_response.json()
        
        # Should have same structure
        assert set(created_language.keys()) == set(updated_language.keys())
        
        # Delete language
        delete_response = client.delete(f"/api/v1/languages/{language_id}", headers=headers)
        assert delete_response.status_code == 200
        deleted_language = delete_response.json()
        
        # Should have same structure
        assert set(created_language.keys()) == set(deleted_language.keys())

    def test_language_pagination_edge_cases(self, client, user_token):
        """Test language pagination edge cases."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Very large skip value
        response1 = client.get("/api/v1/languages?skip=999999", headers=headers)
        assert response1.status_code == 200
        assert response1.json()["data"] == []

        # Skip larger than total count
        response2 = client.get("/api/v1/languages?skip=1000000", headers=headers)
        assert response2.status_code == 200
        assert response2.json()["data"] == []
        
        # Maximum limit
        response3 = client.get("/api/v1/languages?limit=100", headers=headers)
        assert response3.status_code == 200
        
        # Limit of 1
        response4 = client.get("/api/v1/languages?limit=1", headers=headers)
        assert response4.status_code == 200
        languages = response4.json()
        assert len(languages["data"]) <= 1

    def test_language_operations_with_expired_token(self, client, admin_token):
        """Test language operations with various token issues."""
        fake_id = "550e8400-e29b-41d4-a716-446655440000"
        language_data = {"name": "Test Language", "sigle": "tl"}
        
        # Invalid token format - testing admin operation (create)
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        response1 = client.post("/api/v1/languages", json=language_data, headers=invalid_headers)
        assert response1.status_code == 401
        
        # Missing Bearer prefix - testing admin operation (update)
        invalid_headers2 = {"Authorization": admin_token}
        response2 = client.put(f"/api/v1/languages/{fake_id}", json=language_data, headers=invalid_headers2)
        assert response2.status_code in [401, 403]
        
        # Empty token - testing admin operation (delete)
        invalid_headers3 = {"Authorization": "Bearer "}
        response3 = client.delete(f"/api/v1/languages/{fake_id}", headers=invalid_headers3)
        assert response3.status_code in [401, 403]
        
        # No Authorization header - testing admin operation (create)
        response4 = client.post("/api/v1/languages", json=language_data)
        assert response4.status_code in [401, 403]

    def test_language_name_with_leading_trailing_spaces(self, client, admin_token):
        """Test language name with leading/trailing spaces."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language with spaces
        data = {"name": "  Spaced Language  ", "sigle": "sl"}
        response = client.post("/api/v1/languages", json=data, headers=headers)
        
        if response.status_code == 200:
            language = response.json()
            # Check if spaces are preserved or trimmed
            assert language["name"] in ["  Spaced Language  ", "Spaced Language"]
            client.delete(f"/api/v1/languages/{language['id']}", headers=headers)

    def test_language_sigle_with_leading_trailing_spaces(self, client, admin_token):
        """Test language sigle with leading/trailing spaces."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create language with spaces in sigle
        data = {"name": "Test Language", "sigle": "  sl  "}
        response = client.post("/api/v1/languages", json=data, headers=headers)
        
        if response.status_code == 200:
            language = response.json()
            # Check if spaces are preserved or trimmed
            assert language["sigle"] in ["  sl  ", "sl"]
            client.delete(f"/api/v1/languages/{language['id']}", headers=headers)
    
    def test_language_sigle_various_lengths(self, client, admin_token):
        """Test language creation with various sigle lengths up to 20."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        created_ids = []
        
        # Test various valid lengths
        test_cases = [
            ("ko", "Korean"),  # 2 chars
            ("eng", "English"),  # 3 chars
            ("en-US", "English US"),  # 5 chars
            ("zh-Hans", "Chinese Simplified"),  # 7 chars
            ("en-US-ext", "English US Extended"),  # 9 chars
            ("pt-BR-regional", "Portuguese Brazil Regional"),  # 14 chars
            ("en-US-California", "English US California"),  # 16 chars
            ("de-DE-BY-Munich-loc", "German Munich Local"),  # 19 chars
            ("en-US-California-ext", "English California Extended"),  # 20 chars (max)
        ]
        
        for sigle, name in test_cases:
            data = {"name": name, "sigle": sigle}
            response = client.post("/api/v1/languages", json=data, headers=headers)
            assert response.status_code == 200, f"Failed to create language with sigle '{sigle}' (length {len(sigle)})"
            language = response.json()
            assert language["sigle"] == sigle
            assert language["name"] == name
            created_ids.append(language["id"])
        
        # Clean up
        for language_id in created_ids:
            client.delete(f"/api/v1/languages/{language_id}", headers=headers)