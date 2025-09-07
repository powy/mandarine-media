#!/usr/bin/env python3
"""
Direct test of the specific asset ID without listing all assets.
This bypasses the encoding_tier issue.
"""

import os
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to Python path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

async def test_direct_asset():
    """Test the specific asset directly."""
    
    user_asset_id = "d258bd91-8735-4b5b-a4c4-846dbbf75ab2"
    
    try:
        from app.core.config import settings
        
        # Get configuration
        upload_config = settings.get_upload_config()
        if 'mux' not in upload_config.get('backends', {}):
            print("Mux backend not configured")
            return
            
        mux_config = upload_config['backends']['mux']
        print(f"Testing asset: {user_asset_id}")
        print(f"Using Mux credentials: {mux_config['token_id']}")
        print()
        
        # Import Mux directly
        import mux_python
        from mux_python.rest import ApiException
        
        # Create configuration
        configuration = mux_python.Configuration()
        configuration.username = mux_config['token_id']
        configuration.password = mux_config['token_secret']
        
        # Create API client and test the specific asset
        with mux_python.ApiClient(configuration) as api_client:
            api_instance = mux_python.AssetsApi(api_client)
            
            print(f"Checking asset {user_asset_id} directly...")
            try:
                # Try to get the specific asset
                response = api_instance.get_asset(user_asset_id)
                asset = response.data
                
                print("SUCCESS! Asset found:")
                print(f"  Asset ID: {asset.id}")
                print(f"  Status: {asset.status}")
                print(f"  Created: {asset.created_at}")
                
                if hasattr(asset, 'duration') and asset.duration:
                    print(f"  Duration: {asset.duration}s")
                
                if hasattr(asset, 'playback_ids') and asset.playback_ids:
                    print(f"  Playback IDs ({len(asset.playback_ids)}):")
                    for i, pb in enumerate(asset.playback_ids):
                        policy = getattr(pb, 'policy', 'unknown')
                        print(f"    {i+1}. ID: {pb.id}")
                        print(f"       Policy: {policy}")
                else:
                    print("  No playback IDs found")
                
                # This means the asset EXISTS and is valid
                print()
                print("CONCLUSION: The asset ID is VALID and exists in this Mux account!")
                print("The earlier error might have been due to our service implementation.")
                print()
                print("Let's test our service directly with this asset...")
                
                # Now test with our service
                from app.services.storage.mux import MuxStorageBackend
                mux_service = MuxStorageBackend(upload_config['backends']['mux'])
                
                print("Testing our service implementation...")
                asset_info = await mux_service.get_complete_asset_info(user_asset_id)
                
                print("Service response:")
                print(f"  Success: {asset_info.get('success')}")
                if asset_info.get('success'):
                    print(f"  File URL: {asset_info.get('file_url')}")
                    print(f"  Playback ID: {asset_info.get('mux_playback_id')}")
                    print(f"  Policy: {asset_info.get('playbook_policy')}")
                else:
                    print(f"  Error: {asset_info.get('error')}")
                    print(f"  Error Code: {asset_info.get('error_code')}")
                
            except ApiException as e:
                if e.status == 404:
                    print("Asset NOT FOUND (404)")
                    print("This means either:")
                    print("1. The asset doesn't exist in this Mux account")
                    print("2. The asset ID format is incorrect") 
                    print("3. The asset is in a different Mux environment")
                elif e.status == 400:
                    print(f"Bad Request (400): {e}")
                    print("This suggests the asset ID format is invalid for Mux")
                else:
                    print(f"API Error ({e.status}): {e}")
                    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Main function."""
    print("Direct Asset Test")
    print("=" * 20)
    asyncio.run(test_direct_asset())

if __name__ == "__main__":
    main()