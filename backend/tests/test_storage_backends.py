import pytest
import tempfile
import os
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path
from io import BytesIO
from datetime import datetime, timezone
from fastapi import UploadFile

from app.services.storage.base import MediaFileInfo, UploadResult
from app.services.storage.local import LocalStorageBackend
from app.services.storage.s3 import S3StorageBackend
from app.services.storage.mux import MuxStorageBackend


class MockUploadFile:
    """Mock UploadFile for testing."""
    
    def __init__(self, filename: str, content: bytes, content_type: str):
        self.filename = filename
        self.content_type = content_type
        self._content = content
        self._position = 0
    
    async def read(self, size: int = -1) -> bytes:
        if size == -1:
            result = self._content[self._position:]
            self._position = len(self._content)
        else:
            end_pos = min(self._position + size, len(self._content))
            result = self._content[self._position:end_pos]
            self._position = end_pos
        return result
    
    async def seek(self, position: int, whence: int = 0) -> int:
        if whence == 0:  # SEEK_SET
            self._position = position
        elif whence == 1:  # SEEK_CUR
            self._position += position
        elif whence == 2:  # SEEK_END
            self._position = len(self._content) + position
        return self._position
    
    async def tell(self) -> int:
        return self._position


@pytest.fixture
def temp_upload_dir():
    """Create a temporary directory for upload testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def video_file_info():
    """Create a video file info for testing."""
    mock_file = MockUploadFile("test_video.mp4", b"fake video content", "video/mp4")
    return MediaFileInfo(
        file=mock_file,
        content_type="video/mp4",
        file_size=len(b"fake video content"),
        filename="test_video.mp4",
        media_type="video"
    )


@pytest.fixture
def image_file_info():
    """Create an image file info for testing."""
    mock_file = MockUploadFile("test_image.jpg", b"fake image content", "image/jpeg")
    return MediaFileInfo(
        file=mock_file,
        content_type="image/jpeg",
        file_size=len(b"fake image content"),
        filename="test_image.jpg",
        media_type="webtoon"
    )


class TestLocalStorageBackend:
    """Test local storage backend functionality."""
    
    def test_init(self, temp_upload_dir):
        """Test backend initialization."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        assert backend.storage_path == Path(temp_upload_dir)
        assert backend.base_url == "http://localhost:8000/files"
        assert backend.storage_path.exists()
    
    @pytest.mark.asyncio
    async def test_upload_video_success(self, temp_upload_dir, video_file_info):
        """Test successful video upload."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        destination_path = "video/2024/01/test_video.mp4"
        result = await backend.upload_file(video_file_info, destination_path)
        
        assert result.success is True
        assert result.file_url == "http://localhost:8000/files/video/2024/01/test_video.mp4"
        assert result.file_size == len(b"fake video content")
        assert result.content_type == "video/mp4"
        
        # Check file exists
        file_path = Path(temp_upload_dir) / destination_path
        assert file_path.exists()
        assert file_path.read_bytes() == b"fake video content"
    
    @pytest.mark.asyncio
    async def test_upload_image_success(self, temp_upload_dir, image_file_info):
        """Test successful image upload."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        destination_path = "webtoon/2024/01/test_image.jpg"
        result = await backend.upload_file(image_file_info, destination_path)
        
        assert result.success is True
        assert result.file_url == "http://localhost:8000/files/webtoon/2024/01/test_image.jpg"
        assert result.content_type == "image/jpeg"
    
    @pytest.mark.asyncio
    async def test_upload_invalid_content_type(self, temp_upload_dir):
        """Test upload with invalid content type."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files",
            "allowed_content_types": ["video/mp4", "image/jpeg"]
        }
        backend = LocalStorageBackend(config)
        
        # Create file with invalid content type
        mock_file = MockUploadFile("test.txt", b"text content", "text/plain")
        file_info = MediaFileInfo(
            file=mock_file,
            content_type="text/plain",
            file_size=12,
            filename="test.txt",
            media_type="video"
        )
        
        result = await backend.upload_file(file_info, "test.txt")
        
        assert result.success is False
        assert "not allowed" in result.error_message
    
    @pytest.mark.asyncio
    async def test_upload_file_too_large(self, temp_upload_dir):
        """Test upload with file too large."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files",
            "max_file_size": 10  # Very small limit
        }
        backend = LocalStorageBackend(config)
        
        # Create large file
        large_content = b"x" * 100
        mock_file = MockUploadFile("large.mp4", large_content, "video/mp4")
        file_info = MediaFileInfo(
            file=mock_file,
            content_type="video/mp4",
            file_size=100,
            filename="large.mp4",
            media_type="video"
        )
        
        result = await backend.upload_file(file_info, "large.mp4")
        
        assert result.success is False
        assert "exceeds maximum" in result.error_message
    
    @pytest.mark.asyncio
    async def test_delete_file_success(self, temp_upload_dir):
        """Test successful file deletion."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        # Create a file first
        test_file = Path(temp_upload_dir) / "test_file.mp4"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_bytes(b"test content")
        
        file_url = "http://localhost:8000/files/test_file.mp4"
        result = await backend.delete_file(file_url)
        
        assert result is True
        assert not test_file.exists()
    
    @pytest.mark.asyncio
    async def test_delete_file_not_found(self, temp_upload_dir):
        """Test file deletion when file doesn't exist."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        file_url = "http://localhost:8000/files/nonexistent.mp4"
        result = await backend.delete_file(file_url)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_file_info_success(self, temp_upload_dir):
        """Test getting file info."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        # Create a file first
        test_file = Path(temp_upload_dir) / "test_file.mp4"
        test_file.write_bytes(b"test content")
        
        file_url = "http://localhost:8000/files/test_file.mp4"
        info = await backend.get_file_info(file_url)
        
        assert info is not None
        assert info["size"] == 12
        assert info["exists"] is True
        assert "modified" in info
    
    def test_get_public_url(self, temp_upload_dir):
        """Test public URL generation."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        url = backend.get_public_url("video/test.mp4")
        assert url == "http://localhost:8000/files/video/test.mp4"
    
    def test_generate_file_path(self, temp_upload_dir, video_file_info):
        """Test file path generation."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        path = backend.generate_file_path(video_file_info)
        
        # Should contain media type, year, month, UUID, and filename
        assert path.startswith("video/")
        assert f"/{datetime.now(timezone.utc).year}/" in path  # Current year
        assert "test_video.mp4" in path
        # Should have UUID in the filename
        parts = path.split("/")
        filename = parts[-1]
        assert len(filename.split("_")[0]) == 36  # UUID length


class TestS3StorageBackend:
    """Test S3 storage backend functionality."""
    
    @pytest.fixture
    def s3_config(self):
        """S3 configuration for testing."""
        return {
            "bucket_name": "test-bucket",
            "region": "us-east-1",
            "access_key": "test-access-key",
            "secret_key": "test-secret-key",
            "acl": "private"
        }
    
    @patch('app.services.storage.s3.boto3.client')
    def test_init(self, mock_boto_client, s3_config):
        """Test S3 backend initialization."""
        backend = S3StorageBackend(s3_config)
        
        assert backend.bucket_name == "test-bucket"
        assert backend.region == "us-east-1"
        mock_boto_client.assert_called_once()
    
    @patch('app.services.storage.s3.boto3.client')
    @pytest.mark.asyncio
    async def test_upload_success(self, mock_boto_client, s3_config, video_file_info):
        """Test successful S3 upload."""
        # Mock S3 client
        mock_s3 = MagicMock()
        mock_boto_client.return_value = mock_s3
        
        backend = S3StorageBackend(s3_config)
        
        destination_path = "video/test.mp4"
        result = await backend.upload_file(video_file_info, destination_path)
        
        assert result.success is True
        assert result.file_url == "https://test-bucket.s3.us-east-1.amazonaws.com/video/test.mp4"
        assert result.content_type == "video/mp4"
        
        # Verify S3 client was called
        mock_s3.put_object.assert_called_once()
        call_args = mock_s3.put_object.call_args
        assert call_args[1]["Bucket"] == "test-bucket"
        assert call_args[1]["Key"] == "video/test.mp4"
        assert call_args[1]["ContentType"] == "video/mp4"
    
    @patch('app.services.storage.s3.boto3.client')
    @pytest.mark.asyncio
    async def test_upload_s3_error(self, mock_boto_client, s3_config, video_file_info):
        """Test S3 upload with AWS error."""
        from botocore.exceptions import ClientError
        
        # Mock S3 client to raise error
        mock_s3 = MagicMock()
        mock_s3.put_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchBucket", "Message": "Bucket does not exist"}},
            "PutObject"
        )
        mock_boto_client.return_value = mock_s3
        
        backend = S3StorageBackend(s3_config)
        
        result = await backend.upload_file(video_file_info, "video/test.mp4")
        
        assert result.success is False
        assert "S3 error" in result.error_message
    
    @patch('app.services.storage.s3.boto3.client')
    @pytest.mark.asyncio
    async def test_delete_file_success(self, mock_boto_client, s3_config):
        """Test successful S3 file deletion."""
        mock_s3 = MagicMock()
        mock_boto_client.return_value = mock_s3
        
        backend = S3StorageBackend(s3_config)
        
        file_url = "https://test-bucket.s3.us-east-1.amazonaws.com/video/test.mp4"
        result = await backend.delete_file(file_url)
        
        assert result is True
        mock_s3.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="video/test.mp4"
        )
    
    @patch('app.services.storage.s3.boto3.client')
    @pytest.mark.asyncio
    async def test_get_file_info_success(self, mock_boto_client, s3_config):
        """Test getting S3 file info."""
        mock_s3 = MagicMock()
        mock_s3.head_object.return_value = {
            "ContentLength": 1000,
            "ContentType": "video/mp4",
            "LastModified": "2024-01-01T00:00:00Z",
            "ETag": "abc123",
            "Metadata": {}
        }
        mock_boto_client.return_value = mock_s3
        
        backend = S3StorageBackend(s3_config)
        
        file_url = "https://test-bucket.s3.us-east-1.amazonaws.com/video/test.mp4"
        info = await backend.get_file_info(file_url)
        
        assert info is not None
        assert info["size"] == 1000
        assert info["content_type"] == "video/mp4"
        assert info["exists"] is True
    
    def test_get_public_url(self, s3_config):
        """Test S3 public URL generation."""
        with patch('app.services.storage.s3.boto3.client'):
            backend = S3StorageBackend(s3_config)
            
            url = backend.get_public_url("video/test.mp4")
            assert url == "https://test-bucket.s3.us-east-1.amazonaws.com/video/test.mp4"


class TestMuxStorageBackend:
    """Test Mux storage backend functionality."""
    
    @pytest.fixture
    def mux_config(self):
        """Mux configuration for testing."""
        return {
            "token_id": "test-token-id",
            "token_secret": "test-token-secret",
            "encoding_tier": "baseline"
        }
    
    @patch('app.services.storage.mux.mux_python.ApiClient')
    @patch('app.services.storage.mux.mux_python.AssetsApi')
    @patch('app.services.storage.mux.mux_python.DirectUploadsApi')
    def test_init(self, mock_uploads_api, mock_assets_api, mock_api_client, mux_config):
        """Test Mux backend initialization."""
        backend = MuxStorageBackend(mux_config)
        
        assert backend.token_id == "test-token-id"
        assert backend.token_secret == "test-token-secret"
        mock_api_client.assert_called_once()
    
    @patch('app.services.storage.mux.mux_python.ApiClient')
    @patch('app.services.storage.mux.mux_python.AssetsApi')
    @patch('app.services.storage.mux.mux_python.DirectUploadsApi')
    @pytest.mark.asyncio
    async def test_upload_success(self, mock_uploads_api_class, mock_assets_api_class, mock_api_client_class, mux_config, video_file_info):
        """Test successful Mux upload."""
        # Mock the upload response
        mock_upload = MagicMock()
        mock_upload.id = "upload-123"
        mock_upload.url = "https://storage.googleapis.com/mux-uploads/upload-123"
        
        mock_response = MagicMock()
        mock_response.data = mock_upload
        
        mock_uploads_api = MagicMock()
        mock_uploads_api.create_direct_upload.return_value = mock_response
        mock_uploads_api_class.return_value = mock_uploads_api
        
        # Mock the configuration setup
        mock_config = MagicMock()
        mock_api_client = MagicMock()
        mock_api_client_class.return_value = mock_api_client
        
        backend = MuxStorageBackend(mux_config)
        # Manually set the mocked API
        backend.direct_uploads_api = mock_uploads_api
        
        result = await backend.upload_file(video_file_info, "video/test.mp4")
        
        assert result.success is True
        assert result.file_url == "https://storage.googleapis.com/mux-uploads/upload-123"
        assert result.metadata["mux_upload_id"] == "upload-123"
        assert result.metadata["status"] == "uploading"
    
    @patch('app.services.storage.mux.mux_python.ApiClient')
    @patch('app.services.storage.mux.mux_python.AssetsApi')
    @patch('app.services.storage.mux.mux_python.DirectUploadsApi')
    @pytest.mark.asyncio
    async def test_upload_non_video_file(self, mock_uploads_api, mock_assets_api, mock_api_client, mux_config, image_file_info):
        """Test Mux upload with non-video file (should fail validation)."""
        backend = MuxStorageBackend(mux_config)
        
        result = await backend.upload_file(image_file_info, "image/test.jpg")
        
        assert result.success is False
        assert "not allowed" in result.error_message
    
    @patch('app.services.storage.mux.mux_python.ApiClient')
    @patch('app.services.storage.mux.mux_python.AssetsApi')
    @patch('app.services.storage.mux.mux_python.DirectUploadsApi')
    @pytest.mark.asyncio
    async def test_upload_mux_api_error(self, mock_uploads_api_class, mock_assets_api_class, mock_api_client_class, mux_config, video_file_info):
        """Test Mux upload with API error."""
        from mux_python.rest import ApiException
        
        # Mock API to raise error
        mock_uploads_api = MagicMock()
        mock_uploads_api.create_direct_upload.side_effect = ApiException("API Error")
        mock_uploads_api_class.return_value = mock_uploads_api
        
        backend = MuxStorageBackend(mux_config)
        # Manually set the mocked API
        backend.direct_uploads_api = mock_uploads_api
        
        result = await backend.upload_file(video_file_info, "video/test.mp4")
        
        assert result.success is False
        assert "Mux API error" in result.error_message
    
    def test_get_allowed_content_types(self, mux_config):
        """Test Mux allowed content types (video only)."""
        with patch('app.services.storage.mux.mux_python.ApiClient'):
            backend = MuxStorageBackend(mux_config)
            
            allowed_types = backend.get_allowed_content_types()
            assert "video/mp4" in allowed_types
            assert "image/jpeg" not in allowed_types
    
    def test_get_max_file_size(self, mux_config):
        """Test Mux max file size."""
        with patch('app.services.storage.mux.mux_python.ApiClient'):
            backend = MuxStorageBackend(mux_config)
            
            max_size = backend.get_max_file_size()
            assert max_size == 100 * 1024 * 1024 * 1024  # 100GB


class TestBaseStorageBackend:
    """Test base storage backend functionality."""
    
    def test_validate_file_success(self, temp_upload_dir, video_file_info):
        """Test successful file validation."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files"
        }
        backend = LocalStorageBackend(config)
        
        is_valid, error_msg = backend.validate_file(video_file_info)
        
        assert is_valid is True
        assert error_msg is None
    
    def test_validate_file_size_exceeded(self, temp_upload_dir):
        """Test file validation with size exceeded."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files",
            "max_file_size": 10  # Very small limit
        }
        backend = LocalStorageBackend(config)
        
        mock_file = MockUploadFile("large.mp4", b"x" * 100, "video/mp4")
        file_info = MediaFileInfo(
            file=mock_file,
            content_type="video/mp4",
            file_size=100,
            filename="large.mp4",
            media_type="video"
        )
        
        is_valid, error_msg = backend.validate_file(file_info)
        
        assert is_valid is False
        assert "exceeds maximum" in error_msg
    
    def test_validate_file_invalid_content_type(self, temp_upload_dir):
        """Test file validation with invalid content type."""
        config = {
            "storage_path": temp_upload_dir,
            "base_url": "http://localhost:8000/files",
            "allowed_content_types": ["video/mp4"]
        }
        backend = LocalStorageBackend(config)
        
        mock_file = MockUploadFile("doc.txt", b"text", "text/plain")
        file_info = MediaFileInfo(
            file=mock_file,
            content_type="text/plain",
            file_size=4,
            filename="doc.txt",
            media_type="video"
        )
        
        is_valid, error_msg = backend.validate_file(file_info)
        
        assert is_valid is False
        assert "not allowed" in error_msg