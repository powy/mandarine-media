"""
Tests for MUX video signing endpoints.

These tests verify the API endpoints for generating MUX JWT tokens.
"""

import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app import crud, schemas
from tests.conftest import TestingSessionLocal


client = TestClient(app)


class TestMuxVideoSigningEndpoints:
    """Test cases for MUX video signing endpoints."""
    
    def test_playback_token_endpoint_no_video_file(self, superuser_token_headers):
        """Test playback token endpoint returns 404 for non-existent video file."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/playback-token",
            headers=superuser_token_headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Video file not found"
    
    def test_drm_token_endpoint_no_video_file(self, superuser_token_headers):
        """Test DRM token endpoint returns 404 for non-existent video file."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/drm-token",
            headers=superuser_token_headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Video file not found"
    
    def test_token_info_endpoint_no_video_file(self, superuser_token_headers):
        """Test token info endpoint returns 404 for non-existent video file."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.get(
            f"/api/v1/video-files/{fake_video_id}/token-info?token=dummy-token",
            headers=superuser_token_headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Video file not found"
    
    @patch('app.services.mux_token_service.mux_token_service')
    def test_playback_token_endpoint_no_mux_playback_id(self, mock_mux_service, superuser_token_headers):
        """Test playback token endpoint returns 400 when video file has no MUX playback ID."""
        # Create a test video file without mux_playback_id
        db = TestingSessionLocal()
        try:
            video_file_data = schemas.video_file.VideoFileCreate(
                file_url="http://example.com/video.mp4",
                file_name="test_video.mp4",
                file_size_bytes=1000000,
                encoding_status="completed",
                video_codec="h264",
                audio_codec="aac",
                file_format="mp4"
            )
            video_file = crud.video_file.create(db=db, obj_in=video_file_data)
            
            response = client.post(
                f"/api/v1/video-files/{video_file.id}/playback-token",
                headers=superuser_token_headers
            )
            assert response.status_code == 400
            assert "MUX playback ID" in response.json()["detail"]
            
        finally:
            db.close()
    
    @patch('app.services.mux_token_service.mux_token_service')
    def test_playback_token_endpoint_success(self, mock_mux_service, superuser_token_headers):
        """Test successful playback token generation."""
        # Mock the MUX token service
        mock_mux_service.generate_playback_token.return_value = "test-jwt-token"
        mock_mux_service.generate_signed_playback_url.return_value = "https://stream.mux.com/test-id.m3u8?token=test-jwt-token"
        
        # Create a test video file with mux_playback_id
        db = TestingSessionLocal()
        try:
            video_file_data = schemas.video_file.VideoFileCreate(
                file_url="http://example.com/video.mp4",
                file_name="test_video.mp4",
                file_size_bytes=1000000,
                encoding_status="completed",
                video_codec="h264",
                audio_codec="aac",
                file_format="mp4",
                mux_playback_id="test-playback-id"
            )
            video_file = crud.video_file.create(db=db, obj_in=video_file_data)
            
            response = client.post(
                f"/api/v1/video-files/{video_file.id}/playback-token",
                headers=superuser_token_headers
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
                expiration_minutes=60,  # default value
                audience="v"
            )
            
        finally:
            db.close()
    
    @patch('app.services.mux_token_service.mux_token_service')
    def test_drm_token_endpoint_success(self, mock_mux_service, superuser_token_headers):
        """Test successful DRM token generation."""
        # Mock the MUX token service
        mock_mux_service.generate_drm_token.return_value = "test-drm-token"
        
        # Create a test video file with mux_playback_id
        db = TestingSessionLocal()
        try:
            video_file_data = schemas.video_file.VideoFileCreate(
                file_url="http://example.com/video.mp4",
                file_name="test_video.mp4",
                file_size_bytes=1000000,
                encoding_status="completed", 
                video_codec="h264",
                audio_codec="aac",
                file_format="mp4",
                mux_playback_id="test-playback-id"
            )
            video_file = crud.video_file.create(db=db, obj_in=video_file_data)
            
            response = client.post(
                f"/api/v1/video-files/{video_file.id}/drm-token",
                headers=superuser_token_headers
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
                expiration_minutes=60,
                key_id=None
            )
            
        finally:
            db.close()
    
    def test_drm_token_endpoint_requires_admin(self, normal_user_token_headers):
        """Test DRM token endpoint requires admin privileges."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.post(
            f"/api/v1/video-files/{fake_video_id}/drm-token",
            headers=normal_user_token_headers
        )
        assert response.status_code == 403
    
    def test_token_info_endpoint_requires_admin(self, normal_user_token_headers):
        """Test token info endpoint requires admin privileges."""
        fake_video_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.get(
            f"/api/v1/video-files/{fake_video_id}/token-info?token=dummy-token",
            headers=normal_user_token_headers
        )
        assert response.status_code == 403
    
    @patch('app.services.mux_token_service.mux_token_service')
    def test_playback_token_mux_service_error(self, mock_mux_service, superuser_token_headers):
        """Test playback token endpoint handles MUX service errors."""
        # Mock the MUX token service to raise an exception
        mock_mux_service.generate_playback_token.side_effect = Exception("MUX service error")
        
        # Create a test video file with mux_playback_id
        db = TestingSessionLocal()
        try:
            video_file_data = schemas.video_file.VideoFileCreate(
                file_url="http://example.com/video.mp4",
                file_name="test_video.mp4",
                file_size_bytes=1000000,
                encoding_status="completed",
                video_codec="h264", 
                audio_codec="aac",
                file_format="mp4",
                mux_playback_id="test-playback-id"
            )
            video_file = crud.video_file.create(db=db, obj_in=video_file_data)
            
            response = client.post(
                f"/api/v1/video-files/{video_file.id}/playback-token",
                headers=superuser_token_headers
            )
            
            assert response.status_code == 500
            assert "Failed to generate playback token" in response.json()["detail"]
            
        finally:
            db.close()