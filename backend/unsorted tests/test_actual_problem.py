#!/usr/bin/env python3
"""
Test the actual problematic video file that has the missing URL issue.
This should show us exactly what happens during the completion process.
"""

import os
import asyncio
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to Python path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Set up logging to capture our debug messages
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_actual_problem():
    """Test the actual problematic video file."""
    
    # The ACTUAL video file with the problem
    video_file_id = "25b06352-9480-4c63-ac2a-ebe67d87e15a"
    # This should have mux_asset_id: bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s
    
    print(f"Testing ACTUAL problematic video file: {video_file_id}")
    print("This video file should have:")
    print("  - mux_asset_id: bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s")
    print("  - mux_playback_id: bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s")
    print("  - file_url: MISSING (this is the bug)")
    print("=" * 70)
    
    try:
        from app.core.config import settings
        from app.services.storage.mux import MuxStorageBackend
        
        # Get configuration
        print("1. Getting upload configuration...")
        upload_config = settings.get_upload_config()
        
        if 'mux' not in upload_config.get('backends', {}):
            print("ERROR: Mux backend not configured")
            return
            
        print("   Mux backend configuration found")
        
        # Create Mux service
        print("2. Creating Mux service...")
        mux_service = MuxStorageBackend(upload_config['backends']['mux'])
        print("   Mux service created")
        
        # Simulate what the endpoint should do:
        # 1. Look up video file to get mux_asset_id 
        # 2. Call get_complete_asset_info with that mux_asset_id
        
        print("3. Simulating video file lookup...")
        # In the real database, this video file should have mux_asset_id = bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s
        expected_mux_asset_id = "bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s"
        
        print(f"   Video file ID: {video_file_id}")
        print(f"   Expected mux_asset_id: {expected_mux_asset_id}")
        
        # This is the EXACT call the endpoint makes
        print(f"4. Calling get_complete_asset_info with: {expected_mux_asset_id}")
        print("   [Watch for MUX DEBUG logs - this is the key part!]")
        print("-" * 50)
        
        asset_info = await mux_service.get_complete_asset_info(expected_mux_asset_id)
        
        print("-" * 50)
        print("5. Processing asset info response...")
        
        # This is the EXACT logging from our endpoint
        print("   [VIDEO_FILES DEBUG] Received asset_info from Mux service:")
        print(f"   [VIDEO_FILES DEBUG] - success: {asset_info.get('success')}")
        print(f"   [VIDEO_FILES DEBUG] - file_url: {asset_info.get('file_url')}")
        print(f"   [VIDEO_FILES DEBUG] - mux_playback_id: {asset_info.get('mux_playback_id')}")
        print(f"   [VIDEO_FILES DEBUG] - playback_policy: {asset_info.get('playback_policy')}")
        
        if not asset_info['success']:
            error_code = asset_info.get('error_code', 'UNKNOWN_ERROR')
            error_msg = asset_info.get('error', 'Failed to retrieve asset information')
            print(f"ERROR: {error_msg} (Code: {error_code})")
            return
        
        # This is the EXACT conditional logic from the endpoint
        print("6. Testing the problematic conditional logic...")
        update_data = {}
        
        print(f"   [VIDEO_FILES DEBUG] Checking file_url: asset_info.get('file_url') = {repr(asset_info.get('file_url'))}")
        if asset_info.get('file_url'):
            update_data['file_url'] = asset_info['file_url']
            print(f"   [VIDEO_FILES DEBUG] Added file_url to update_data: {asset_info['file_url']}")
        else:
            print(f"   [VIDEO_FILES DEBUG] file_url NOT added to update_data. Value was: {repr(asset_info.get('file_url'))}")
            
        # Check playback_id too
        if asset_info.get('mux_playback_id'):
            update_data['mux_playback_id'] = asset_info['mux_playback_id']
            print(f"   [VIDEO_FILES DEBUG] mux_playback_id WOULD be added: {repr(asset_info['mux_playback_id'])}")
        else:
            print(f"   [VIDEO_FILES DEBUG] mux_playback_id would NOT be added")
            
        print("   [VIDEO_FILES DEBUG] Final update_data dictionary:")
        for key, value in update_data.items():
            print(f"   [VIDEO_FILES DEBUG]   - {key}: {repr(value)}")
            
        print(f"7. Analysis for video file {video_file_id}:")
        print("=" * 50)
        
        if 'file_url' in update_data:
            print(f"SUCCESS: file_url WOULD be updated to: {update_data['file_url']}")
        else:
            print("BUG CONFIRMED: file_url would NOT be updated")
            print("This explains why the video_url field is empty!")
            
        if 'mux_playback_id' in update_data:
            print(f"INFO: mux_playback_id would be updated to: {update_data['mux_playback_id']}")
        else:
            print("ISSUE: mux_playback_id would not be updated either")
        
        # Compare with what's supposedly already in database
        print()
        print("Comparison with database state:")
        print(f"  Stored mux_playback_id: bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s")
        print(f"  Current mux_playback_id: {asset_info.get('mux_playback_id', 'None')}")
        
        if asset_info.get('mux_playback_id') != 'bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s':
            print("  MISMATCH DETECTED: Playback IDs don't match!")
            print("  This suggests the Mux asset has changed since the upload")
        else:
            print("  MATCH: Playback IDs are consistent")
            
    except Exception as e:
        print(f"ERROR during test: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Main function."""
    print("Testing Actual Problematic Video File")
    print("=" * 40)
    asyncio.run(test_actual_problem())

if __name__ == "__main__":
    main()