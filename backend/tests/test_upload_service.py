import pytest
import tempfile
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path
from io import BytesIO
from fastapi import UploadFile, HTTPException

from app.services.upload_service import MediaUploadService
from app.services.storage.base import MediaFileInfo, UploadResult
from app.services.storage.local import LocalStorageBackend


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
def local_only_config(temp_upload_dir):
    """Configuration with only local backend."""
    return {
        "backends": {
            "local": {
                "storage_path": temp_upload_dir,
                "base_url": "http://localhost:8000/files",
                "max_file_size": 100 * 1024 * 1024,  # 100MB
            }
        },
        "media_types": {
            "video": {"backend": "local"},
            "webtoon": {"backend": "local"},
            "trailer": {"backend": "local"},
            "teaser": {"backend": "local"},
            "excerpt": {"backend": "local"},
        }
    }


@pytest.fixture
def multi_backend_config(temp_upload_dir):
    """Configuration with multiple backends."""
    return {
        "backends": {
            "local": {
                "storage_path": temp_upload_dir,
                "base_url": "http://localhost:8000/files",
                "max_file_size": 100 * 1024 * 1024,
            },
            "s3": {
                "bucket_name": "test-bucket",
                "region": "us-east-1",
                "access_key": "test-key",
                "secret_key": "test-secret",
                "max_file_size": 5 * 1024 * 1024 * 1024,  # 5GB
            },
            "mux": {
                "token_id": "test-token",
                "token_secret": "test-secret",
                "encoding_tier": "baseline",
                "max_file_size": 10 * 1024 * 1024 * 1024,  # 10GB
            }
        },
        "media_types": {
            "video": {"backend": "mux"},
            "webtoon": {"backend": "s3"},
            "trailer": {"backend": "mux"},
            "teaser": {"backend": "local"},
            "excerpt": {"backend": "local"},
        }
    }


@pytest.fixture
def video_file():
    """Create a mock video file."""
    return MockUploadFile("test_video.mp4", b"fake video content" * 100, "video/mp4")


@pytest.fixture
def image_files():
    """Create mock image files."""
    files = []
    for i in range(3):
        content = b"fake image content" * 50
        files.append(MockUploadFile(f"page_{i+1}.jpg", content, "image/jpeg"))
    return files


class TestUploadServiceInitialization:
    """Test upload service initialization."""
    
    def test_init_local_only(self, local_only_config):
        """Test initialization with local backend only."""
        service = MediaUploadService(local_only_config)
        
        assert len(service.storage_backends) == 1
        assert "local" in service.storage_backends
        assert isinstance(service.storage_backends["local"], LocalStorageBackend)
    
    @patch('app.services.upload_service.S3StorageBackend')
    @patch('app.services.upload_service.MuxStorageBackend')
    def test_init_multi_backend(self, mock_mux, mock_s3, multi_backend_config):
        """Test initialization with multiple backends."""
        service = MediaUploadService(multi_backend_config)
        
        assert len(service.storage_backends) == 3
        assert "local" in service.storage_backends
        assert "s3" in service.storage_backends
        assert "mux" in service.storage_backends
    
    def test_get_available_backends(self, local_only_config):
        """Test getting available backends."""
        service = MediaUploadService(local_only_config)
        
        backends = service.get_available_backends()
        assert backends == ["local"]
    
    def test_get_backend_info(self, local_only_config):
        """Test getting backend information."""
        service = MediaUploadService(local_only_config)
        
        info = service.get_backend_info("local")
        assert info is not None
        assert info["name"] == "local"
        assert info["class"] == "LocalStorageBackend"
        assert "max_file_size" in info
        assert "allowed_content_types" in info
    
    def test_get_backend_info_nonexistent(self, local_only_config):
        """Test getting info for nonexistent backend."""
        service = MediaUploadService(local_only_config)
        
        info = service.get_backend_info("nonexistent")
        assert info is None


class TestBackendSelection:
    """Test backend selection logic."""
    
    @patch('app.services.upload_service.S3StorageBackend')
    @patch('app.services.upload_service.MuxStorageBackend')
    def test_get_backend_for_video(self, mock_mux, mock_s3, multi_backend_config):
        """Test backend selection for video media type."""
        service = MediaUploadService(multi_backend_config)
        
        backend = service.get_backend_for_media_type("video")
        assert backend == "mux"
    
    @patch('app.services.upload_service.S3StorageBackend')
    @patch('app.services.upload_service.MuxStorageBackend')
    def test_get_backend_for_webcomic(self, mock_mux, mock_s3, multi_backend_config):
        """Test backend selection for webcomic media type."""
        service = MediaUploadService(multi_backend_config)
        
        backend = service.get_backend_for_media_type("webtoon")
        assert backend == "s3"
    
    def test_get_backend_fallback_logic(self, local_only_config):
        """Test backend fallback when preferred backend not available."""
        service = MediaUploadService(local_only_config)
        
        # Should fall back to local for video
        backend = service.get_backend_for_media_type("video")
        assert backend == "local"
        
        # Should fall back to local for webcomic
        backend = service.get_backend_for_media_type("webtoon")
        assert backend == "local"
    
    def test_get_backend_no_suitable_backend(self):
        """Test error when no suitable backend available."""
        empty_config = {
            "backends": {},
            "media_types": {
                "video": {"backend": "mux"}
            }
        }
        service = MediaUploadService(empty_config)
        
        with pytest.raises(HTTPException) as exc_info:
            service.get_backend_for_media_type("video")
        
        assert exc_info.value.status_code == 500
        assert "No suitable storage backend" in str(exc_info.value.detail)


class TestContentTypeDetection:
    """Test content type detection."""
    
    @pytest.mark.asyncio
    async def test_detect_content_type_from_file(self, local_only_config):
        """Test content type detection from file object."""
        service = MediaUploadService(local_only_config)
        
        file = MockUploadFile("test.mp4", b"content", "video/mp4")
        content_type = await service.detect_content_type(file)
        
        assert content_type == "video/mp4"
    
    @pytest.mark.asyncio
    async def test_detect_content_type_from_filename(self, local_only_config):
        """Test content type detection from filename when file.content_type is None."""
        service = MediaUploadService(local_only_config)
        
        file = MockUploadFile("test.jpg", b"content", None)
        content_type = await service.detect_content_type(file)
        
        assert content_type == "image/jpeg"
    
    @pytest.mark.asyncio
    async def test_detect_content_type_fallback(self, local_only_config):
        """Test content type detection fallback."""
        service = MediaUploadService(local_only_config)
        
        file = MockUploadFile("unknown", b"content", None)
        
        # Without magic detection, should fall back to mimetypes
        content_type = await service.detect_content_type(file)
        
        assert content_type == "application/octet-stream"


class TestMediaTypeValidation:
    """Test media type validation."""
    
    def test_validate_video_type(self, local_only_config):
        """Test validation for video media type."""
        service = MediaUploadService(local_only_config)
        
        assert service.validate_media_type("video/mp4", "video") is True
        assert service.validate_media_type("video/avi", "video") is True
        assert service.validate_media_type("image/jpeg", "video") is False
        assert service.validate_media_type("text/plain", "video") is False
    
    def test_validate_webcomic_type(self, local_only_config):
        """Test validation for webcomic media type."""
        service = MediaUploadService(local_only_config)
        
        assert service.validate_media_type("image/jpeg", "webtoon") is True
        assert service.validate_media_type("image/png", "webtoon") is True
        assert service.validate_media_type("video/mp4", "webtoon") is False
        assert service.validate_media_type("text/plain", "webtoon") is False
    
    def test_validate_trailer_type(self, local_only_config):
        """Test validation for trailer media type (should be video)."""
        service = MediaUploadService(local_only_config)
        
        assert service.validate_media_type("video/mp4", "trailer") is True
        assert service.validate_media_type("image/jpeg", "trailer") is False


class TestSingleFileUpload:
    """Test single file upload functionality."""
    
    @pytest.mark.asyncio
    async def test_upload_single_file_success(self, local_only_config, video_file):
        """Test successful single file upload."""
        service = MediaUploadService(local_only_config)
        
        result = await service.upload_single_file(video_file, "video")
        
        assert result.success is True
        assert result.file_url.startswith("http://localhost:8000/files/video/")
        assert result.content_type == "video/mp4"
        assert result.metadata["selected_backend"] == "local"
    
    @pytest.mark.asyncio
    async def test_upload_single_file_invalid_type(self, local_only_config):
        """Test single file upload with invalid content type."""
        service = MediaUploadService(local_only_config)
        
        # Upload image as video (should fail validation)
        image_file = MockUploadFile("image.jpg", b"content", "image/jpeg")
        result = await service.upload_single_file(image_file, "video")
        
        assert result.success is False
        assert "not valid for media type" in result.error_message
    
    @pytest.mark.asyncio
    async def test_upload_single_file_with_custom_filename(self, local_only_config, video_file):
        """Test single file upload with custom filename."""
        service = MediaUploadService(local_only_config)
        
        result = await service.upload_single_file(video_file, "video", "custom_name.mp4")
        
        assert result.success is True
        assert "custom_name.mp4" in result.file_url
    
    @pytest.mark.asyncio
    async def test_upload_single_file_backend_error(self, local_only_config, video_file):
        """Test single file upload when backend fails."""
        service = MediaUploadService(local_only_config)
        
        # Mock backend to fail
        with patch.object(service.storage_backends["local"], "upload_file") as mock_upload:
            mock_upload.return_value = UploadResult(
                success=False,
                file_url="",
                error_message="Backend error"
            )
            
            result = await service.upload_single_file(video_file, "video")
            
            assert result.success is False
            assert "Backend error" in result.error_message


class TestMultipleFileUpload:
    """Test multiple file upload functionality."""
    
    @pytest.mark.asyncio
    async def test_upload_multiple_files_success(self, local_only_config, image_files):
        """Test successful multiple file upload."""
        service = MediaUploadService(local_only_config)
        
        results = await service.upload_multiple_files(image_files, "webtoon")
        
        assert len(results) == 3
        for i, result in enumerate(results):
            assert result.success is True
            assert f"00{i+1}_page_{i+1}.jpg" in result.file_url
            assert result.content_type == "image/jpeg"
    
    @pytest.mark.asyncio
    async def test_upload_multiple_files_empty_list(self, local_only_config):
        """Test multiple file upload with empty list."""
        service = MediaUploadService(local_only_config)
        
        results = await service.upload_multiple_files([], "webtoon")
        
        assert len(results) == 0
    
    @pytest.mark.asyncio
    async def test_upload_multiple_files_mixed_results(self, local_only_config, image_files):
        """Test multiple file upload with mixed success/failure."""
        service = MediaUploadService(local_only_config)
        
        # Mock backend to fail on second file
        original_upload = service.storage_backends["local"].upload_file
        
        async def mock_upload(file_info, destination_path):
            if "002_" in destination_path:  # Second file
                return UploadResult(
                    success=False,
                    file_url="",
                    error_message="File too large"
                )
            else:
                return await original_upload(file_info, destination_path)
        
        with patch.object(service.storage_backends["local"], "upload_file", side_effect=mock_upload):
            results = await service.upload_multiple_files(image_files, "webtoon")
        
        assert len(results) == 3
        assert results[0].success is True
        assert results[1].success is False
        assert results[2].success is True


class TestFileDeletion:
    """Test file deletion functionality."""
    
    @pytest.mark.asyncio
    async def test_delete_file_with_backend(self, local_only_config, temp_upload_dir):
        """Test file deletion with specified backend."""
        service = MediaUploadService(local_only_config)
        
        # Create a test file
        test_file = Path(temp_upload_dir) / "test.mp4"
        test_file.write_bytes(b"test content")
        
        file_url = "http://localhost:8000/files/test.mp4"
        result = await service.delete_file(file_url, "local")
        
        assert result is True
        assert not test_file.exists()
    
    @pytest.mark.asyncio
    async def test_delete_file_without_backend(self, local_only_config, temp_upload_dir):
        """Test file deletion without specifying backend (try all)."""
        service = MediaUploadService(local_only_config)
        
        # Create a test file
        test_file = Path(temp_upload_dir) / "test.mp4"
        test_file.write_bytes(b"test content")
        
        file_url = "http://localhost:8000/files/test.mp4"
        result = await service.delete_file(file_url)
        
        assert result is True
        assert not test_file.exists()
    
    @pytest.mark.asyncio
    async def test_delete_file_not_found(self, local_only_config):
        """Test file deletion when file doesn't exist."""
        service = MediaUploadService(local_only_config)
        
        file_url = "http://localhost:8000/files/nonexistent.mp4"
        result = await service.delete_file(file_url)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_delete_file_backend_error(self, local_only_config):
        """Test file deletion when backend throws error."""
        service = MediaUploadService(local_only_config)
        
        # Mock backend to throw error
        with patch.object(service.storage_backends["local"], "delete_file", side_effect=Exception("Backend error")):
            file_url = "http://localhost:8000/files/test.mp4"
            result = await service.delete_file(file_url)
            
            assert result is False


class TestErrorHandling:
    """Test error handling scenarios."""
    
    @pytest.mark.asyncio
    async def test_upload_service_exception(self, local_only_config, video_file):
        """Test upload service handling unexpected exceptions."""
        service = MediaUploadService(local_only_config)
        
        # Mock file operations to raise exception
        with patch.object(video_file, 'seek', side_effect=Exception("File error")):
            result = await service.upload_single_file(video_file, "video")
            
            assert result.success is False
            assert "Upload service error" in result.error_message
    
    def test_invalid_media_type_backend_selection(self, local_only_config):
        """Test backend selection with invalid media type."""
        service = MediaUploadService(local_only_config)
        
        # Should fall back to default logic
        backend = service.get_backend_for_media_type("unknown_type")
        assert backend == "local"  # Should fall back to available backend
    
    @pytest.mark.asyncio
    async def test_content_type_detection_with_seek_error(self, local_only_config):
        """Test content type detection when file seek fails."""
        service = MediaUploadService(local_only_config)
        
        file = MockUploadFile("test.mp4", b"content", "video/mp4")
        
        # Mock seek to fail during magic detection
        with patch.object(file, 'seek', side_effect=Exception("Seek error")):
            content_type = await service.detect_content_type(file)
            
            # Should still return the file's content_type
            assert content_type == "video/mp4"