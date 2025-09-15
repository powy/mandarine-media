#!/usr/bin/env python3
"""
Test script to debug Mux API integration for missing file URLs.
Specifically tests asset: d258bd91-8735-4b5b-a4c4-846dbbf75ab2
"""

import os
import asyncio
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from app.core.config import settings
from app.services.storage.mux import MuxStorageBackend

async def test_mux_asset(asset_id: str):
    """Test the Mux asset retrieval and URL generation logic."""
    print(f"Testing Mux asset: {asset_id}")
    print("=" * 50)
    
    # Get configuration
    try:
        upload_config = settings.get_upload_config()
        print(f"Upload config backends: {list(upload_config.get('backends', {}).keys())}")
        
        if 'mux' not in upload_config.get('backends', {}):
            print("❌ ERROR: Mux backend not configured")
            print("Check UPLOAD_MUX_TOKEN_ID and UPLOAD_MUX_TOKEN_SECRET environment variables")
            return
            
        print("✅ Mux backend configuration found")
        
    except Exception as e:
        print(f"❌ ERROR getting upload config: {e}")
        return
    
    # Create Mux service
    try:
        mux_service = MuxStorageBackend(upload_config['backends']['mux'])
        print("✅ Mux service created successfully")
    except Exception as e:
        print(f"❌ ERROR creating Mux service: {e}")
        return
    
    # Test the asset retrieval
    try:
        print(f"\n📡 Calling get_complete_asset_info for asset: {asset_id}")
        asset_info = await mux_service.get_complete_asset_info(asset_id)
        
        print(f"\n📄 Asset info response:")
        print(f"  Success: {asset_info.get('success')}")
        
        if not asset_info.get('success'):
            print(f"  ❌ Error: {asset_info.get('error')}")
            print(f"  Error code: {asset_info.get('error_code')}")
            return
            
        print(f"  Asset ID: {asset_info.get('asset_id')}")
        print(f"  Asset Status: {asset_info.get('asset_status')}")
        print(f"  File URL: {asset_info.get('file_url')}")
        print(f"  Mux Playback ID: {asset_info.get('mux_playback_id')}")
        print(f"  Playback Policy: {asset_info.get('playback_policy')}")
        print(f"  DRM Protection: {asset_info.get('drm_protection')}")
        
        # Test the conditional logic from video_files.py
        print(f"\n🔍 Testing conditional logic:")
        file_url_value = asset_info.get('file_url')
        print(f"  asset_info.get('file_url') = {repr(file_url_value)}")
        print(f"  bool(asset_info.get('file_url')) = {bool(file_url_value)}")
        
        if asset_info.get('file_url'):
            print(f"  ✅ file_url WOULD be added to update_data")
        else:
            print(f"  ❌ file_url would NOT be added to update_data")
            
        # Show what would be in update_data
        print(f"\n📊 Fields that would be updated:")
        update_fields = []
        if asset_info.get('file_url'):
            update_fields.append('file_url')
        if asset_info.get('mux_playback_id'):
            update_fields.append('mux_playback_id')
        if asset_info.get('playback_policy'):
            update_fields.append('playback_policy')
        
        for field in update_fields:
            print(f"  - {field}: {repr(asset_info.get(field))}")
            
        print(f"\n📈 Total fields to update: {len(update_fields)}")
        
    except Exception as e:
        print(f"❌ ERROR during asset retrieval: {e}")
        import traceback
        traceback.print_exc()
        return

def main():
    """Main function to run the test."""
    # Test asset ID from user report
    test_asset_id = "d258bd91-8735-4b5b-a4c4-846dbbf75ab2"
    
    print("🧪 Mux Asset Debug Test")
    print("=" * 30)
    print(f"Asset ID: {test_asset_id}")
    print()
    
    # Check environment variables
    mux_token_id = os.getenv('UPLOAD_MUX_TOKEN_ID')
    mux_token_secret = os.getenv('UPLOAD_MUX_TOKEN_SECRET')
    
    print("🔑 Environment Variables:")
    print(f"  UPLOAD_MUX_TOKEN_ID: {'✅ Set' if mux_token_id else '❌ Not set'}")
    print(f"  UPLOAD_MUX_TOKEN_SECRET: {'✅ Set' if mux_token_secret else '❌ Not set'}")
    print()
    
    if not (mux_token_id and mux_token_secret):
        print("❌ Missing required Mux environment variables")
        return
    
    # Run the async test
    asyncio.run(test_mux_asset(test_asset_id))

if __name__ == "__main__":
    main()