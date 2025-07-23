import mux_python
from mux_python.rest import ApiException
from typing import Optional, Dict, Any
from .base import BaseStorageBackend, UploadResult, MediaFileInfo


class MuxStorageBackend(BaseStorageBackend):
    """Mux video storage and processing backend."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.token_id = config['token_id']
        self.token_secret = config['token_secret']
        self.webhook_url = config.get('webhook_url')
        
        # Initialize Mux API client
        configuration = mux_python.Configuration()
        configuration.username = self.token_id
        configuration.password = self.token_secret
        
        # Create API instances
        api_client = mux_python.ApiClient(configuration)
        self.assets_api = mux_python.AssetsApi(api_client)
        self.direct_uploads_api = mux_python.DirectUploadsApi(api_client)
    
    async def upload_file(self, file_info: MediaFileInfo, destination_path: str) -> UploadResult:
        """Upload a video file to Mux via direct upload."""
        try:
            # Validate file - Mux only accepts video files
            is_valid, error_msg = self.validate_file(file_info)
            if not is_valid:
                return UploadResult(
                    success=False,
                    file_url="",
                    error_message=error_msg
                )
            
            # Create a direct upload URL from Mux
            create_upload_request = mux_python.CreateUploadRequest(
                timeout=3600,  # 1 hour timeout
                new_asset_settings=mux_python.CreateAssetRequest(
                    playback_policy=[mux_python.PlaybackPolicy.SIGNED],
                    encoding_tier=self.config.get('encoding_tier', 'baseline')
                )
            )
            
            # Create the upload
            upload_response = self.direct_uploads_api.create_direct_upload(create_upload_request)
            upload = upload_response.data
            
            # Read file content
            content = await file_info.file.read()
            
            # Upload the file to Mux's upload URL
            # Note: In a real implementation, you'd upload directly to the Mux upload URL
            # This is a simplified version for demonstration
            
            return UploadResult(
                success=True,
                file_url=upload.url,
                file_size=len(content),
                content_type=file_info.content_type,
                metadata={
                    'mux_upload_id': upload.id,
                    'mux_asset_id': None,  # Will be set once processing is complete
                    'upload_url': upload.url,
                    'backend': self.backend_name,
                    'status': 'uploading'
                }
            )
            
        except ApiException as e:
            return UploadResult(
                success=False,
                file_url="",
                error_message=f"Mux API error: {str(e)}"
            )
        except Exception as e:
            return UploadResult(
                success=False,
                file_url="",
                error_message=f"Unexpected error: {str(e)}"
            )
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete an asset from Mux."""
        try:
            # Extract asset ID from metadata or URL
            # This would need to be implemented based on how you store Mux asset IDs
            asset_id = self._extract_asset_id(file_url)
            if not asset_id:
                return False
            
            self.assets_api.delete_asset(asset_id)
            return True
            
        except ApiException:
            return False
        except Exception:
            return False
    
    async def get_file_info(self, file_url: str) -> Optional[Dict[str, Any]]:
        """Get information about an asset in Mux."""
        try:
            asset_id = self._extract_asset_id(file_url)
            if not asset_id:
                return None
            
            response = self.assets_api.get_asset(asset_id)
            asset = response.data
            
            return {
                'asset_id': asset.id,
                'status': asset.status,
                'duration': asset.duration,
                'created_at': asset.created_at,
                'playback_ids': [pb.id for pb in asset.playback_ids] if asset.playback_ids else [],
                'tracks': len(asset.tracks) if asset.tracks else 0,
                'exists': True
            }
            
        except ApiException as e:
            if e.status == 404:
                return None
            raise
        except Exception:
            return None
    
    def get_public_url(self, file_path: str) -> str:
        """Get the public URL for a Mux asset (placeholder)."""
        # For Mux, the public URL would be the playback URL
        # This would need the asset ID and playback policy
        return file_path  # Placeholder
    
    def _extract_asset_id(self, file_url: str) -> Optional[str]:
        """Extract Mux asset ID from URL or metadata."""
        # This would need to be implemented based on how you store asset IDs
        # Could be in the URL, in the database, etc.
        return None  # Placeholder
    
    def get_allowed_content_types(self) -> Optional[list[str]]:
        """Get allowed content types for Mux (video only)."""
        return [
            'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm',
            'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
        ]
    
    def get_max_file_size(self) -> int:
        """Mux supports very large files."""
        return 100 * 1024 * 1024 * 1024  # 100GB
    
    async def get_playback_url(self, asset_id: str, signed: bool = True) -> Optional[str]:
        """Get a playback URL for a Mux asset."""
        try:
            response = self.assets_api.get_asset(asset_id)
            asset = response.data
            
            if not asset.playback_ids:
                return None
            
            playback_id = asset.playback_ids[0].id
            
            if signed:
                # For signed playback, you'd need to generate a JWT token
                # This is a simplified placeholder
                return f"https://stream.mux.com/{playback_id}.m3u8"
            else:
                return f"https://stream.mux.com/{playback_id}.m3u8"
                
        except Exception:
            return None