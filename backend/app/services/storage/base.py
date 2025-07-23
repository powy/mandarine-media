from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from fastapi import UploadFile
import mimetypes


@dataclass
class UploadResult:
    """Result of a file upload operation."""
    success: bool
    file_url: str
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


@dataclass
class MediaFileInfo:
    """Information about a media file to be uploaded."""
    file: UploadFile
    content_type: str
    file_size: int
    filename: str
    media_type: str  # video, webtoon, etc.


class BaseStorageBackend(ABC):
    """Abstract base class for storage backends."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.backend_name = self.__class__.__name__
    
    @abstractmethod
    async def upload_file(self, file_info: MediaFileInfo, destination_path: str) -> UploadResult:
        """Upload a file to the storage backend."""
        pass
    
    @abstractmethod
    async def delete_file(self, file_url: str) -> bool:
        """Delete a file from the storage backend."""
        pass
    
    @abstractmethod
    async def get_file_info(self, file_url: str) -> Optional[Dict[str, Any]]:
        """Get information about a file in storage."""
        pass
    
    @abstractmethod
    def get_public_url(self, file_path: str) -> str:
        """Get the public URL for a file."""
        pass
    
    def validate_file(self, file_info: MediaFileInfo) -> tuple[bool, Optional[str]]:
        """Validate if a file is acceptable for this storage backend."""
        # Basic validation that can be overridden
        if file_info.file_size > self.get_max_file_size():
            return False, f"File size {file_info.file_size} exceeds maximum {self.get_max_file_size()}"
        
        allowed_types = self.get_allowed_content_types()
        if allowed_types and file_info.content_type not in allowed_types:
            return False, f"Content type {file_info.content_type} not allowed"
        
        return True, None
    
    def get_max_file_size(self) -> int:
        """Get maximum file size in bytes."""
        return self.config.get('max_file_size', 100 * 1024 * 1024 * 1024)  # 100GB default
    
    def get_allowed_content_types(self) -> Optional[List[str]]:
        """Get allowed content types for this backend."""
        return self.config.get('allowed_content_types')
    
    def generate_file_path(self, file_info: MediaFileInfo) -> str:
        """Generate a storage path for the file."""
        import uuid
        from datetime import datetime
        
        # Create a path structure: media_type/year/month/uuid_filename
        now = datetime.utcnow()
        file_id = str(uuid.uuid4())
        
        # Clean filename
        safe_filename = "".join(c for c in file_info.filename if c.isalnum() or c in ".-_")
        
        return f"{file_info.media_type}/{now.year}/{now.month:02d}/{file_id}_{safe_filename}"