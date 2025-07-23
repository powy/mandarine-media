import os
import aiofiles
from pathlib import Path
from typing import Optional, Dict, Any
from .base import BaseStorageBackend, UploadResult, MediaFileInfo


class LocalStorageBackend(BaseStorageBackend):
    """Local filesystem storage backend."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.storage_path = Path(config.get('storage_path', './uploads'))
        self.base_url = config.get('base_url', 'http://localhost:8000/files')
        
        # Create storage directory if it doesn't exist
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    async def upload_file(self, file_info: MediaFileInfo, destination_path: str) -> UploadResult:
        """Upload a file to local storage."""
        try:
            # Validate file
            is_valid, error_msg = self.validate_file(file_info)
            if not is_valid:
                return UploadResult(
                    success=False,
                    file_url="",
                    error_message=error_msg
                )
            
            # Determine full file path
            full_path = self.storage_path / destination_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Read and write file
            content = await file_info.file.read()
            
            async with aiofiles.open(full_path, 'wb') as f:
                await f.write(content)
            
            # Generate public URL
            file_url = self.get_public_url(destination_path)
            
            return UploadResult(
                success=True,
                file_url=file_url,
                file_size=len(content),
                content_type=file_info.content_type,
                metadata={
                    'local_path': str(full_path),
                    'backend': self.backend_name
                }
            )
            
        except Exception as e:
            return UploadResult(
                success=False,
                file_url="",
                error_message=f"Local storage error: {str(e)}"
            )
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete a file from local storage."""
        try:
            # Convert URL back to local path
            relative_path = file_url.replace(self.base_url + '/', '')
            full_path = self.storage_path / relative_path
            
            if full_path.exists():
                full_path.unlink()
                return True
            return False
            
        except Exception:
            return False
    
    async def get_file_info(self, file_url: str) -> Optional[Dict[str, Any]]:
        """Get information about a file in local storage."""
        try:
            relative_path = file_url.replace(self.base_url + '/', '')
            full_path = self.storage_path / relative_path
            
            if not full_path.exists():
                return None
            
            stat = full_path.stat()
            return {
                'size': stat.st_size,
                'modified': stat.st_mtime,
                'path': str(full_path),
                'exists': True
            }
            
        except Exception:
            return None
    
    def get_public_url(self, file_path: str) -> str:
        """Get the public URL for a file."""
        return f"{self.base_url}/{file_path}"
    
    def get_allowed_content_types(self) -> Optional[list[str]]:
        """Get allowed content types for local storage."""
        return [
            # Video types
            'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm',
            # Image types for webcomics
            'image/jpeg', 'image/png', 'image/gif', 'image/webp'
        ]