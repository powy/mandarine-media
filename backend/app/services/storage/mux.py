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
                    encoding_tier=self.config.get('encoding_tier', 'baseline'),
                    # Enable DRM if specified in config
                    mp4_support='capped-1080p'  # Standard MP4 support
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
                    'mux_playback_id': None,  # Will be set once processing is complete
                    'upload_url': upload.url,
                    'backend': self.backend_name,
                    'status': 'uploading',
                    'playback_policy': 'signed'
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
            
            playback_ids = [pb.id for pb in asset.playback_ids] if asset.playback_ids else []
            primary_playback_id = playback_ids[0] if playback_ids else None
            
            return {
                'asset_id': asset.id,
                'status': asset.status,
                'duration': asset.duration,
                'created_at': asset.created_at,
                'playback_ids': playback_ids,
                'primary_playback_id': primary_playback_id,
                'tracks': len(asset.tracks) if asset.tracks else 0,
                'exists': True,
                'playback_policy': 'signed' if asset.playback_ids and hasattr(asset.playback_ids[0], 'policy') else None
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
    
    async def get_complete_asset_info(self, asset_id: str) -> Optional[Dict[str, Any]]:
        """Get complete asset information from Mux API for video file completion."""
        try:
            response = self.assets_api.get_asset(asset_id)
            asset = response.data
            
            # Helper function to determine most restrictive playback policy
            def get_most_restrictive_policy_and_id(playback_ids):
                if not playback_ids:
                    return None, None
                
                # Policy hierarchy: drm > signed > public
                policy_priority = {"drm": 3, "signed": 2, "public": 1}
                most_restrictive = None
                best_priority = 0
                
                for pb in playback_ids:
                    policy = pb.policy if hasattr(pb, 'policy') else 'public'
                    priority = policy_priority.get(policy, 1)
                    if priority > best_priority:
                        best_priority = priority
                        most_restrictive = pb
                
                return most_restrictive.policy if most_restrictive else 'public', most_restrictive.id if most_restrictive else playback_ids[0].id
            
            # Get most restrictive playback policy and ID
            playback_policy, mux_playback_id = get_most_restrictive_policy_and_id(asset.playback_ids)
            
            # Generate playback URL using most restrictive playback ID
            file_url = f"https://stream.mux.com/{mux_playback_id}.m3u8" if mux_playback_id else None
            
            # Map encoding status
            encoding_status_map = {
                "preparing": "processing",
                "ready": "completed", 
                "errored": "failed"
            }
            encoding_status = encoding_status_map.get(asset.status, asset.status)
            
            # Map upload status from encoding status
            upload_status_map = {
                "processing": "file_uploading",
                "completed": "upload_completed",
                "failed": "upload_failed"
            }
            upload_status = upload_status_map.get(encoding_status, "upload_completed")
            
            # Extract video track information
            video_tracks = [track for track in (asset.tracks or []) if hasattr(track, 'type') and track.type == 'video']
            audio_tracks = [track for track in (asset.tracks or []) if hasattr(track, 'type') and track.type == 'audio']
            text_tracks = [track for track in (asset.tracks or []) if hasattr(track, 'type') and track.type == 'text']
            
            # Get max resolution from video tracks
            max_resolution_width = None
            max_resolution_height = None
            frame_rate = None
            
            if video_tracks:
                video_track = video_tracks[0]  # Take first video track
                if hasattr(video_track, 'max_width'):
                    max_resolution_width = video_track.max_width
                if hasattr(video_track, 'max_height'):
                    max_resolution_height = video_track.max_height
                if hasattr(video_track, 'max_frame_rate') and video_track.max_frame_rate != -1:
                    frame_rate = float(video_track.max_frame_rate)
            
            # Extract subtitle languages
            subtitle_languages = []
            if text_tracks:
                for track in text_tracks:
                    if hasattr(track, 'language_code') and track.language_code:
                        subtitle_languages.append(track.language_code)
            
            # Determine DRM protection
            drm_protection = playback_policy == 'drm'
            
            # Map encoding profile
            encoding_profile = getattr(asset, 'video_quality', None)
            
            # Prepare timestamps
            upload_timestamp = None
            encodage_date_utc = None
            if hasattr(asset, 'created_at'):
                upload_timestamp = asset.created_at
                # If asset is ready, use created_at as encoding completion date
                if asset.status == 'ready':
                    encodage_date_utc = asset.created_at
            
            return {
                'success': True,
                'asset_id': asset.id,
                'asset_status': asset.status,
                'file_url': file_url,
                'duration_seconds': int(asset.duration) if hasattr(asset, 'duration') and asset.duration else None,
                'max_resolution_width': max_resolution_width,
                'max_resolution_height': max_resolution_height,
                'frame_rate': frame_rate,
                'aspect_ratio': getattr(asset, 'aspect_ratio', None),
                'encoding_status': encoding_status,
                'upload_status': upload_status,
                'upload_timestamp': upload_timestamp,
                'encodage_date_utc': encodage_date_utc,
                'encoding_profile': encoding_profile,
                'subtitle_tracks_text_list': subtitle_languages,
                'mux_playback_id': mux_playback_id,
                'drm_protection': drm_protection,
                'playback_policy': playback_policy,
                'bitrate_kbps': None,  # Not available in Mux API
                'file_size_bytes': None,  # Not available in Mux API
                'audio_sample_rate': None,  # Not available in Mux API
                'unavailable_fields': ['bitrate_kbps', 'file_size_bytes', 'audio_sample_rate'],
                'preserved_fields': ['bitrate_kbps', 'file_size_bytes', 'audio_sample_rate']  # These fields are preserved, not overwritten
            }
            
        except ApiException as e:
            if e.status == 404:
                return {
                    'success': False,
                    'error': 'Asset not found in Mux',
                    'error_code': 'ASSET_NOT_FOUND'
                }
            else:
                return {
                    'success': False,
                    'error': f'Mux API error: {str(e)}',
                    'error_code': 'MUX_API_ERROR'
                }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'error_code': 'UNEXPECTED_ERROR'
            }