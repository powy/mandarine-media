import pytest
import tempfile
import os
from io import BytesIO
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import UploadFile


# Using fixtures from conftest.py


@pytest.fixture
def video_file():
    """Create a mock video file for testing."""
    # Create a temporary file that looks like a video
    content = b"fake video content for testing" * 1000  # Make it reasonably sized
    return {
        "filename": "test_video.mp4",
        "content": content,
        "content_type": "video/mp4"
    }


@pytest.fixture
def image_files():
    """Create mock image files for webcomic testing."""
    files = []
    for i in range(3):
        content = b"fake image content for testing" * 100
        files.append({
            "filename": f"page_{i+1}.jpg",
            "content": content,
            "content_type": "image/jpeg"
        })
    return files


@pytest.fixture
def mock_upload_service():
    """Mock the upload service to avoid actual file operations."""
    with patch('app.api.v1.endpoints.media_uploads.MediaUploadService') as mock_service:
        # Mock successful upload result
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        
        # Mock upload_single_file as async
        mock_upload_result = MagicMock()
        mock_upload_result.success = True
        mock_upload_result.file_url = "http://localhost:8000/files/test_file.mp4"
        mock_upload_result.file_size = 1000
        mock_upload_result.content_type = "video/mp4"
        mock_upload_result.metadata = {"selected_backend": "local"}
        mock_instance.upload_single_file = AsyncMock(return_value=mock_upload_result)
        
        # Mock upload_multiple_files as async
        mock_multiple_results = []
        for i in range(3):
            result = MagicMock()
            result.success = True
            result.file_url = f"http://localhost:8000/files/page_{i+1}.jpg"
            result.file_size = 500
            result.content_type = "image/jpeg"
            result.metadata = {"selected_backend": "local"}
            mock_multiple_results.append(result)
        mock_instance.upload_multiple_files = AsyncMock(return_value=mock_multiple_results)
        
        # Mock other methods
        mock_instance.get_available_backends.return_value = ["local"]
        mock_instance.get_backend_info.return_value = {
            "name": "local",
            "class": "LocalStorageBackend",
            "max_file_size": 100000000,
            "allowed_content_types": ["video/mp4", "image/jpeg"]
        }
        mock_instance.delete_file = AsyncMock(return_value=True)
        
        yield mock_instance


class TestVideoUpload:
    """Test video upload functionality."""
    
    def test_video_upload_success(self, client, admin_token, video_file, mock_upload_service):
        """Test successful video upload."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/upload/video",
            headers=headers,
            files={"file": (video_file["filename"], BytesIO(video_file["content"]), video_file["content_type"])},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "video_file_id" in data
        assert data["file_url"] == "http://localhost:8000/files/test_file.mp4"
        assert data["backend"] == "local"
        assert data["encoding_status"] == "pending"
    
    def test_video_upload_with_media_description(self, client, admin_token, video_file, mock_upload_service):
        """Test video upload with media description ID (simulated)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Use a fake UUID for testing (since we're mocking the upload service anyway)
        fake_media_id = "550e8400-e29b-41d4-a716-446655440000"
        
        response = client.post(
            "/api/v1/upload/video",
            headers=headers,
            files={"file": (video_file["filename"], BytesIO(video_file["content"]), video_file["content_type"])},
            data={"media_description_id": fake_media_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["linked_to_media"] is True
    
    def test_video_upload_unauthorized(self, client, video_file):
        """Test video upload without authentication."""
        response = client.post(
            "/api/v1/upload/video",
            files={"file": (video_file["filename"], BytesIO(video_file["content"]), video_file["content_type"])},
        )
        
        assert response.status_code == 401  # No user authenticated, so it's forbidden rather than 401
    
    def test_video_upload_non_admin(self, client, user_token, video_file):
        """Test video upload with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/upload/video",
            headers=headers,
            files={"file": (video_file["filename"], BytesIO(video_file["content"]), video_file["content_type"])},
        )
        
        assert response.status_code == 403
    
    def test_video_upload_no_file(self, client, admin_token):
        """Test video upload without file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/upload/video",
            headers=headers,
        )
        
        assert response.status_code == 422  # Validation error
    
    @patch('app.api.v1.endpoints.media_uploads.MediaUploadService')
    def test_video_upload_service_failure(self, mock_service_class, client, admin_token, video_file):
        """Test video upload when service fails."""
        # Mock service to return failure
        mock_instance = MagicMock()
        mock_service_class.return_value = mock_instance
        
        mock_upload_result = MagicMock()
        mock_upload_result.success = False
        mock_upload_result.error_message = "Storage backend unavailable"
        mock_instance.upload_single_file = AsyncMock(return_value=mock_upload_result)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/upload/video",
            headers=headers,
            files={"file": (video_file["filename"], BytesIO(video_file["content"]), video_file["content_type"])},
        )
        
        assert response.status_code == 400
        assert "Upload failed" in response.json()["detail"]


class TestWebcomicUpload:
    """Test webcomic upload functionality."""
    
    def test_webcomic_upload_success(self, client, admin_token, image_files, mock_upload_service):
        """Test successful webcomic upload."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        files_data = []
        for img in image_files:
            files_data.append(("files", (img["filename"], BytesIO(img["content"]), img["content_type"])))
        
        response = client.post(
            "/api/v1/upload/webcomic",
            headers=headers,
            files=files_data,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_pages"] == 3
        assert len(data["files"]) == 3
        assert data["backend"] == "local"
    
    def test_webcomic_upload_with_chapter(self, client, admin_token, image_files, mock_upload_service):
        """Test webcomic upload with chapter number."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        files_data = []
        for img in image_files:
            files_data.append(("files", (img["filename"], BytesIO(img["content"]), img["content_type"])))
        
        response = client.post(
            "/api/v1/upload/webcomic",
            headers=headers,
            files=files_data,
            data={"chapter_number": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["chapter_number"] == 5
    
    def test_webcomic_upload_no_files(self, client, admin_token):
        """Test webcomic upload without files."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/upload/webcomic",
            headers=headers,
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_webcomic_upload_unauthorized(self, client, image_files):
        """Test webcomic upload without authentication."""
        files_data = []
        for img in image_files:
            files_data.append(("files", (img["filename"], BytesIO(img["content"]), img["content_type"])))
        
        response = client.post(
            "/api/v1/upload/webcomic",
            files=files_data,
        )
        
        assert response.status_code == 401
    
    @patch('app.api.v1.endpoints.media_uploads.MediaUploadService')
    def test_webcomic_upload_partial_failure(self, mock_service_class, client, admin_token, image_files):
        """Test webcomic upload when some files fail."""
        # Mock service to return mixed results
        mock_instance = MagicMock()
        mock_service_class.return_value = mock_instance
        
        # First file succeeds, second fails, third succeeds
        mock_results = []
        for i, img in enumerate(image_files):
            result = MagicMock()
            if i == 1:  # Second file fails
                result.success = False
                result.error_message = "File too large"
            else:
                result.success = True
                result.file_url = f"http://localhost:8000/files/{img['filename']}"
                result.file_size = 500
            mock_results.append(result)
        
        mock_instance.upload_multiple_files = AsyncMock(return_value=mock_results)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        files_data = []
        for img in image_files:
            files_data.append(("files", (img["filename"], BytesIO(img["content"]), img["content_type"])))
        
        response = client.post(
            "/api/v1/upload/webcomic",
            headers=headers,
            files=files_data,
        )
        
        assert response.status_code == 400
        assert "Some uploads failed" in response.json()["detail"]


class TestBackendManagement:
    """Test backend management endpoints."""
    
    def test_get_backends_success(self, client, admin_token, mock_upload_service):
        """Test getting available backends."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/upload/backends",
            headers=headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "available_backends" in data
        assert "backend_details" in data
        assert "media_type_routing" in data
        assert "local" in data["available_backends"]
    
    def test_get_backends_unauthorized(self, client):
        """Test getting backends without authentication."""
        response = client.get("/api/v1/upload/backends")
        assert response.status_code == 401
    
    def test_get_backends_non_admin(self, client, user_token):
        """Test getting backends with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/upload/backends", headers=headers)
        assert response.status_code == 403
    
    def test_delete_file_success(self, client, admin_token, mock_upload_service):
        """Test successful file deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.delete(
            "/api/v1/upload/file",
            headers=headers,
            params={"file_url": "http://localhost:8000/files/test_file.mp4"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted successfully" in data["message"]
    
    @patch('app.api.v1.endpoints.media_uploads.MediaUploadService')
    def test_delete_file_not_found(self, mock_service_class, client, admin_token):
        """Test file deletion when file not found."""
        # Mock service to return failure
        mock_instance = MagicMock()
        mock_service_class.return_value = mock_instance
        mock_instance.delete_file = AsyncMock(return_value=False)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.delete(
            "/api/v1/upload/file",
            headers=headers,
            params={"file_url": "http://localhost:8000/files/nonexistent.mp4"}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_delete_file_unauthorized(self, client):
        """Test file deletion without authentication."""
        response = client.delete(
            "/api/v1/upload/file",
            params={"file_url": "http://localhost:8000/files/test_file.mp4"}
        )
        assert response.status_code == 401


class TestLegacyVideoUpload:
    """Test the existing video file upload endpoint."""
    
    def test_legacy_video_upload_success(self, client, admin_token, video_file, mock_upload_service):
        """Test successful upload via legacy endpoint."""
        # Mock the upload service in the video_files endpoint too
        with patch('app.api.v1.endpoints.video_files.MediaUploadService') as mock_service_class:
            mock_service_class.return_value = mock_upload_service
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            
            response = client.post(
                "/api/v1/video-files/upload",
                headers=headers,
                files={"file": (video_file["filename"], BytesIO(video_file["content"]), video_file["content_type"])},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "video_file_id" in data
    
    def test_legacy_video_upload_unauthorized(self, client, video_file):
        """Test legacy upload without authentication."""
        response = client.post(
            "/api/v1/video-files/upload",
            files={"file": (video_file["filename"], BytesIO(video_file["content"]), video_file["content_type"])},
        )
        
        assert response.status_code == 401