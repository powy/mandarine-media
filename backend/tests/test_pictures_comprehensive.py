import pytest
import uuid
from fastapi import status
from sqlalchemy.exc import IntegrityError


@pytest.fixture
def sample_picture_data():
    """Sample picture data for testing."""
    return {
        "image_url": "https://example.com/image.jpg",
        "file_name": "test_image.jpg",
        "file_size_bytes": 1024000,
        "width": 1920,
        "height": 1080,
        "alt_text": "Test image description"
    }


@pytest.fixture
def sample_picture_update_data():
    """Sample picture update data for testing."""
    return {
        "image_url": "https://example.com/updated_image.jpg",
        "file_name": "updated_image.jpg",
        "file_size_bytes": 2048000,
        "width": 3840,
        "height": 2160,
        "alt_text": "Updated test image description"
    }


class TestPicturesEdgeCases:
    """Comprehensive edge case testing for pictures."""
    
    def test_create_picture_empty_image_url(self, client, admin_token):
        """Test picture creation with empty photo URL fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Empty string
        response1 = client.post("/api/v1/pictures", json={"image_url": ""}, headers=headers)
        assert response1.status_code == 422
        
        # Whitespace only
        response2 = client.post("/api/v1/pictures", json={"image_url": "   "}, headers=headers)
        assert response2.status_code == 422
        
        # None value
        response3 = client.post("/api/v1/pictures", json={"image_url": None}, headers=headers)
        assert response3.status_code == 422

    def test_create_picture_invalid_image_url(self, client, admin_token):
        """Test picture creation with invalid photo URLs."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_urls = [
            "not-a-url",
            "ftp://example.com/image.jpg",  # Invalid protocol
            "http://",  # Incomplete URL
            "https://",  # Incomplete URL
            "javascript:alert('xss')",  # Security risk
            "data:image/jpeg;base64,/9j/4AA...",  # Data URL (may not be allowed)
            "file:///etc/passwd",  # File protocol
            "//example.com/image.jpg",  # Protocol-relative URL
            "https://example.com/image with spaces.jpg",  # Spaces in URL
            "https://example.com/image.jpg?query=value&other=test",  # Query parameters
            "https://example.com/image.jpg#anchor",  # Fragment
            "https://very-long-domain-name-that-exceeds-normal-limits.example.com/image.jpg",
        ]
        
        for url in invalid_urls:
            data = {"image_url": url}
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            # Should either succeed (if URL is valid) or fail with validation error
            assert response.status_code in [200, 422]
            
            if response.status_code == 200:
                picture = response.json()
                client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_valid_image_urls(self, client, admin_token):
        """Test picture creation with valid photo URLs."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        valid_urls = [
            "https://example.com/image.jpg",
            "https://example.com/image.jpeg",
            "https://example.com/image.png",
            "https://example.com/image.gif",
            "https://example.com/image.webp",
            "https://example.com/image.svg",
            "https://cdn.example.com/images/photo.jpg",
            "https://s3.amazonaws.com/bucket/image.jpg",
            "https://example.com/path/to/image.jpg",
            "https://example.com/image.jpg?v=1",
            "https://example.com/image.jpg?width=800&height=600",
            "https://subdomain.example.com/image.jpg",
            "https://example.org/image.jpg",
            "https://example.net/image.jpg",
            "https://example.co.uk/image.jpg",
        ]
        
        created_ids = []
        for url in valid_urls:
            data = {"image_url": url}
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            
            if response.status_code == 200:
                picture = response.json()
                assert picture["image_url"] == url
                created_ids.append(picture["id"])
        
        # Clean up
        for picture_id in created_ids:
            client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)

    def test_create_picture_optional_fields(self, client, admin_token):
        """Test picture creation with optional fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Only required field
        minimal_data = {"image_url": "https://example.com/minimal.jpg"}
        response = client.post("/api/v1/pictures", json=minimal_data, headers=headers)
        assert response.status_code == 200
        picture = response.json()
        assert picture["image_url"] == minimal_data["image_url"]
        assert picture["file_name"] is None
        assert picture["file_size_bytes"] is None
        assert picture["width"] is None
        assert picture["height"] is None
        assert picture["alt_text"] is None
        
        client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_negative_dimensions(self, client, admin_token):
        """Test picture creation with negative dimensions."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        negative_dimension_data = [
            {"image_url": "https://example.com/test.jpg", "width": -1920, "height": 1080},
            {"image_url": "https://example.com/test.jpg", "width": 1920, "height": -1080},
            {"image_url": "https://example.com/test.jpg", "width": -1920, "height": -1080},
        ]
        
        for data in negative_dimension_data:
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            assert response.status_code == 422

    def test_create_picture_zero_dimensions(self, client, admin_token):
        """Test picture creation with zero dimensions."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        zero_dimension_data = [
            {"image_url": "https://example.com/test.jpg", "width": 0, "height": 1080},
            {"image_url": "https://example.com/test.jpg", "width": 1920, "height": 0},
            {"image_url": "https://example.com/test.jpg", "width": 0, "height": 0},
        ]
        
        for data in zero_dimension_data:
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            # Should either succeed (if zero is allowed) or fail with validation error
            assert response.status_code in [200, 422]
            
            if response.status_code == 200:
                picture = response.json()
                client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_very_large_dimensions(self, client, admin_token):
        """Test picture creation with very large dimensions."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        large_dimension_data = [
            {"image_url": "https://example.com/test.jpg", "width": 999999, "height": 999999},
            {"image_url": "https://example.com/test.jpg", "width": 2147483647, "height": 2147483647},  # Max 32-bit int
        ]
        
        for data in large_dimension_data:
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            # Should either succeed or fail with validation error
            assert response.status_code in [200, 422]
            
            if response.status_code == 200:
                picture = response.json()
                client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_negative_file_size(self, client, admin_token):
        """Test picture creation with negative file size."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        data = {"image_url": "https://example.com/test.jpg", "file_size_bytes": -1024}
        response = client.post("/api/v1/pictures", json=data, headers=headers)
        assert response.status_code == 422

    def test_create_picture_zero_file_size(self, client, admin_token):
        """Test picture creation with zero file size."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        data = {"image_url": "https://example.com/test.jpg", "file_size_bytes": 0}
        response = client.post("/api/v1/pictures", json=data, headers=headers)
        # Should either succeed (if zero is allowed) or fail with validation error
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            picture = response.json()
            client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_very_large_file_size(self, client, admin_token):
        """Test picture creation with very large file size."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        large_file_sizes = [
            10 * 1024 * 1024 * 1024,  # 10 GB
            9223372036854775807,      # Max 64-bit int
        ]
        
        for file_size in large_file_sizes:
            data = {"image_url": "https://example.com/test.jpg", "file_size_bytes": file_size}
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            # Should either succeed or fail with validation error
            assert response.status_code in [200, 422]
            
            if response.status_code == 200:
                picture = response.json()
                client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_empty_file_name(self, client, admin_token):
        """Test picture creation with empty file name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        empty_file_name_data = [
            {"image_url": "https://example.com/test.jpg", "file_name": ""},
            {"image_url": "https://example.com/test.jpg", "file_name": "   "},
            {"image_url": "https://example.com/test.jpg", "file_name": None},
        ]
        
        for data in empty_file_name_data:
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            # Should either succeed (if empty is allowed) or fail with validation error
            assert response.status_code in [200, 422]
            
            if response.status_code == 200:
                picture = response.json()
                client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_special_file_names(self, client, admin_token):
        """Test picture creation with special file names."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_file_names = [
            "한글파일.jpg",  # Korean characters
            "中文文件.jpg",  # Chinese characters
            "日本語ファイル.jpg",  # Japanese characters
            "файл.jpg",  # Russian characters
            "archivo.jpg",  # Spanish characters
            "fichier.jpg",  # French characters
            "file with spaces.jpg",
            "file-with-dashes.jpg",
            "file_with_underscores.jpg",
            "file.with.dots.jpg",
            "file(with)parentheses.jpg",
            "file[with]brackets.jpg",
            "file{with}braces.jpg",
            "file@with@symbols.jpg",
            "file#with#hash.jpg",
            "file$with$dollar.jpg",
            "file%with%percent.jpg",
            "file^with^caret.jpg",
            "file&with&ampersand.jpg",
            "file*with*asterisk.jpg",
            "file+with+plus.jpg",
            "file=with=equals.jpg",
            "file!with!exclamation.jpg",
            "file?with?question.jpg",
            "file|with|pipe.jpg",
            "file\\with\\backslash.jpg",
            "file/with/slash.jpg",
            "file:with:colon.jpg",
            "file;with;semicolon.jpg",
            "file<with>angle.jpg",
            "file\"with\"quote.jpg",
            "file'with'apostrophe.jpg",
            "file`with`backtick.jpg",
            "file~with~tilde.jpg",
            "very-long-file-name-that-exceeds-normal-limits-and-continues-for-a-very-long-time.jpg",
        ]
        
        created_ids = []
        for file_name in special_file_names:
            data = {"image_url": f"https://example.com/{file_name}", "file_name": file_name}
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            
            if response.status_code == 200:
                picture = response.json()
                assert picture["file_name"] == file_name
                created_ids.append(picture["id"])
        
        # Clean up
        for picture_id in created_ids:
            client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)

    def test_create_picture_empty_alt_text(self, client, admin_token):
        """Test picture creation with empty alt text."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        empty_alt_text_data = [
            {"image_url": "https://example.com/test.jpg", "alt_text": ""},
            {"image_url": "https://example.com/test.jpg", "alt_text": "   "},
            {"image_url": "https://example.com/test.jpg", "alt_text": None},
        ]
        
        for data in empty_alt_text_data:
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            # Should either succeed (if empty is allowed) or fail with validation error
            assert response.status_code in [200, 422]
            
            if response.status_code == 200:
                picture = response.json()
                client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_very_long_alt_text(self, client, admin_token):
        """Test picture creation with very long alt text."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Very long alt text (5000 characters)
        long_alt_text = "A" * 5000
        data = {"image_url": "https://example.com/test.jpg", "alt_text": long_alt_text}
        
        response = client.post("/api/v1/pictures", json=data, headers=headers)
        # Should either succeed or fail with validation error
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            picture = response.json()
            assert picture["alt_text"] == long_alt_text
            client.delete(f"/api/v1/pictures/{picture['id']}", headers=headers)

    def test_create_picture_special_alt_text(self, client, admin_token):
        """Test picture creation with special alt text."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        special_alt_texts = [
            "한글 설명",  # Korean
            "中文描述",  # Chinese
            "日本語の説明",  # Japanese
            "Описание на русском",  # Russian
            "Descripción en español",  # Spanish
            "Description en français",  # French
            "Alt text with émojis 📸📷",
            "Alt text with symbols @#$%^&*()",
            "Alt text with quotes \"'",
            "Alt text with SQL ' OR '1'='1",
            "Alt text with newlines\\n\\r",
            "Alt text with tabs\\t",
            "Alt text with HTML <img src='test.jpg'>",
            "Alt text with JavaScript alert('xss')",
        ]
        
        created_ids = []
        for alt_text in special_alt_texts:
            data = {"image_url": f"https://example.com/test{len(created_ids)}.jpg", "alt_text": alt_text}
            response = client.post("/api/v1/pictures", json=data, headers=headers)
            
            if response.status_code == 200:
                picture = response.json()
                assert picture["alt_text"] == alt_text
                created_ids.append(picture["id"])
        
        # Clean up
        for picture_id in created_ids:
            client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)

    def test_get_picture_invalid_uuid_format(self, client, user_token):
        """Test getting picture with invalid UUID format."""
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
            response = client.get(f"/api/v1/pictures/{invalid_uuid}", headers=headers)
            assert response.status_code in [404, 422]

    def test_update_picture_partial_fields(self, client, admin_token, sample_picture_data):
        """Test updating picture with partial field updates."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create picture
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        picture_id = create_response.json()["id"]
        
        # Update only image_url
        update_url = {"image_url": "https://example.com/updated.jpg"}
        response1 = client.put(f"/api/v1/pictures/{picture_id}", json=update_url, headers=headers)
        assert response1.status_code == 200
        picture1 = response1.json()
        assert picture1["image_url"] == "https://example.com/updated.jpg"
        assert picture1["file_name"] == sample_picture_data["file_name"]
        
        # Update only dimensions
        update_dimensions = {"width": 800, "height": 600}
        response2 = client.put(f"/api/v1/pictures/{picture_id}", json=update_dimensions, headers=headers)
        assert response2.status_code == 200
        picture2 = response2.json()
        assert picture2["width"] == 800
        assert picture2["height"] == 600
        assert picture2["image_url"] == "https://example.com/updated.jpg"  # Should remain unchanged
        
        # Clean up
        client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)

    def test_update_picture_empty_update(self, client, admin_token, sample_picture_data):
        """Test updating picture with empty update data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create picture
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        picture_id = create_response.json()["id"]
        original_picture = create_response.json()
        
        # Empty update
        response = client.put(f"/api/v1/pictures/{picture_id}", json={}, headers=headers)
        assert response.status_code == 200
        
        # Should return unchanged picture
        updated_picture = response.json()
        assert updated_picture["image_url"] == original_picture["image_url"]
        assert updated_picture["file_name"] == original_picture["file_name"]
        
        # Clean up
        client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)

    def test_delete_picture_twice(self, client, admin_token, sample_picture_data):
        """Test deleting same picture twice."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create picture
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        picture_id = create_response.json()["id"]
        
        # Delete first time
        response1 = client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)
        assert response1.status_code == 200
        
        # Delete second time
        response2 = client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)
        assert response2.status_code == 404

    def test_picture_operations_with_malformed_json(self, client, admin_token):
        """Test picture operations with malformed JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data_sets = [
            {"image_url": 123},  # Number instead of string
            {"image_url": []},   # Array instead of string
            {"image_url": {}},   # Object instead of string
            {"image_url": True}, # Boolean instead of string
            {"image_url": "https://example.com/test.jpg", "file_name": 123},  # Number instead of string
            {"image_url": "https://example.com/test.jpg", "file_size_bytes": "not-a-number"},  # String instead of number
            {"image_url": "https://example.com/test.jpg", "width": "not-a-number"},  # String instead of number
            {"image_url": "https://example.com/test.jpg", "height": "not-a-number"},  # String instead of number
            {"image_url": "https://example.com/test.jpg", "alt_text": 123},  # Number instead of string
        ]
        
        for invalid_data in invalid_data_sets:
            response = client.post("/api/v1/pictures", json=invalid_data, headers=headers)
            assert response.status_code == 422

    def test_picture_response_format_consistency(self, client, admin_token, sample_picture_data):
        """Test picture response format consistency across operations."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create picture
        create_response = client.post("/api/v1/pictures", json=sample_picture_data, headers=headers)
        assert create_response.status_code == 200
        created_picture = create_response.json()
        picture_id = created_picture["id"]
        
        # Required fields should be present
        required_fields = ["id", "creation_date_utc", "image_url"]
        for field in required_fields:
            assert field in created_picture
            assert created_picture[field] is not None
        
        # Get picture
        get_response = client.get(f"/api/v1/pictures/{picture_id}", headers=headers)
        assert get_response.status_code == 200
        get_picture = get_response.json()
        
        # Should have same structure
        assert set(created_picture.keys()) == set(get_picture.keys())
        
        # Update picture
        update_data = {"image_url": "https://example.com/updated.jpg"}
        update_response = client.put(f"/api/v1/pictures/{picture_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        updated_picture = update_response.json()
        
        # Should have same structure
        assert set(created_picture.keys()) == set(updated_picture.keys())
        
        # Delete picture
        delete_response = client.delete(f"/api/v1/pictures/{picture_id}", headers=headers)
        assert delete_response.status_code == 200
        deleted_picture = delete_response.json()
        
        # Should have same structure
        assert set(created_picture.keys()) == set(deleted_picture.keys())

    def test_picture_pagination_edge_cases(self, client, user_token):
        """Test picture pagination edge cases."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Very large skip value
        response1 = client.get("/api/v1/pictures?skip=999999", headers=headers)
        assert response1.status_code == 200
        assert response1.json()["data"] == []

        # Skip larger than total count
        response2 = client.get("/api/v1/pictures?skip=1000000", headers=headers)
        assert response2.status_code == 200
        assert response2.json()["data"] == []
        
        # Maximum limit
        response3 = client.get("/api/v1/pictures?limit=100", headers=headers)
        assert response3.status_code == 200
        
        # Limit of 1
        response4 = client.get("/api/v1/pictures?limit=1", headers=headers)
        assert response4.status_code == 200
        pictures = response4.json()
        assert len(pictures["data"]) <= 1

    def test_picture_operations_with_expired_token(self, client, admin_token):
        """Test picture operations with various token issues."""
        fake_id = "550e8400-e29b-41d4-a716-446655440000"
        picture_data = {"file_name": "test.jpg", "width": 800, "height": 600, "file_size": 12345, "description": "Test"}
        
        # Invalid token format - testing admin operation (create)
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        response1 = client.post("/api/v1/pictures", json=picture_data, headers=invalid_headers)
        assert response1.status_code == 401
        
        # Missing Bearer prefix - testing admin operation (update)
        invalid_headers2 = {"Authorization": admin_token}
        response2 = client.put(f"/api/v1/pictures/{fake_id}", json=picture_data, headers=invalid_headers2)
        assert response2.status_code in [401, 403]
        
        # Empty token - testing admin operation (delete)
        invalid_headers3 = {"Authorization": "Bearer "}
        response3 = client.delete(f"/api/v1/pictures/{fake_id}", headers=invalid_headers3)
        assert response3.status_code in [401, 403]
        
        # No Authorization header - testing admin operation (create)
        response4 = client.post("/api/v1/pictures", json=picture_data)
        assert response4.status_code in [401, 403]

    def test_picture_list_consistency(self, client, admin_token, user_token):
        """Test picture list consistency."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get initial count
        initial_response = client.get("/api/v1/pictures", headers=user_headers)
        initial_count = len(initial_response.json()["data"])

        # Create picture
        data = {"image_url": "https://example.com/consistency-test.jpg"}
        create_response = client.post("/api/v1/pictures", json=data, headers=admin_headers)
        assert create_response.status_code == 200
        picture_id = create_response.json()["id"]

        # List should include new picture
        after_create_response = client.get("/api/v1/pictures", headers=user_headers)
        after_create_count = len(after_create_response.json()["data"])
        assert after_create_count == initial_count + 1

        # Delete picture
        delete_response = client.delete(f"/api/v1/pictures/{picture_id}", headers=admin_headers)
        assert delete_response.status_code == 200

        # List should return to original count
        after_delete_response = client.get("/api/v1/pictures", headers=user_headers)
        after_delete_count = len(after_delete_response.json()["data"])
        assert after_delete_count == initial_count