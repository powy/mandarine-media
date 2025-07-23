from typing import Dict, Any, Optional, List
from fastapi import UploadFile, HTTPException

# import magic
import mimetypes
from pathlib import Path

from .storage.base import BaseStorageBackend, MediaFileInfo, UploadResult
from .storage.local import LocalStorageBackend
from .storage.s3 import S3StorageBackend
from .storage.mux import MuxStorageBackend


class MediaUploadService:
    """Service for handling media file uploads with multiple storage backends."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.storage_backends: Dict[str, BaseStorageBackend] = {}
        self._initialize_backends()

    def _initialize_backends(self):
        """Initialize storage backends based on configuration."""

        # Initialize Local Storage
        if "local" in self.config.get("backends", {}):
            local_config = self.config["backends"]["local"]
            self.storage_backends["local"] = LocalStorageBackend(local_config)

        # Initialize S3 Storage
        if "s3" in self.config.get("backends", {}):
            s3_config = self.config["backends"]["s3"]
            self.storage_backends["s3"] = S3StorageBackend(s3_config)

        # Initialize Mux Storage
        if "mux" in self.config.get("backends", {}):
            mux_config = self.config["backends"]["mux"]
            self.storage_backends["mux"] = MuxStorageBackend(mux_config)

    def get_backend_for_media_type(self, media_type: str) -> str:
        """Get the appropriate storage backend for a media type."""

        # Get backend preference from config
        media_config = self.config.get("media_types", {}).get(media_type, {})
        preferred_backend = media_config.get("backend")

        if preferred_backend and preferred_backend in self.storage_backends:
            return preferred_backend

        # Fallback logic
        if media_type == "video":
            # Prefer Mux for video, fallback to S3, then local
            for backend in ["mux", "s3", "local"]:
                if backend in self.storage_backends:
                    return backend
        elif media_type == "webtoon":
            # Prefer S3 for images, fallback to local
            for backend in ["s3", "local"]:
                if backend in self.storage_backends:
                    return backend
        else:
            # Default fallback
            for backend in ["s3", "local"]:
                if backend in self.storage_backends:
                    return backend

        raise HTTPException(
            status_code=500,
            detail=f"No suitable storage backend available for media type: {media_type}",
        )

    async def detect_content_type(self, file: UploadFile) -> str:
        """Detect the content type of an uploaded file."""
        # First try the provided content type
        if file.content_type:
            return file.content_type

        # Try to detect from filename
        if file.filename:
            content_type, _ = mimetypes.guess_type(file.filename)
            if content_type:
                return content_type
        #  Fixme problem with Magic - see if really needed
        # # Try magic number detection
        # try:
        #     # Read first chunk to detect type
        #     chunk = await file.read(1024)
        #     await file.seek(0)  # Reset file pointer

        #     detected_type = magic.from_buffer(chunk, mime=True)
        #     if detected_type:
        #         return detected_type
        # except Exception:
        #     pass

        # Default fallback
        return "application/octet-stream"

    def validate_media_type(self, content_type: str, expected_media_type: str) -> bool:
        """Validate that the content type matches the expected media type."""

        if expected_media_type == "video":
            return content_type.startswith("video/")
        elif expected_media_type == "webtoon":
            return content_type.startswith("image/")
        elif expected_media_type in ["trailer", "teaser", "excerpt"]:
            return content_type.startswith("video/")

        return True  # Allow other types by default

    async def upload_single_file(
        self, file: UploadFile, media_type: str, custom_filename: Optional[str] = None
    ) -> UploadResult:
        """Upload a single file."""

        try:
            # Detect content type
            content_type = await self.detect_content_type(file)

            # Validate media type
            if not self.validate_media_type(content_type, media_type):
                return UploadResult(
                    success=False,
                    file_url="",
                    error_message=f"File type {content_type} not valid for media type {media_type}",
                )

            # Get file size
            await file.seek(0, 2)  # Seek to end
            file_size = await file.tell()
            await file.seek(0)  # Reset to beginning

            # Prepare file info
            filename = custom_filename or file.filename or "unnamed_file"
            file_info = MediaFileInfo(
                file=file,
                content_type=content_type,
                file_size=file_size,
                filename=filename,
                media_type=media_type,
            )

            # Get appropriate backend
            backend_name = self.get_backend_for_media_type(media_type)
            backend = self.storage_backends[backend_name]

            # Generate file path
            destination_path = backend.generate_file_path(file_info)

            # Upload file
            result = await backend.upload_file(file_info, destination_path)

            # Add backend info to metadata
            if result.success and result.metadata:
                result.metadata["selected_backend"] = backend_name

            return result

        except Exception as e:
            return UploadResult(
                success=False,
                file_url="",
                error_message=f"Upload service error: {str(e)}",
            )

    async def upload_multiple_files(
        self, files: List[UploadFile], media_type: str
    ) -> List[UploadResult]:
        """Upload multiple files (useful for webcomics)."""

        results = []
        for i, file in enumerate(files):
            custom_filename = (
                f"{i+1:03d}_{file.filename}" if file.filename else f"{i+1:03d}_file"
            )
            result = await self.upload_single_file(file, media_type, custom_filename)
            results.append(result)

        return results

    async def delete_file(
        self, file_url: str, backend_name: Optional[str] = None
    ) -> bool:
        """Delete a file from storage."""

        if backend_name and backend_name in self.storage_backends:
            return await self.storage_backends[backend_name].delete_file(file_url)

        # Try all backends if backend not specified
        for backend in self.storage_backends.values():
            try:
                if await backend.delete_file(file_url):
                    return True
            except Exception:
                continue

        return False

    def get_available_backends(self) -> List[str]:
        """Get list of available storage backends."""
        return list(self.storage_backends.keys())

    def get_backend_info(self, backend_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a storage backend."""

        if backend_name not in self.storage_backends:
            return None

        backend = self.storage_backends[backend_name]
        return {
            "name": backend_name,
            "class": backend.__class__.__name__,
            "max_file_size": backend.get_max_file_size(),
            "allowed_content_types": backend.get_allowed_content_types(),
            "config": {
                k: v
                for k, v in backend.config.items()
                if "secret" not in k.lower() and "password" not in k.lower()
            },
        }
