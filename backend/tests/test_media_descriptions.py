import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from fastapi import status

from app.schemas.media_description import MediaTypeEnum, ContentStatusEnum


@pytest.fixture
def sample_media_data():
    """Sample media description data for testing."""
    return {
        "file_number": 12345,
        "episode_title": "Test Episode",
        "media_type": "video",
        "file_name": "test_episode.mp4",
        "expected_filename": "test_episode.mp4",
        "episode_number": 1,
        "descriptive_summary_text": "This is a test episode",
        "synopsis_text": "Test synopsis",
        "production_year": 2025,
        "is_featured": False,
        "content_status": "published"
    }


@pytest.fixture
def sample_media_update_data():
    """Sample media description update data for testing."""
    return {
        "episode_title": "Updated Test Episode",
        "descriptive_summary_text": "This is an updated test episode",
        "duration_seconds": 7200,
        "is_featured": True
    }


class TestMediaDescriptionsList:
    """Test media descriptions list endpoint with filtering."""
    
    def test_list_media_descriptions_success(self, client, user_token):
        """Test successful retrieval of media descriptions list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/media-descriptions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
        assert "page" in data["pagination"]
        assert "limit" in data["pagination"]
        assert "total" in data["pagination"]
        assert "total_pages" in data["pagination"]
    
    def test_list_media_descriptions_with_pagination(self, client, user_token):
        """Test media descriptions list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions",
            headers=headers,
            params={"skip": 10, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 3  # (skip 10 / limit 5) + 1
        assert data["pagination"]["limit"] == 5
    
    def test_list_media_descriptions_with_filters(self, client, user_token):
        """Test media descriptions list with filtering."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions",
            headers=headers,
            params={
                "media_type": "video",
                "status": "published",
                "is_featured": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
    
    def test_list_media_descriptions_invalid_pagination(self, client, user_token):
        """Test media descriptions list with invalid pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Test negative skip
        response = client.get(
            "/api/v1/media-descriptions",
            headers=headers,
            params={"skip": -1}
        )
        assert response.status_code == 422
        
        # Test limit too high
        response = client.get(
            "/api/v1/media-descriptions",
            headers=headers,
            params={"limit": 101}
        )
        assert response.status_code == 422
        
        # Test limit too low
        response = client.get(
            "/api/v1/media-descriptions",
            headers=headers,
            params={"limit": 0}
        )
        assert response.status_code == 422
    
    def test_list_media_descriptions_unauthenticated(self, client):
        """Test media descriptions list without authentication (now allowed)."""
        response = client.get("/api/v1/media-descriptions")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)


class TestMediaDescriptionCreate:
    """Test media description creation endpoint."""
    
    def test_create_media_description_success(self, client, admin_token, sample_media_data):
        """Test successful media description creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_number"] == sample_media_data["file_number"]
        assert data["episode_title"] == sample_media_data["episode_title"]
        assert data["media_type"] == sample_media_data["media_type"]
        assert "id" in data
        assert "creation_date_utc" in data
    
    def test_create_media_description_duplicate_file_number(self, client, admin_token, sample_media_data):
        """Test creation with duplicate file number."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First creation should succeed
        response1 = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert response1.status_code == 200
        
        # Second creation with same file_number should fail
        response2 = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]
    
    def test_create_media_description_invalid_data(self, client, admin_token):
        """Test creation with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Missing required fields
        invalid_data = {
            "episode_title": "Test Episode"
            # Missing file_number and media_type
        }
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_media_description_invalid_media_type(self, client, admin_token, sample_media_data):
        """Test creation with invalid media type."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = sample_media_data.copy()
        invalid_data["media_type"] = "invalid_type"
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_media_description_invalid_status(self, client, admin_token, sample_media_data):
        """Test creation with invalid content status."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = sample_media_data.copy()
        invalid_data["content_status"] = "invalid_status"
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_media_description_unauthorized(self, client, sample_media_data):
        """Test creation without authentication."""
        response = client.post(
            "/api/v1/media-descriptions",
            json=sample_media_data
        )
        assert response.status_code == 401
    
    def test_create_media_description_non_admin(self, client, user_token, sample_media_data):
        """Test creation with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert response.status_code == 403


class TestMediaDescriptionRead:
    """Test media description read endpoint."""
    
    def test_read_media_description_success(self, client, user_token, admin_token, sample_media_data):
        """Test successful media description retrieval."""
        # First create a media description
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=admin_headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        
        # Then read it
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(
            f"/api/v1/media-descriptions/{media_id}",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == media_id
        assert data["file_number"] == sample_media_data["file_number"]
        assert data["episode_title"] == sample_media_data["episode_title"]
    
    def test_read_media_description_admin_no_view_increment(self, client, admin_token, sample_media_data):
        """Test that admin users don't increment view count."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        initial_view_count = create_response.json()["view_count"]
        
        # Read as admin (should not increment view count)
        response = client.get(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.json()["view_count"] == initial_view_count
    
    def test_read_media_description_not_found(self, client, user_token):
        """Test reading non-existent media description."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/media-descriptions/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_read_media_description_invalid_uuid(self, client, user_token):
        """Test reading with invalid UUID format."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_read_media_description_unauthenticated(self, client):
        """Test reading without authentication (now allowed)."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/media-descriptions/{fake_id}")
        # Should get 404 (not found) instead of 401 (unauthorized) since auth is optional
        assert response.status_code == 404
    
    def test_read_media_description_unauthenticated_view_increment(self, client, admin_token, sample_media_data):
        """Test that unauthenticated users increment view count."""
        # Create media description as admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=admin_headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        initial_view_count = create_response.json()["view_count"]
        
        # Read as unauthenticated user (should increment view count)
        response = client.get(f"/api/v1/media-descriptions/{media_id}")
        
        assert response.status_code == 200
        # Note: We need to check the view count via another request since it's incremented in the database
        # Let's check by reading again as admin (admin reads don't increment)
        admin_read_response = client.get(
            f"/api/v1/media-descriptions/{media_id}",
            headers=admin_headers
        )
        assert admin_read_response.status_code == 200
        assert admin_read_response.json()["view_count"] == initial_view_count + 1


class TestMediaDescriptionUpdate:
    """Test media description update endpoint."""
    
    def test_update_media_description_success(self, client, admin_token, sample_media_data, sample_media_update_data):
        """Test successful media description update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        
        # Update it
        response = client.put(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers,
            json=sample_media_update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["episode_title"] == sample_media_update_data["episode_title"]
        assert data["descriptive_summary_text"] == sample_media_update_data["descriptive_summary_text"]
        assert data["duration_seconds"] == sample_media_update_data["duration_seconds"]
        assert data["is_featured"] == sample_media_update_data["is_featured"]
        assert "last_updated_utc" in data
    
    def test_update_media_description_partial_update(self, client, admin_token, sample_media_data):
        """Test partial update of media description."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        original_title = create_response.json()["episode_title"]
        
        # Update only one field
        partial_update = {"is_featured": True}
        response = client.put(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers,
            json=partial_update
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_featured"] == True
        assert data["episode_title"] == original_title  # Should remain unchanged
    
    def test_update_media_description_duplicate_file_number(self, client, admin_token, sample_media_data):
        """Test update with duplicate file number."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first media description
        media1_data = sample_media_data.copy()
        media1_data["file_number"] = 11111
        create_response1 = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=media1_data
        )
        assert create_response1.status_code == 200
        
        # Create second media description
        media2_data = sample_media_data.copy()
        media2_data["file_number"] = 22222
        create_response2 = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=media2_data
        )
        assert create_response2.status_code == 200
        media2_id = create_response2.json()["id"]
        
        # Try to update second media with first media's file_number
        update_data = {"file_number": 11111}
        response = client.put(
            f"/api/v1/media-descriptions/{media2_id}",
            headers=headers,
            json=update_data
        )
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]
    
    def test_update_media_description_not_found(self, client, admin_token, sample_media_update_data):
        """Test updating non-existent media description."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/media-descriptions/{fake_id}",
            headers=headers,
            json=sample_media_update_data
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_update_media_description_invalid_data(self, client, admin_token, sample_media_data):
        """Test update with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        
        # Try to update with invalid media type
        invalid_update = {"media_type": "invalid_type"}
        response = client.put(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers,
            json=invalid_update
        )
        
        assert response.status_code == 422
    
    def test_update_media_description_unauthorized(self, client, sample_media_update_data):
        """Test update without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/media-descriptions/{fake_id}",
            json=sample_media_update_data
        )
        assert response.status_code == 401
    
    def test_update_media_description_non_admin(self, client, user_token, sample_media_update_data):
        """Test update with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/media-descriptions/{fake_id}",
            headers=headers,
            json=sample_media_update_data
        )
        assert response.status_code == 403


class TestMediaDescriptionDelete:
    """Test media description delete endpoint."""
    
    def test_delete_media_description_success(self, client, admin_token, sample_media_data):
        """Test successful media description deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == media_id
        
        # Verify it's deleted by trying to read it
        read_response = client.get(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers
        )
        assert read_response.status_code == 404
    
    def test_delete_media_description_not_found(self, client, admin_token):
        """Test deleting non-existent media description."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(
            f"/api/v1/media-descriptions/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_delete_media_description_invalid_uuid(self, client, admin_token):
        """Test deleting with invalid UUID format."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.delete(
            "/api/v1/media-descriptions/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_delete_media_description_unauthorized(self, client):
        """Test deletion without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.delete(f"/api/v1/media-descriptions/{fake_id}")
        assert response.status_code == 401
    
    def test_delete_media_description_non_admin(self, client, user_token):
        """Test deletion with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(
            f"/api/v1/media-descriptions/{fake_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestFeaturedMedia:
    """Test featured media endpoints."""
    
    def test_get_featured_media_success(self, client, user_token):
        """Test successful retrieval of featured media."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions/featured/list",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_featured_media_with_pagination(self, client, user_token):
        """Test featured media with pagination."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions/featured/list",
            headers=headers,
            params={"skip": 0, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_get_featured_media_invalid_pagination(self, client, user_token):
        """Test featured media with invalid pagination."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions/featured/list",
            headers=headers,
            params={"skip": -1}
        )
        assert response.status_code == 422
    
    def test_get_featured_media_unauthenticated(self, client):
        """Test featured media without authentication (now allowed)."""
        response = client.get("/api/v1/media-descriptions/featured/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTrendingMedia:
    """Test trending media endpoints."""
    
    def test_get_trending_media_success(self, client, user_token):
        """Test successful retrieval of trending media."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions/trending/list",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_trending_media_with_pagination(self, client, user_token):
        """Test trending media with pagination."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/media-descriptions/trending/list",
            headers=headers,
            params={"skip": 0, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10
    
    def test_get_trending_media_unauthenticated(self, client):
        """Test trending media without authentication (now allowed)."""
        response = client.get("/api/v1/media-descriptions/trending/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestMediaInteractions:
    """Test media interaction endpoints (like, share)."""
    
    def test_like_media_description_success(self, client, user_token, admin_token, sample_media_data):
        """Test successful media like action."""
        # Create media description first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=admin_headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        initial_like_count = create_response.json()["like_count"]
        
        # Like the media
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.post(
            f"/api/v1/media-descriptions/{media_id}/like",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["like_count"] == initial_like_count + 1
    
    def test_like_media_description_not_found(self, client, user_token):
        """Test liking non-existent media description."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/media-descriptions/{fake_id}/like",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_like_media_description_unauthorized(self, client):
        """Test liking without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.post(f"/api/v1/media-descriptions/{fake_id}/like")
        assert response.status_code == 401
    
    def test_share_media_description_success(self, client, user_token, admin_token, sample_media_data):
        """Test successful media share action."""
        # Create media description first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=admin_headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        initial_share_count = create_response.json()["share_count"]
        
        # Share the media
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.post(
            f"/api/v1/media-descriptions/{media_id}/share",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["share_count"] == initial_share_count + 1
    
    def test_share_media_description_not_found(self, client, user_token):
        """Test sharing non-existent media description."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/media-descriptions/{fake_id}/share",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_share_media_description_unauthorized(self, client):
        """Test sharing without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.post(f"/api/v1/media-descriptions/{fake_id}/share")
        assert response.status_code == 401


class TestMediaDescriptionEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_create_media_with_future_dates(self, client, admin_token, sample_media_data):
        """Test creating media with future contract dates."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Set future dates
        future_date = datetime.now() + timedelta(days=365)
        data_with_dates = sample_media_data.copy()
        data_with_dates["contract_start_date_utc"] = future_date.isoformat()
        data_with_dates["contract_end_date_utc"] = (future_date + timedelta(days=365)).isoformat()
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=data_with_dates
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["contract_start_date_utc"] is not None
        assert data["contract_end_date_utc"] is not None
    
    def test_create_media_with_long_text_fields(self, client, admin_token, sample_media_data):
        """Test creating media with very long text fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        long_text = "A" * 10000  # Very long text
        data_with_long_text = sample_media_data.copy()
        data_with_long_text["descriptive_summary_text"] = long_text
        data_with_long_text["synopsis_text"] = long_text
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=data_with_long_text
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["descriptive_summary_text"]) == 10000
    
    def test_create_media_with_negative_values(self, client, admin_token, sample_media_data):
        """Test creating media with negative values."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        data_with_negatives = sample_media_data.copy()
        data_with_negatives["duration_seconds"] = -100
        data_with_negatives["production_year"] = -2025
        data_with_negatives["episode_number"] = -1
        
        response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=data_with_negatives
        )
        
        # Should accept negative values as they might be valid in some contexts
        assert response.status_code == 200
    
    def test_update_media_same_file_number(self, client, admin_token, sample_media_data):
        """Test updating media with the same file number (should succeed)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        media_id = create_response.json()["id"]
        original_file_number = create_response.json()["file_number"]
        
        # Update with same file number should succeed
        update_data = {
            "file_number": original_file_number,
            "episode_title": "Updated Title"
        }
        response = client.put(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_number"] == original_file_number
        assert data["episode_title"] == "Updated Title"


class TestBulkMediaDescriptions:
    """Test bulk media descriptions creation endpoint."""
    
    def test_create_bulk_media_descriptions_success(self, client, admin_token):
        """Test successful bulk creation of media descriptions."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        bulk_data = {
            "descriptions": [
                {
                    "file_number": 10001,
                    "episode_title": "Bulk Episode 1",
                    "media_type": "video",
                    "expected_filename": "bulk_episode_1.mp4",
                    "content_status": "draft"
                },
                {
                    "file_number": 10002,
                    "episode_title": "Bulk Episode 2",
                    "media_type": "video",
                    "expected_filename": "bulk_episode_2.mp4",
                    "content_status": "draft"
                },
                {
                    "file_number": 10003,
                    "episode_title": "Bulk Episode 3",
                    "media_type": "video",
                    "content_status": "draft"
                }
            ]
        }
        
        response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 3
        assert data["failed_count"] == 0
        assert data["batch_id"] is not None
        assert len(data["reports"]) == 3
        
        # Check that all reports were created
        for report in data["reports"]:
            assert "description_id" in report
            assert "title" in report
            assert "success_associated_file" in report
            assert "timestamp" in report
    
    def test_create_bulk_media_descriptions_with_duplicates(self, client, admin_token, sample_media_data):
        """Test bulk creation with duplicate file numbers."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create one media description first
        create_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_data
        )
        assert create_response.status_code == 200
        existing_file_number = sample_media_data["file_number"]
        
        # Try to create bulk with duplicate file number
        bulk_data = {
            "descriptions": [
                {
                    "file_number": existing_file_number,  # This already exists
                    "episode_title": "Duplicate Episode",
                    "media_type": "video",
                    "content_status": "draft"
                },
                {
                    "file_number": 20002,
                    "episode_title": "Valid Episode",
                    "media_type": "video",
                    "content_status": "draft"
                }
            ]
        }
        
        response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        
        assert response.status_code == 409
        assert "already exist" in response.json()["detail"]
    
    def test_create_bulk_media_descriptions_duplicate_in_request(self, client, admin_token):
        """Test bulk creation with duplicate file numbers within the request."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        bulk_data = {
            "descriptions": [
                {
                    "file_number": 30001,
                    "episode_title": "Episode 1",
                    "media_type": "video",
                    "content_status": "draft"
                },
                {
                    "file_number": 30001,  # Duplicate within request
                    "episode_title": "Episode 2",
                    "media_type": "video",
                    "content_status": "draft"
                }
            ]
        }
        
        response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        
        assert response.status_code == 400
        assert "Duplicate file_numbers" in response.json()["detail"]
    
    def test_create_bulk_media_descriptions_empty_list(self, client, admin_token):
        """Test bulk creation with empty descriptions list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        bulk_data = {"descriptions": []}
        
        response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 0
        assert data["failed_count"] == 0
        assert len(data["reports"]) == 0
    
    def test_create_bulk_media_descriptions_unauthorized(self, client):
        """Test bulk creation without authentication."""
        bulk_data = {
            "descriptions": [
                {
                    "file_number": 40001,
                    "episode_title": "Unauthorized Episode",
                    "media_type": "video",
                    "content_status": "draft"
                }
            ]
        }
        
        response = client.post(
            "/api/v1/media-descriptions/bulk",
            json=bulk_data
        )
        assert response.status_code == 401
    
    def test_create_bulk_media_descriptions_non_admin(self, client, user_token):
        """Test bulk creation with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        bulk_data = {
            "descriptions": [
                {
                    "file_number": 50001,
                    "episode_title": "Non-admin Episode",
                    "media_type": "video",
                    "content_status": "draft"
                }
            ]
        }
        
        response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        assert response.status_code == 403
    
    def test_create_bulk_media_descriptions_invalid_data(self, client, admin_token):
        """Test bulk creation with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        bulk_data = {
            "descriptions": [
                {
                    # Missing required file_number
                    "episode_title": "Invalid Episode",
                    "media_type": "video",
                    "content_status": "draft"
                }
            ]
        }
        
        response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        
        assert response.status_code == 422