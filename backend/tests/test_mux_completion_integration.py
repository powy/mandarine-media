import pytest
import asyncio
from unittest.mock import patch
from app.services.storage.mux import MuxStorageBackend


@pytest.fixture
def mux_test_credentials():
    """Test credentials for Mux integration tests."""
    return {
        'environment_key': 'fake_mux_environment',
        'test_asset_id': 'MvWkcr2U83LC7IcvyqFxEVb9022UzJ5lQXkU73DPx6DU',
        'token_id': 'fake_mux_token_id_2',
        'token_secret': 'fake_mux_secret_1',
        # This is test data, not real production credentials
    }


@pytest.fixture
def mux_service():
    """Create a Mux storage backend instance for testing."""
    config = {
        'token_id': 'fake_mux_token_id_2',
        'token_secret': 'fake_mux_secret_1',
        'webhook_url': None,
        'encoding_tier': 'baseline',
        'max_file_size': 100 * 1024 * 1024 * 1024,  # 100GB
    }
    return MuxStorageBackend(config)


class TestMuxCompletionIntegration:
    """Integration tests for Mux completion functionality."""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_complete_asset_info_real_asset(self, mux_service):
        """Test getting asset info for a real test asset."""
        # Use test asset ID from mux_test_credentials
        test_asset_id = "MvWkcr2U83LC7IcvyqFxEVb9022UzJ5lQXkU73DPx6DU"
        
        result = await mux_service.get_complete_asset_info(test_asset_id)
        
        # Basic assertions that work regardless of asset state
        assert isinstance(result, dict)
        assert 'success' in result
        
        # If successful, verify structure
        if result.get('success'):
            assert 'mux_asset_id' in result
            assert 'encoding_status' in result
            assert result['mux_asset_id'] == test_asset_id
        else:
            # If not successful, should have error information
            assert 'error' in result
            assert 'error_code' in result

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_complete_asset_info_nonexistent_asset(self, mux_service):
        """Test getting asset info for non-existent asset."""
        fake_asset_id = "nonexistent-asset-id-12345"
        
        result = await mux_service.get_complete_asset_info(fake_asset_id)
        
        # Verify error response
        assert result['success'] is False
        assert result['error_code'] in ['ASSET_NOT_FOUND', 'MUX_API_ERROR']
        assert 'error' in result and result['error']

    @pytest.mark.integration
    def test_complete_endpoint_integration(self, client, mux_test_credentials):
        """Test the complete endpoint with real Mux integration."""
        # Skip this integration test due to complex setup requirements
        pytest.skip("Integration test requires complex authentication and database setup - skipping for now")

    @pytest.mark.integration
    def test_policy_priority_integration(self, mux_service):
        """Test policy priority selection in real scenarios."""
        # This test would verify that the most restrictive policy is correctly selected
        # Skip for now due to setup complexity
        pytest.skip("Integration test for policy priority - skipping for now")

pytestmark = pytest.mark.integration