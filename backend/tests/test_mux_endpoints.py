"""
Tests for MUX video signing endpoints.

These tests verify the API endpoints for generating MUX JWT tokens.
"""

import pytest
from unittest.mock import patch, Mock


class TestMuxVideoSigningEndpoints:
    """Test cases for MUX video signing endpoints."""
    
    def test_playback_token_endpoint_no_video_file(self, client, admin_token):
        """Test playback token endpoint returns 404 for non-existent video file."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/playback-token",
            headers=headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Video file not found"
    
    def test_drm_token_endpoint_no_video_file(self, client, admin_token):
        """Test DRM token endpoint returns 404 for non-existent video file."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/drm-token",
            headers=headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Video file not found"
    
    def test_token_info_endpoint_no_video_file(self, client, admin_token):
        """Test token info endpoint returns 404 for non-existent video file."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            f"/api/v1/video-files/{fake_video_id}/token-info?token=dummy-token",
            headers=headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Video file not found"
    
    @patch('app.api.v1.endpoints.video_files.mux_token_service')
    def test_playback_token_endpoint_no_mux_playback_id(self, mock_mux_service, client, admin_token, db):
        """Test playback token endpoint returns 400 when video file has no MUX playback ID."""
        from app import crud, schemas
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="completed"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/playback-token",
            headers=headers
        )
        assert response.status_code == 400
        assert "MUX playback ID" in response.json()["detail"]
    
    @patch('app.api.v1.endpoints.video_files.mux_token_service')
    def test_playback_token_endpoint_success(self, mock_mux_service, client, admin_token, db):
        """Test successful playback token generation."""
        from app import crud, schemas
        
        # Mock the MUX token service
        mock_mux_service.generate_playback_token.return_value = "test-jwt-token"
        mock_mux_service.generate_signed_playback_url.return_value = "https://stream.mux.com/test-id.m3u8?token=test-jwt-token"
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="completed",
            mux_playback_id="test-playback-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/playback-token",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["token"] == "test-jwt-token"
        assert data["playback_id"] == "test-playback-id"
        assert "expires_in_minutes" in data
        assert "expires_at" in data
        
        # Verify the service was called correctly
        mock_mux_service.generate_playback_token.assert_called_once_with(
            playback_id="test-playback-id",
            expiration_minutes=480,  # default value (8 hours)
            audience="v"
        )
    
    @patch('app.api.v1.endpoints.video_files.mux_token_service')
    def test_drm_token_endpoint_success(self, mock_mux_service, client, admin_token, db):
        """Test successful DRM token generation."""
        from app import crud, schemas
        
        # Mock the MUX token service
        mock_mux_service.generate_drm_token.return_value = "test-drm-token"
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="completed", 
            mux_playback_id="test-playback-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/drm-token",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["drm_token"] == "test-drm-token"
        assert data["playback_id"] == "test-playback-id"
        assert "expires_in_minutes" in data
        assert "expires_at" in data
        
        # Verify the service was called correctly
        mock_mux_service.generate_drm_token.assert_called_once_with(
            playback_id="test-playback-id",
            expiration_minutes=480,  # default value (8 hours)
            key_id=None
        )
    
    def test_drm_token_endpoint_requires_admin(self, client, user_token):
        """Test DRM token endpoint requires admin privileges."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/drm-token",
            headers=headers
        )
        assert response.status_code == 403
    
    def test_token_info_endpoint_requires_admin(self, client, user_token):
        """Test token info endpoint requires admin privileges."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(
            f"/api/v1/video-files/{fake_video_id}/token-info?token=dummy-token",
            headers=headers
        )
        assert response.status_code == 403
    
    @patch('app.api.v1.endpoints.video_files.mux_token_service')
    def test_playback_token_mux_service_error(self, mock_mux_service, client, admin_token, db):
        """Test playback token endpoint handles MUX service errors."""
        from app import crud, schemas
        
        # Mock the MUX token service to raise an exception
        mock_mux_service.generate_playback_token.side_effect = Exception("MUX service error")
        
        video_file_data = schemas.video_file.VideoFileCreate(
            file_url="http://example.com/video.mp4",
            file_name="test_video.mp4",
            file_size_bytes=1000000,
            encoding_status="completed",
            mux_playback_id="test-playback-id"
        )
        video_file = crud.video_file.create(db=db, obj_in=video_file_data)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            f"/api/v1/video-files/{video_file.id}/playback-token",
            headers=headers
        )
        
        assert response.status_code == 500
        assert "Failed to generate playback token" in response.json()["detail"]