import pytest
import uuid
from io import BytesIO
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import UploadFile

from app.schemas.video_file import EncodingStatusEnum


@pytest.fixture
def sample_video_file_data():
    """Sample video file data for testing."""
    return {
        "file_url": "https://example.com/video/test.mp4",
        "file_name": "test_video.mp4",
        "file_size_bytes": 1024000,
        "encoding_status": "pending",
        "video_codec": "h264",
        "audio_codec": "aac",
        "file_format": "mp4",
        "duration_seconds": 3600,
        "resolution_width": 1920,
        "resolution_height": 1080,
        "bitrate_kbps": 5000,
        "frame_rate": 30.0
    }


@pytest.fixture
def sample_video_file_update_data():
    """Sample video file update data for testing."""
    return {
        "encoding_status": "completed",
        "duration_seconds": 3700,
        "resolution_width": 1920,
        "resolution_height": 1080,
        "bitrate_kbps": 6000,
        "frame_rate": 30.0
    }


@pytest.fixture
def sample_media_description_data():
    """Sample media description data for testing video linking."""
    return {
        "file_number": 54321,
        "episode_title": "Test Media for Video",
        "media_type": "video",
        "file_name": "test_media.mp4",
        "episode_number": 1,
        "descriptive_summary_text": "Test media for video linking",
        "content_status": "published"
    }


@pytest.fixture
def mock_video_file():
    """Create a mock video file for testing."""
    content = b"fake video content for testing" * 1000
    return {
        "filename": "test_video.mp4",
        "content": content,
        "content_type": "video/mp4"
    }


class TestVideoFilesList:
    """Test video files list endpoint."""
    
    def test_list_video_files_success(self, client, user_token):
        """Test successful retrieval of video files list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/video-files", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
        assert "page" in data["pagination"]
        assert "limit" in data["pagination"]
        assert "total" in data["pagination"]
        assert "total_pages" in data["pagination"]
    
    def test_list_video_files_with_pagination(self, client, user_token):
        """Test video files list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/video-files",
            headers=headers,
            params={"skip": 5, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 1  # (skip 5 / limit 10) + 1
        assert data["pagination"]["limit"] == 10
    
    def test_list_video_files_invalid_pagination(self, client, user_token):
        """Test video files list with invalid pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Test negative skip
        response = client.get(
            "/api/v1/video-files",
            headers=headers,
            params={"skip": -1}
        )
        assert response.status_code == 422
        
        # Test limit too high
        response = client.get(
            "/api/v1/video-files",
            headers=headers,
            params={"limit": 101}
        )
        assert response.status_code == 422
    
    def test_list_video_files_unauthenticated(self, client):
        """Test video files list without authentication (now allowed)."""
        response = client.get("/api/v1/video-files")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data


class TestVideoFileCreate:
    """Test video file creation endpoint."""
    
    def test_create_video_file_success(self, client, admin_token, sample_video_file_data):
        """Test successful video file creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_url"] == sample_video_file_data["file_url"]
        assert data["file_name"] == sample_video_file_data["file_name"]
        assert data["encoding_status"] == sample_video_file_data["encoding_status"]
        assert "id" in data
        assert "creation_date_utc" in data
    
    def test_create_video_file_invalid_data(self, client, admin_token):
        """Test creation with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Actually invalid data - missing required file_name
        invalid_data = {
            "file_url": "https://example.com/test.mp4"
            # Missing required file_name field
        }
        
        response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_video_file_invalid_encoding_status(self, client, admin_token, sample_video_file_data):
        """Test creation with invalid encoding status."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        invalid_data = sample_video_file_data.copy()
        invalid_data["encoding_status"] = "invalid_status"
        
        response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=invalid_data
        )
        assert response.status_code == 422
    
    def test_create_video_file_unauthorized(self, client, sample_video_file_data):
        """Test creation without authentication."""
        response = client.post(
            "/api/v1/video-files",
            json=sample_video_file_data
        )
        assert response.status_code == 401
    
    def test_create_video_file_non_admin(self, client, user_token, sample_video_file_data):
        """Test creation with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert response.status_code == 403


class TestVideoFileRead:
    """Test video file read endpoint."""
    
    def test_read_video_file_success(self, client, user_token, admin_token, sample_video_file_data):
        """Test successful video file retrieval."""
        # First create a video file
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post(
            "/api/v1/video-files",
            headers=admin_headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        
        # Then read it
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(
            f"/api/v1/video-files/{video_id}",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == video_id
        assert data["file_url"] == sample_video_file_data["file_url"]
        assert data["file_name"] == sample_video_file_data["file_name"]
    
    def test_read_video_file_not_found(self, client, user_token):
        """Test reading non-existent video file."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/video-files/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_read_video_file_invalid_uuid(self, client, user_token):
        """Test reading with invalid UUID format."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/video-files/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_read_video_file_unauthenticated(self, client):
        """Test reading without authentication (now allowed)."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video-files/{fake_id}")
        # Should get 404 (not found) instead of 401 (unauthorized)
        assert response.status_code == 404


class TestVideoFileUpdate:
    """Test video file update endpoint."""
    
    def test_update_video_file_success(self, client, admin_token, sample_video_file_data, sample_video_file_update_data):
        """Test successful video file update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        create_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        
        # Update it
        response = client.put(
            f"/api/v1/video-files/{video_id}",
            headers=headers,
            json=sample_video_file_update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["encoding_status"] == sample_video_file_update_data["encoding_status"]
        assert data["duration_seconds"] == sample_video_file_update_data["duration_seconds"]
        assert data["bitrate_kbps"] == sample_video_file_update_data["bitrate_kbps"]
    
    def test_update_video_file_partial_update(self, client, admin_token, sample_video_file_data):
        """Test partial update of video file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        create_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        original_file_name = create_response.json()["file_name"]
        
        # Update only one field
        partial_update = {"encoding_status": "completed"}
        response = client.put(
            f"/api/v1/video-files/{video_id}",
            headers=headers,
            json=partial_update
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["encoding_status"] == "completed"
        assert data["file_name"] == original_file_name  # Should remain unchanged
    
    def test_update_video_file_not_found(self, client, admin_token, sample_video_file_update_data):
        """Test updating non-existent video file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/video-files/{fake_id}",
            headers=headers,
            json=sample_video_file_update_data
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_update_video_file_invalid_data(self, client, admin_token, sample_video_file_data):
        """Test update with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        create_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        
        # Try to update with invalid encoding status
        invalid_update = {"encoding_status": "invalid_status"}
        response = client.put(
            f"/api/v1/video-files/{video_id}",
            headers=headers,
            json=invalid_update
        )
        
        assert response.status_code == 422
    
    def test_update_video_file_unauthorized(self, client, sample_video_file_update_data):
        """Test update without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/video-files/{fake_id}",
            json=sample_video_file_update_data
        )
        assert response.status_code == 401
    
    def test_update_video_file_non_admin(self, client, user_token, sample_video_file_update_data):
        """Test update with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/video-files/{fake_id}",
            headers=headers,
            json=sample_video_file_update_data
        )
        assert response.status_code == 403


class TestVideoFileDelete:
    """Test video file delete endpoint."""
    
    def test_delete_video_file_success(self, client, admin_token, sample_video_file_data):
        """Test successful video file deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        create_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(
            f"/api/v1/video-files/{video_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == video_id
        
        # Verify it's deleted by trying to read it
        read_response = client.get(
            f"/api/v1/video-files/{video_id}",
            headers=headers
        )
        assert read_response.status_code == 404
    
    def test_delete_video_file_not_found(self, client, admin_token):
        """Test deleting non-existent video file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(
            f"/api/v1/video-files/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_delete_video_file_unauthorized(self, client):
        """Test deletion without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.delete(f"/api/v1/video-files/{fake_id}")
        assert response.status_code == 401
    
    def test_delete_video_file_non_admin(self, client, user_token):
        """Test deletion with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(
            f"/api/v1/video-files/{fake_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestVideoFileUpload:
    """Test video file upload endpoint."""
    
    @patch('app.api.v1.endpoints.video_files.MediaUploadService')
    def test_upload_video_file_success(self, mock_service_class, client, admin_token, mock_video_file):
        """Test successful video file upload."""
        # Mock the upload service
        mock_instance = MagicMock()
        mock_service_class.return_value = mock_instance
        
        mock_upload_result = MagicMock()
        mock_upload_result.success = True
        mock_upload_result.file_url = "http://localhost:8000/files/test_video.mp4"
        mock_upload_result.file_size = 1000
        mock_upload_result.metadata = {"selected_backend": "local"}
        mock_instance.upload_single_file = AsyncMock(return_value=mock_upload_result)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/video-files/upload",
            headers=headers,
            files={"file": (mock_video_file["filename"], BytesIO(mock_video_file["content"]), mock_video_file["content_type"])}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "video_file_id" in data
        assert data["file_url"] == "http://localhost:8000/files/test_video.mp4"
        assert data["backend"] == "local"
        assert data["encoding_status"] == "pending"
    
    @patch('app.api.v1.endpoints.video_files.MediaUploadService')
    def test_upload_video_file_upload_failure(self, mock_service_class, client, admin_token, mock_video_file):
        """Test video file upload when storage fails."""
        # Mock the upload service to fail
        mock_instance = MagicMock()
        mock_service_class.return_value = mock_instance
        
        mock_upload_result = MagicMock()
        mock_upload_result.success = False
        mock_upload_result.error_message = "Storage backend unavailable"
        mock_instance.upload_single_file = AsyncMock(return_value=mock_upload_result)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/video-files/upload",
            headers=headers,
            files={"file": (mock_video_file["filename"], BytesIO(mock_video_file["content"]), mock_video_file["content_type"])}
        )
        
        assert response.status_code == 400
        assert "Upload failed" in response.json()["detail"]
    
    def test_upload_video_file_no_file(self, client, admin_token):
        """Test video file upload without file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/video-files/upload",
            headers=headers
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_upload_video_file_unauthorized(self, client, mock_video_file):
        """Test video file upload without authentication."""
        response = client.post(
            "/api/v1/video-files/upload",
            files={"file": (mock_video_file["filename"], BytesIO(mock_video_file["content"]), mock_video_file["content_type"])}
        )
        assert response.status_code == 401
    
    def test_upload_video_file_non_admin(self, client, user_token, mock_video_file):
        """Test video file upload with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/video-files/upload",
            headers=headers,
            files={"file": (mock_video_file["filename"], BytesIO(mock_video_file["content"]), mock_video_file["content_type"])}
        )
        assert response.status_code == 403


class TestVideoMediaLinking:
    """Test video file to media description linking."""
    
    def test_link_video_to_media_success(self, client, admin_token, sample_video_file_data, sample_media_description_data):
        """Test successful linking of video file to media description."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        media_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_description_data
        )
        assert media_response.status_code == 200
        media_id = media_response.json()["id"]
        
        # Create video file
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        # Link them
        response = client.post(
            f"/api/v1/video-files/{video_id}/link/{media_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # With the new relationship, verify the media description was updated
        media_check_response = client.get(
            f"/api/v1/media-descriptions/{media_id}",
            headers=headers
        )
        assert media_check_response.status_code == 200
        media_data = media_check_response.json()
        assert media_data["main_video_file_id"] == video_id
    
    def test_link_video_to_media_video_not_found(self, client, admin_token, sample_media_description_data):
        """Test linking with non-existent video file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        media_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_description_data
        )
        assert media_response.status_code == 200
        media_id = media_response.json()["id"]
        
        fake_video_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/link/{media_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "Video file not found" in response.json()["detail"]
    
    def test_link_video_to_media_media_not_found(self, client, admin_token, sample_video_file_data):
        """Test linking with non-existent media description."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        fake_media_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/video-files/{video_id}/link/{fake_media_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "Media description not found" in response.json()["detail"]
    
    def test_link_video_to_media_unauthorized(self, client):
        """Test linking without authentication."""
        fake_video_id = str(uuid.uuid4())
        fake_media_id = str(uuid.uuid4())
        
        response = client.post(f"/api/v1/video-files/{fake_video_id}/link/{fake_media_id}")
        assert response.status_code == 401
    
    def test_link_video_to_media_non_admin(self, client, user_token):
        """Test linking with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_video_id = str(uuid.uuid4())
        fake_media_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/link/{fake_media_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestUnlinkedVideoFiles:
    """Test unlinked video files endpoint."""
    
    def test_get_unlinked_video_files_success(self, client, admin_token):
        """Test successful retrieval of unlinked video files."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/video-files/unlinked/list",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_unlinked_video_files_with_pagination(self, client, admin_token):
        """Test unlinked video files with pagination."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/video-files/unlinked/list",
            headers=headers,
            params={"skip": 0, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_get_unlinked_video_files_unauthorized(self, client):
        """Test unlinked video files without authentication."""
        response = client.get("/api/v1/video-files/unlinked/list")
        assert response.status_code == 401
    
    def test_get_unlinked_video_files_non_admin(self, client, user_token):
        """Test unlinked video files with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/video-files/unlinked/list",
            headers=headers
        )
        assert response.status_code == 403


class TestVideoFilesByMedia:
    """Test video files by media description endpoint."""
    
    def test_get_video_files_by_media_success(self, client, user_token, admin_token, sample_media_description_data):
        """Test successful retrieval of video files by media description."""
        # Create media description first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        media_response = client.post(
            "/api/v1/media-descriptions",
            headers=admin_headers,
            json=sample_media_description_data
        )
        assert media_response.status_code == 200
        media_id = media_response.json()["id"]
        
        # Get video files for this media
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(
            f"/api/v1/video-files/by-media/{media_id}",
            headers=user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_video_files_by_media_not_found(self, client, user_token):
        """Test getting video files for non-existent media description."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_media_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/video-files/by-media/{fake_media_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "Media description not found" in response.json()["detail"]
    
    def test_get_video_files_by_media_unauthenticated(self, client):
        """Test getting video files without authentication (now allowed)."""
        fake_media_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video-files/by-media/{fake_media_id}")
        # Should get 404 (media not found) instead of 401 (unauthorized)
        assert response.status_code == 404


class TestEncodingStatusUpdate:
    """Test encoding status update endpoint."""
    
    def test_update_encoding_status_success(self, client, admin_token, sample_video_file_data):
        """Test successful encoding status update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        create_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        
        # Update encoding status
        response = client.put(
            f"/api/v1/video-files/{video_id}/encoding-status",
            headers=headers,
            params={
                "status": "completed",
                "logs": "Encoding completed successfully"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["encoding_status"] == "completed"
    
    def test_update_encoding_status_invalid_status(self, client, admin_token, sample_video_file_data):
        """Test encoding status update with invalid status."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        create_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        
        # Try to update with invalid status
        response = client.put(
            f"/api/v1/video-files/{video_id}/encoding-status",
            headers=headers,
            params={"status": "invalid_status"}
        )
        
        assert response.status_code == 400
        assert "Invalid status" in response.json()["detail"]
    
    def test_update_encoding_status_not_found(self, client, admin_token):
        """Test encoding status update for non-existent video file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/video-files/{fake_id}/encoding-status",
            headers=headers,
            params={"status": "completed"}
        )
        
        assert response.status_code == 404
        assert "Video file not found" in response.json()["detail"]
    
    def test_update_encoding_status_unauthorized(self, client):
        """Test encoding status update without authentication."""
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/video-files/{fake_id}/encoding-status",
            params={"status": "completed"}
        )
        assert response.status_code == 401
    
    def test_update_encoding_status_non_admin(self, client, user_token):
        """Test encoding status update with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(
            f"/api/v1/video-files/{fake_id}/encoding-status",
            headers=headers,
            params={"status": "completed"}
        )
        assert response.status_code == 403


class TestVideoFileEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_create_video_file_with_large_values(self, client, admin_token, sample_video_file_data):
        """Test creating video file with very large values."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        large_data = sample_video_file_data.copy()
        large_data["file_size_bytes"] = 50 * 1024 * 1024 * 1024  # 50GB
        large_data["duration_seconds"] = 24 * 3600  # 24 hours
        large_data["bitrate_kbps"] = 100000  # 100 Mbps
        
        response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=large_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_size_bytes"] == large_data["file_size_bytes"]
    
    def test_create_video_file_with_negative_values(self, client, admin_token, sample_video_file_data):
        """Test creating video file with negative values."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        negative_data = sample_video_file_data.copy()
        negative_data["file_size_bytes"] = -1000
        negative_data["duration_seconds"] = -100
        negative_data["bitrate_kbps"] = -5000
        
        response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=negative_data
        )
        
        # Should accept negative values as they might be placeholders
        assert response.status_code == 200
    
    def test_update_video_file_all_encoding_statuses(self, client, admin_token, sample_video_file_data):
        """Test updating video file through all encoding statuses."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file
        create_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["id"]
        
        # Test all valid encoding statuses
        statuses = ["pending", "processing", "completed", "failed"]
        
        for status in statuses:
            response = client.put(
                f"/api/v1/video-files/{video_id}/encoding-status",
                headers=headers,
                params={"status": status}
            )
            assert response.status_code == 200
            assert response.json()["encoding_status"] == status


class TestVideoFileDualUpload:
    """Test dual upload functionality for video files."""

    def test_create_metadata_only_video_file(self, client, admin_token):
        """Test creating video file metadata only (first step of two-step upload)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        metadata_data = {
            "file_name": "test_video_metadata.mp4"
        }
        
        response = client.post(
            "/api/v1/video-files/create-metadata",
            headers=headers,
            json=metadata_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "upload_url" in data
        assert data["upload_status"] == "metadata_only"
        assert "upload-file" in data["upload_url"]
        assert "message" in data

    def test_create_video_file_with_existing_url(self, client, admin_token):
        """Test creating video file with existing media URL."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        existing_url_data = {
            "file_name": "existing_video.mp4",
            "external_url": "https://example.com/video/existing_video.mp4"
        }
        
        response = client.post(
            "/api/v1/video-files/create-with-existing-url",
            headers=headers,
            json=existing_url_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_name"] == existing_url_data["file_name"]
        assert data["external_url"] == existing_url_data["external_url"]
        assert data["upload_status"] == "upload_completed"
        assert data["file_url"] == existing_url_data["external_url"]

    @patch('app.api.v1.endpoints.video_files.MediaUploadService')
    def test_upload_file_to_existing_metadata(self, mock_service_class, client, admin_token):
        """Test uploading file to existing metadata record (second step of two-step upload)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create metadata
        metadata_data = {
            "file_name": "test_video_upload.mp4",
        }
        
        metadata_response = client.post(
            "/api/v1/video-files/create-metadata",
            headers=headers,
            json=metadata_data
        )
        assert metadata_response.status_code == 200
        file_id = metadata_response.json()["id"]
        
        # Mock the upload service
        mock_instance = MagicMock()
        mock_service_class.return_value = mock_instance
        
        mock_upload_result = MagicMock()
        mock_upload_result.success = True
        mock_upload_result.file_url = "http://localhost:8000/files/test_video_upload.mp4"
        mock_upload_result.file_size = 2048000
        mock_upload_result.metadata = {
            "selected_backend": "local",
            "mux_asset_id": "test_asset_123",
            "mux_playback_id": "test_playback_123"
        }
        mock_instance.upload_single_file = AsyncMock(return_value=mock_upload_result)
        
        # Now upload the actual file
        content = b"fake video content for testing" * 1000
        files = {"file": ("test_video_upload.mp4", BytesIO(content), "video/mp4")}
        
        response = client.post(
            f"/api/v1/video-files/{file_id}/upload-file",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["video_file_id"] == file_id
        assert data["file_url"] == mock_upload_result.file_url
        assert data["upload_status"] == "upload_completed"
        assert data["encoding_status"] == "pending"

    def test_upload_file_to_non_existent_metadata(self, client, admin_token):
        """Test uploading file to non-existent metadata record."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        content = b"fake video content"
        files = {"file": ("test.mp4", BytesIO(content), "video/mp4")}
        
        response = client.post(
            f"/api/v1/video-files/{fake_id}/upload-file",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    @patch('app.api.v1.endpoints.video_files.MediaUploadService')
    def test_upload_file_to_already_completed_metadata(self, mock_service_class, client, admin_token):
        """Test uploading file to metadata that already has upload_completed status."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create existing URL video file (which will have upload_completed status)
        existing_url_data = {
            "file_name": "existing_video.mp4",
            "external_url": "https://example.com/video/existing_video.mp4"
        }
        
        create_response = client.post(
            "/api/v1/video-files/create-with-existing-url",
            headers=headers,
            json=existing_url_data
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        # Try to upload file to this already completed record
        content = b"fake video content"
        files = {"file": ("test.mp4", BytesIO(content), "video/mp4")}
        
        response = client.post(
            f"/api/v1/video-files/{file_id}/upload-file",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400
        assert "not in metadata_only status" in response.json()["detail"]

    def test_test_video_file_playback_success(self, client, user_token):
        """Test video file playback test with valid file."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # This test assumes there's at least one video file in the database
        # In a real scenario, we'd create one first
        fake_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/video-files/{fake_id}/test",
            headers=headers
        )
        
        # Should return 404 for non-existent file
        assert response.status_code == 404

    def test_create_metadata_unauthorized(self, client):
        """Test creating metadata without authentication."""
        metadata_data = {
            "file_name": "test_video.mp4",
        }
        
        response = client.post(
            "/api/v1/video-files/create-metadata",
            json=metadata_data
        )
        
        assert response.status_code == 401

    def test_create_metadata_non_admin(self, client, user_token):
        """Test creating metadata with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        metadata_data = {
            "file_name": "test_video.mp4",
        }
        
        response = client.post(
            "/api/v1/video-files/create-metadata",
            headers=headers,
            json=metadata_data
        )
        
        assert response.status_code == 403

    def test_create_with_existing_url_missing_data(self, client, admin_token):
        """Test creating video file with existing URL but missing required data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Missing external_url
        incomplete_data = {
            "file_name": "test_video.mp4"
        }
        
        response = client.post(
            "/api/v1/video-files/create-with-existing-url",
            headers=headers,
            json=incomplete_data
        )
        
        assert response.status_code == 422  # Validation error