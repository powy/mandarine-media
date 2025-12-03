"""
Tests for MuxTokenService functionality.

These tests verify the JWT token generation for Mux video signing and DRM.
"""

import pytest
from unittest.mock import patch, Mock
from jose import jwt
import time

from app.services.mux_token_service import MuxTokenService


class TestMuxTokenService:
    """Test cases for MuxTokenService."""
    
    @patch('app.services.mux_token_service.settings')
    def test_init_with_invalid_key_format(self, mock_settings):
        """Test initialization with invalid key format."""
        # Mock the settings
        mock_settings.MUX_SIGNING_KEY_ID = "test-key-id"
        mock_settings.MUX_PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef1234567890abcdef1234567890abcdef
-----END RSA PRIVATE KEY-----"""
        
        # Should initialize but with no private key loaded due to invalid format
        service = MuxTokenService()
        assert service.private_key is None  # Should be None due to invalid key
        assert service.key_id == "test-key-id"
    
    @patch('app.services.mux_token_service.settings')
    def test_init_missing_key_id(self, mock_settings):
        """Test initialization succeeds but token generation fails when key ID is missing."""
        mock_settings.MUX_SIGNING_KEY_ID = None
        mock_settings.MUX_PRIVATE_KEY = "dummy-key"
        
        # Should not raise an exception during initialization
        service = MuxTokenService()
        assert service.private_key is None
        
        # But should raise when trying to generate tokens
        with pytest.raises(ValueError, match="MUX signing keys are not properly configured"):
            service.generate_playback_token("test-playback-id")
    
    @patch('app.services.mux_token_service.settings')
    def test_init_missing_private_key(self, mock_settings):
        """Test initialization succeeds but token generation fails when private key is missing."""
        mock_settings.MUX_SIGNING_KEY_ID = "test-key-id"
        mock_settings.MUX_PRIVATE_KEY = None
        
        # Should not raise an exception during initialization
        service = MuxTokenService()
        assert service.private_key is None
        
        # But should raise when trying to generate tokens
        with pytest.raises(ValueError, match="MUX signing keys are not properly configured"):
            service.generate_playback_token("test-playback-id")
    
    def test_generate_playback_token_invalid_playback_id(self):
        """Test token generation fails with invalid playback ID."""
        with patch('app.services.mux_token_service.settings') as mock_settings:
            mock_settings.MUX_SIGNING_KEY_ID = "test-key-id"
            mock_settings.MUX_PRIVATE_KEY = "dummy-key"
            
            # Mock the private key loading to avoid real crypto operations
            with patch.object(MuxTokenService, '_load_private_key') as mock_load_key:
                mock_load_key.return_value = Mock()
                
                service = MuxTokenService()
                
                # Test with empty playback ID
                with pytest.raises(ValueError, match="playback_id is required"):
                    service.generate_playback_token("")
                
                # Test with None playback ID
                with pytest.raises(ValueError, match="playback_id is required"):
                    service.generate_playback_token(None)
    
    def test_generate_drm_token_invalid_playback_id(self):
        """Test DRM token generation fails with invalid playback ID."""
        with patch('app.services.mux_token_service.settings') as mock_settings:
            mock_settings.MUX_SIGNING_KEY_ID = "test-key-id"
            mock_settings.MUX_PRIVATE_KEY = "dummy-key"
            
            # Mock the private key loading to avoid real crypto operations
            with patch.object(MuxTokenService, '_load_private_key') as mock_load_key:
                mock_load_key.return_value = Mock()
                
                service = MuxTokenService()
                
                # Test with empty playback ID
                with pytest.raises(ValueError, match="playback_id is required"):
                    service.generate_drm_token("")
                
                # Test with None playback ID
                with pytest.raises(ValueError, match="playback_id is required"):
                    service.generate_drm_token(None)
    
    def test_generate_signed_playback_url(self):
        """Test signed playback URL generation."""
        with patch('app.services.mux_token_service.settings') as mock_settings:
            mock_settings.MUX_SIGNING_KEY_ID = "test-key-id"
            mock_settings.MUX_PRIVATE_KEY = "dummy-key"
            
            # Mock the service methods
            with patch.object(MuxTokenService, '_load_private_key') as mock_load_key:
                mock_load_key.return_value = Mock()
                
                with patch.object(MuxTokenService, 'generate_playback_token') as mock_generate_token:
                    mock_generate_token.return_value = "test-jwt-token"
                    
                    service = MuxTokenService()
                    
                    # Test URL generation
                    url = service.generate_signed_playback_url("test-playback-id", 60, "m3u8")
                    
                    expected_url = "https://stream.mux.com/test-playback-id.m3u8?token=test-jwt-token"
                    assert url == expected_url
                    
                    # Verify the token generation was called correctly
                    mock_generate_token.assert_called_once_with("test-playback-id", 60)
    
    def test_get_token_info_with_valid_token(self):
        """Test token info extraction from a valid JWT."""
        # Create a mock JWT token
        test_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LWlkIn0.eyJzdWIiOiJ0ZXN0LXBsYXliYWNrLWlkIiwiYXVkIjoidiIsImV4cCI6MTY0MDk5NTIwMCwia2lkIjoidGVzdC1rZXktaWQifQ.signature"
        
        with patch('app.services.mux_token_service.settings') as mock_settings:
            mock_settings.MUX_SIGNING_KEY_ID = "test-key-id"
            mock_settings.MUX_PRIVATE_KEY = "dummy-key"
            
            with patch.object(MuxTokenService, '_load_private_key') as mock_load_key:
                mock_load_key.return_value = Mock()
                
                service = MuxTokenService()
                
                # Mock jwt.decode and jwt.get_unverified_header
                with patch('app.services.mux_token_service.jwt.decode') as mock_decode:
                    with patch('app.services.mux_token_service.jwt.get_unverified_header') as mock_header:
                        mock_decode.return_value = {
                            'sub': 'test-playback-id',
                            'aud': 'v',
                            'exp': int(time.time()) + 3600,
                            'kid': 'test-key-id'
                        }
                        mock_header.return_value = {'alg': 'RS256', 'typ': 'JWT', 'kid': 'test-key-id'}
                        
                        token_info = service.get_token_info(test_token)
                        
                        assert token_info['playback_id'] == 'test-playback-id'
                        assert token_info['audience'] == 'v'
                        assert token_info['key_id'] == 'test-key-id'
                        assert token_info['is_expired'] is False
    
    def test_get_token_info_with_invalid_token(self):
        """Test token info extraction from an invalid JWT."""
        with patch('app.services.mux_token_service.settings') as mock_settings:
            mock_settings.MUX_SIGNING_KEY_ID = "test-key-id"
            mock_settings.MUX_PRIVATE_KEY = "dummy-key"
            
            with patch.object(MuxTokenService, '_load_private_key') as mock_load_key:
                mock_load_key.return_value = Mock()
                
                service = MuxTokenService()
                
                # Test with invalid token
                token_info = service.get_token_info("invalid-token")
                
                assert 'error' in token_info
                assert token_info['is_valid'] is False


@pytest.mark.integration
class TestMuxTokenServiceIntegration:
    """Integration tests for MuxTokenService (require real environment variables)."""
    
    def test_token_generation_with_real_config(self):
        """Test token generation with real configuration (if available)."""
        import os
        
        # Skip if real credentials are not available
        if not os.getenv('MUX_SIGNING_KEY_ID') or not os.getenv('MUX_PRIVATE_KEY'):
            pytest.skip("Real MUX credentials not available for integration test")
        
        # This would test with real credentials
        # service = MuxTokenService()
        # token = service.generate_playback_token("test-playback-id")
        # assert token is not None
        # assert len(token) > 50  # JWT tokens are typically much longer
        pass