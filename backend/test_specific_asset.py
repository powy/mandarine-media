#!/usr/bin/env python3
"""
Direct test of the Mux completion logic for the specific asset that's having issues.
This bypasses authentication to focus on the core logic and logging.
"""

import os
import asyncio
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend to Python path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Set up logging to see our debug messages
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_asset_completion_logic():
    """Test the core Mux asset completion logic with the specific problematic asset."""
    
    # Testing with the correct video file that should have the working Mux asset ID
    video_file_id = "25b06352-9480-4c63-ac2a-ebe67d87e15a"
    expected_mux_asset_id = "bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s"
    
    print(f"Testing video file ID: {video_file_id}")
    print(f"Expected Mux asset ID: {expected_mux_asset_id}")
    print()
    
    # We'll use the expected Mux asset ID directly since we know it works
    asset_id = expected_mux_asset_id
    
    print(f"Testing Mux completion logic for asset: {asset_id}")
    print("=" * 60)
    
    try:
        # Import what we need
        from app.core.config import settings
        from app.services.storage.mux import MuxStorageBackend
        
        # Get configuration
        print("Getting upload configuration...")
        upload_config = settings.get_upload_config()
        
        if 'mux' not in upload_config.get('backends', {}):
            print("ERROR: Mux backend not configured")
            print("Check UPLOAD_MUX_TOKEN_ID and UPLOAD_MUX_TOKEN_SECRET environment variables")
            return
            
        print("Mux backend configuration found")
        
        # Create Mux service
        print("Creating Mux service...")
        mux_service = MuxStorageBackend(upload_config['backends']['mux'])
        print("Mux service created")
        
        # This is the key call - get complete asset info with our new logging
        print(f"\nCalling get_complete_asset_info for asset: {asset_id}")
        print("Watch for [MUX DEBUG] log entries...")
        print("-" * 50)
        
        asset_info = await mux_service.get_complete_asset_info(asset_id)
        
        print("-" * 50)
        print("Raw asset_info response:")
        
        if not asset_info:
            print("ERROR: asset_info is None")
            return
            
        # Print key fields we're interested in
        success = asset_info.get('success')
        file_url = asset_info.get('file_url')
        playback_id = asset_info.get('mux_playback_id')
        policy = asset_info.get('playback_policy')
        
        print(f"  success: {success}")
        print(f"  file_url: {repr(file_url)}")
        print(f"  mux_playback_id: {repr(playback_id)}")
        print(f"  playback_policy: {repr(policy)}")
        
        if not success:
            error = asset_info.get('error', 'Unknown error')
            error_code = asset_info.get('error_code', 'UNKNOWN')
            print(f"  Error: {error}")
            print(f"  Error code: {error_code}")
            return
            
        # Test the conditional logic from the endpoint
        print(f"\nTesting endpoint conditional logic:")
        print(f"  asset_info.get('file_url') = {repr(asset_info.get('file_url'))}")
        print(f"  bool(asset_info.get('file_url')) = {bool(asset_info.get('file_url'))}")
        
        # Simulate what would happen in the endpoint
        update_data = {}
        
        print(f"\nSimulating endpoint update logic:")
        if asset_info.get('file_url'):
            update_data['file_url'] = asset_info['file_url']
            print(f"  file_url WOULD be added to update_data: {repr(asset_info['file_url'])}")
        else:
            print(f"  file_url would NOT be added to update_data")
            print(f"  Reason: asset_info.get('file_url') evaluates to False")
            
        if asset_info.get('mux_playback_id'):
            update_data['mux_playback_id'] = asset_info['mux_playback_id']
            print(f"  mux_playback_id WOULD be added: {repr(asset_info['mux_playback_id'])}")
        else:
            print(f"  mux_playback_id would NOT be added")
            
        print(f"\nSummary:")
        print(f"  Total fields that would be updated: {len(update_data)}")
        for key, value in update_data.items():
            print(f"    - {key}: {repr(value)}")
            
        # Identify the issue
        if playback_id and not file_url:
            print(f"\nISSUE IDENTIFIED:")
            print(f"  - Playback ID exists: {repr(playback_id)}")
            print(f"  - But file_url is missing/invalid: {repr(file_url)}")
            print(f"  - This means URL generation failed despite having a playback ID")
        elif file_url and not playback_id:
            print(f"\nUNUSUAL SITUATION:")
            print(f"  - file_url exists: {repr(file_url)}")
            print(f"  - But playback_id is missing: {repr(playback_id)}")
        elif not file_url and not playback_id:
            print(f"\nNO PLAYBACK DATA:")
            print(f"  - Both file_url and playback_id are missing")
            print(f"  - This suggests the asset has no playback IDs in Mux")
        else:
            print(f"\nLOOKS GOOD:")
            print(f"  - Both file_url and playback_id are present")
            
    except Exception as e:
        print(f"ERROR during test: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Main function."""
    print("Direct Mux Asset Completion Test")
    print("=" * 40)
    
    # Check environment
    mux_token_id = os.getenv('UPLOAD_MUX_TOKEN_ID')
    mux_token_secret = os.getenv('UPLOAD_MUX_TOKEN_SECRET')
    
    print(f"Environment check:")
    print(f"  UPLOAD_MUX_TOKEN_ID: {'Set' if mux_token_id else 'Missing'}")
    print(f"  UPLOAD_MUX_TOKEN_SECRET: {'Set' if mux_token_secret else 'Missing'}")
    
    if not (mux_token_id and mux_token_secret):
        print("\nCannot proceed without Mux credentials")
        return
    
    print(f"\nStarting test...")
    asyncio.run(test_asset_completion_logic())

if __name__ == "__main__":
    main()