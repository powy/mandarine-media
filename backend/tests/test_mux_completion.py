"""
Tests for MUX video file completion endpoint.

These tests verify the API endpoint for completing video file data using Mux API.
"""

import pytest
from unittest.mock import patch, Mock, AsyncMock
from datetime import datetime


class TestMuxVideoFileCompletion:
    """Test cases for MUX video file completion endpoint."""
    
    def test_complete_from_mux_no_video_file(self, client, admin_token):
        """Test completion endpoint returns 404 for non-existent video file."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/complete-from-mux",
            headers=headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Video file not found"
    
    def test_complete_from_mux_no_asset_id(self, client, admin_token, db):
        """Test completion endpoint returns 400 when video file has no mux_asset_id."""
        from app import crud, schemas
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="pending"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/complete-from-mux",
            headers=headers
        )
        assert response.status_code == 400
        assert "mux_asset_id" in response.json()["detail"]
    
    @patch('app.api.v1.endpoints.video_files.settings')
    def test_complete_from_mux_no_mux_backend(self, mock_settings, client, admin_token, db):
        """Test completion endpoint returns 500 when Mux backend not configured."""
        from app import crud, schemas
        
        # Mock configuration without Mux backend
        mock_settings.get_upload_config.return_value = {"backends": {}}
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="pending",
            mux_asset_id="test-asset-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/complete-from-mux",
            headers=headers
        )
        assert response.status_code == 500
        assert "not configured" in response.json()["detail"]
    
    @patch('app.services.storage.mux.MuxStorageBackend')
    @patch('app.api.v1.endpoints.video_files.settings')
    def test_complete_from_mux_asset_not_found(self, mock_settings, mock_mux_backend, client, admin_token, db):
        """Test completion endpoint returns 404 when Mux asset not found."""
        from app import crud, schemas
        
        # Mock configuration with Mux backend
        mock_settings.get_upload_config.return_value = {
            "backends": {
                "mux": {
                    "token_id": "test_id",
                    "token_secret": "test_secret"
                }
            }
        }
        
        # Mock Mux service to return asset not found
        mock_service = Mock()
        mock_service.get_complete_asset_info = AsyncMock(return_value={
            'success': False,
            'error': 'Asset not found in Mux',
            'error_code': 'ASSET_NOT_FOUND'
        })
        mock_mux_backend.return_value = mock_service
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="pending",
            mux_asset_id="non-existent-asset-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/complete-from-mux",
            headers=headers
        )
        assert response.status_code == 404
        assert "not found in Mux" in response.json()["detail"]
    
    @patch('app.services.storage.mux.MuxStorageBackend')
    @patch('app.api.v1.endpoints.video_files.settings')
    def test_complete_from_mux_api_error(self, mock_settings, mock_mux_backend, client, admin_token, db):
        """Test completion endpoint returns 500 when Mux API error occurs."""
        from app import crud, schemas
        
        # Mock configuration with Mux backend
        mock_settings.get_upload_config.return_value = {
            "backends": {
                "mux": {
                    "token_id": "test_id",
                    "token_secret": "test_secret"
                }
            }
        }
        
        # Mock Mux service to return API error
        mock_service = Mock()
        mock_service.get_complete_asset_info = AsyncMock(return_value={
            'success': False,
            'error': 'Mux API rate limit exceeded',
            'error_code': 'MUX_API_ERROR'
        })
        mock_mux_backend.return_value = mock_service
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="pending",
            mux_asset_id="test-asset-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/complete-from-mux",
            headers=headers
        )
        assert response.status_code == 500
        assert "retrieve asset information" in response.json()["detail"]
    
    @patch('app.services.storage.mux.MuxStorageBackend')
    @patch('app.api.v1.endpoints.video_files.settings')
    def test_complete_from_mux_success_full_data(self, mock_settings, mock_mux_backend, client, admin_token, db):
        """Test successful completion with full asset data from Mux."""
        from app import crud, schemas
        
        # Mock configuration with Mux backend
        mock_settings.get_upload_config.return_value = {
            "backends": {
                "mux": {
                    "token_id": "test_id",
                    "token_secret": "test_secret"
                }
            }
        }
        
        # Mock complete asset data from Mux
        mock_asset_data = {
            'success': True,
            'asset_id': 'test-asset-id',
            'asset_status': 'ready',
            'file_url': 'https://stream.mux.com/test-playback-id.m3u8',
            'duration_seconds': 120,
            'max_resolution_width': 1920,
            'max_resolution_height': 1080,
            'frame_rate': 30.0,
            'aspect_ratio': '16:9',
            'encoding_status': 'completed',
            'upload_status': 'upload_completed',
            'upload_timestamp': datetime(2024, 1, 1, 12, 0, 0),
            'encodage_date_utc': datetime(2024, 1, 1, 12, 5, 0),
            'encoding_profile': 'plus',
            'subtitle_tracks_text_list': ['en', 'fr', 'es'],
            'mux_playback_id': 'test-playback-id',
            'drm_protection': False,
            'playback_policy': 'signed',
            'bitrate_kbps': None,
            'file_size_bytes': None,
            'audio_sample_rate': None,
            'unavailable_fields': ['bitrate_kbps', 'file_size_bytes', 'audio_sample_rate'],
            'preserved_fields': ['bitrate_kbps', 'file_size_bytes', 'audio_sample_rate']
        }
        
        mock_service = Mock()
        mock_service.get_complete_asset_info = AsyncMock(return_value=mock_asset_data)
        mock_mux_backend.return_value = mock_service
        
        # Create video file with mux_asset_id
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="pending",
            mux_asset_id="test-asset-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/complete-from-mux",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields were updated correctly
        assert data["file_url"] == "https://stream.mux.com/test-playback-id.m3u8"
        assert data["duration_seconds"] == 120
        assert data["max_resolution_width"] == 1920
        assert data["max_resolution_height"] == 1080
        assert data["frame_rate"] == 30.0
        assert data["aspect_ratio"] == "16:9"
        assert data["encoding_status"] == "completed"
        assert data["upload_status"] == "upload_completed"
        assert data["encoding_profile"] == "plus"
        assert data["subtitle_tracks_text_list"] == ['en', 'fr', 'es']
        assert data["mux_playback_id"] == "test-playback-id"
        assert data["drm_protection"] is False
        assert data["playback_policy"] == "signed"
        assert data["bitrate_kbps"] is None
        assert data["audio_sample_rate"] is None
        
        # Verify service was called correctly
        mock_service.get_complete_asset_info.assert_called_once_with("test-asset-id")
    
    @patch('app.services.storage.mux.MuxStorageBackend')
    @patch('app.api.v1.endpoints.video_files.settings')
    def test_complete_from_mux_success_partial_data(self, mock_settings, mock_mux_backend, client, admin_token, db):
        """Test successful completion with partial asset data from Mux."""
        from app import crud, schemas
        
        # Mock configuration with Mux backend
        mock_settings.get_upload_config.return_value = {
            "backends": {
                "mux": {
                    "token_id": "test_id",
                    "token_secret": "test_secret"
                }
            }
        }
        
        # Mock partial asset data from Mux (some fields missing)
        mock_asset_data = {
            'success': True,
            'asset_id': 'test-asset-id',
            'asset_status': 'preparing',
            'file_url': 'https://stream.mux.com/test-playback-id.m3u8',
            'duration_seconds': 60,
            'max_resolution_width': None,  # Missing
            'max_resolution_height': None,  # Missing
            'frame_rate': None,  # Missing
            'aspect_ratio': None,  # Missing
            'encoding_status': 'processing',
            'upload_status': 'file_uploading',
            'upload_timestamp': datetime(2024, 1, 1, 12, 0, 0),
            'encodage_date_utc': None,  # Not ready yet
            'encoding_profile': 'basic',
            'subtitle_tracks_text_list': [],  # No subtitles
            'mux_playback_id': 'test-playback-id',
            'drm_protection': True,
            'playback_policy': 'drm',
            'bitrate_kbps': None,
            'file_size_bytes': None,
            'audio_sample_rate': None,
            'unavailable_fields': ['bitrate_kbps', 'file_size_bytes', 'audio_sample_rate'],
            'preserved_fields': ['bitrate_kbps', 'file_size_bytes', 'audio_sample_rate']
        }
        
        mock_service = Mock()
        mock_service.get_complete_asset_info = AsyncMock(return_value=mock_asset_data)
        mock_mux_backend.return_value = mock_service
        
        # Create video file with some existing data
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/old-video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=2000000,  # Existing file size should be preserved
            encoding_status="pending",
            max_resolution_width=1280,  # Existing resolution should be updated to None (not available)
            bitrate_kbps=1500,  # Existing bitrate should be preserved (not overwritten with None)
            audio_sample_rate=44100,  # Existing audio sample rate should be preserved (not overwritten with None)
            mux_asset_id="test-asset-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/complete-from-mux",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify available fields were updated
        assert data["file_url"] == "https://stream.mux.com/test-playback-id.m3u8"
        assert data["duration_seconds"] == 60
        assert data["encoding_status"] == "processing"
        assert data["upload_status"] == "file_uploading"
        assert data["encoding_profile"] == "basic"
        assert data["mux_playback_id"] == "test-playback-id"
        assert data["drm_protection"] is True
        assert data["playback_policy"] == "drm"
        assert data["subtitle_tracks_text_list"] == []
        
        # Verify unavailable fields from Mux are None (overwritten), but preserved fields keep existing values
        assert data["max_resolution_width"] is None
        assert data["max_resolution_height"] is None
        assert data["frame_rate"] is None
        assert data["aspect_ratio"] is None
        assert data["encodage_date_utc"] is None
        # All preserved fields should keep existing values (not overwritten with None)
        assert data["bitrate_kbps"] == 1500  # Preserved existing value
        assert data["audio_sample_rate"] == 44100  # Preserved existing value
        assert data["file_size_bytes"] == 2000000  # Preserved existing value


class TestMuxStorageBackendAssetInfo:
    """Test cases for MUX storage backend asset info method."""
    
    @patch('mux_python.AssetsApi')
    @pytest.mark.asyncio
    async def test_get_complete_asset_info_success(self, mock_assets_api):
        """Test successful asset info retrieval from Mux."""
        from app.services.storage.mux import MuxStorageBackend
        from datetime import datetime
        
        # Mock Mux API response
        mock_asset = Mock()
        mock_asset.id = 'test-asset-id'
        mock_asset.status = 'ready'
        mock_asset.duration = 120.5
        mock_asset.aspect_ratio = '16:9'
        mock_asset.video_quality = 'plus'
        mock_asset.created_at = datetime(2024, 1, 1, 12, 0, 0)
        
        # Mock playback IDs
        mock_playback_id_public = Mock()
        mock_playback_id_public.id = 'public-id'
        mock_playback_id_public.policy = 'public'
        
        mock_playback_id_signed = Mock()
        mock_playback_id_signed.id = 'signed-id'
        mock_playback_id_signed.policy = 'signed'
        
        mock_asset.playback_ids = [mock_playback_id_public, mock_playback_id_signed]
        
        # Mock tracks
        mock_video_track = Mock()
        mock_video_track.type = 'video'
        mock_video_track.max_width = 1920
        mock_video_track.max_height = 1080
        mock_video_track.max_frame_rate = 30.0
        
        mock_audio_track = Mock()
        mock_audio_track.type = 'audio'
        
        mock_text_track = Mock()
        mock_text_track.type = 'text'
        mock_text_track.language_code = 'en'
        
        mock_asset.tracks = [mock_video_track, mock_audio_track, mock_text_track]
        
        mock_response = Mock()
        mock_response.data = mock_asset
        
        mock_api_instance = Mock()
        mock_api_instance.get_asset.return_value = mock_response
        mock_assets_api.return_value = mock_api_instance
        
        # Create service and test
        config = {
            'token_id': 'test_id',
            'token_secret': 'test_secret'
        }
        
        with patch('mux_python.ApiClient'), patch('mux_python.DirectUploadsApi'):
            service = MuxStorageBackend(config)
            service.assets_api = mock_api_instance
            
            result = await service.get_complete_asset_info('test-asset-id')
        
        assert result['success'] is True
        assert result['asset_id'] == 'test-asset-id'
        assert result['asset_status'] == 'ready'
        assert result['file_url'] == 'https://stream.mux.com/signed-id.m3u8'  # Most restrictive
        assert result['duration_seconds'] == 120
        assert result['max_resolution_width'] == 1920
        assert result['max_resolution_height'] == 1080
        assert result['frame_rate'] == 30.0
        assert result['aspect_ratio'] == '16:9'
        assert result['encoding_status'] == 'completed'
        assert result['upload_status'] == 'upload_completed'
        assert result['encoding_profile'] == 'plus'
        assert result['subtitle_tracks_text_list'] == ['en']
        assert result['mux_playback_id'] == 'signed-id'  # Most restrictive
        assert result['drm_protection'] is False
        assert result['playback_policy'] == 'signed'  # Most restrictive
        assert result['bitrate_kbps'] is None
        assert result['file_size_bytes'] is None
        assert result['audio_sample_rate'] is None
    
    @patch('mux_python.AssetsApi')
    @pytest.mark.asyncio
    async def test_get_complete_asset_info_drm_priority(self, mock_assets_api):
        """Test that DRM policy takes priority over signed/public."""
        from app.services.storage.mux import MuxStorageBackend
        
        # Mock Mux API response with DRM playback ID
        mock_asset = Mock()
        mock_asset.id = 'test-asset-id'
        mock_asset.status = 'ready'
        mock_asset.duration = 120.0
        mock_asset.created_at = None
        mock_asset.tracks = []
        
        mock_playback_id_public = Mock()
        mock_playback_id_public.id = 'public-id'
        mock_playback_id_public.policy = 'public'
        
        mock_playback_id_drm = Mock()
        mock_playback_id_drm.id = 'drm-id'
        mock_playback_id_drm.policy = 'drm'
        
        mock_asset.playback_ids = [mock_playback_id_public, mock_playback_id_drm]
        
        mock_response = Mock()
        mock_response.data = mock_asset
        
        mock_api_instance = Mock()
        mock_api_instance.get_asset.return_value = mock_response
        mock_assets_api.return_value = mock_api_instance
        
        config = {
            'token_id': 'test_id',
            'token_secret': 'test_secret'
        }
        
        with patch('mux_python.ApiClient'), patch('mux_python.DirectUploadsApi'):
            service = MuxStorageBackend(config)
            service.assets_api = mock_api_instance
            
            result = await service.get_complete_asset_info('test-asset-id')
        
        assert result['success'] is True
        assert result['mux_playback_id'] == 'drm-id'  # DRM takes priority
        assert result['playback_policy'] == 'drm'
        assert result['drm_protection'] is True
    
    @patch('mux_python.AssetsApi')
    @pytest.mark.asyncio
    async def test_get_complete_asset_info_not_found(self, mock_assets_api):
        """Test asset not found error handling."""
        from app.services.storage.mux import MuxStorageBackend
        from mux_python.rest import ApiException
        
        mock_api_instance = Mock()
        mock_api_instance.get_asset.side_effect = ApiException(status=404, reason="Not Found")
        mock_assets_api.return_value = mock_api_instance
        
        config = {
            'token_id': 'test_id',
            'token_secret': 'test_secret'
        }
        
        with patch('mux_python.ApiClient'), patch('mux_python.DirectUploadsApi'):
            service = MuxStorageBackend(config)
            service.assets_api = mock_api_instance
            
            result = await service.get_complete_asset_info('non-existent-asset-id')
        
        assert result['success'] is False
        assert result['error_code'] == 'ASSET_NOT_FOUND'
        assert 'not found' in result['error']
    
    @patch('mux_python.AssetsApi')
    @pytest.mark.asyncio
    async def test_get_complete_asset_info_api_error(self, mock_assets_api):
        """Test Mux API error handling."""
        from app.services.storage.mux import MuxStorageBackend
        from mux_python.rest import ApiException
        
        mock_api_instance = Mock()
        mock_api_instance.get_asset.side_effect = ApiException(status=429, reason="Rate Limited")
        mock_assets_api.return_value = mock_api_instance
        
        config = {
            'token_id': 'test_id',
            'token_secret': 'test_secret'
        }
        
        with patch('mux_python.ApiClient'), patch('mux_python.DirectUploadsApi'):
            service = MuxStorageBackend(config)
            service.assets_api = mock_api_instance
            
            result = await service.get_complete_asset_info('test-asset-id')
        
        assert result['success'] is False
        assert result['error_code'] == 'MUX_API_ERROR'
        assert 'Mux API error' in result['error']