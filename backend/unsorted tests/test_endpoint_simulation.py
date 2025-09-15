#!/usr/bin/env python3
"""
Simulate the complete endpoint flow for video file completion from Mux.
This tests the actual endpoint logic with the video file ID.
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

# Set up logging to capture debug messages
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def simulate_endpoint_flow():
    """Simulate the complete endpoint flow for video file completion."""
    
    # The video file ID and expected Mux asset ID from user
    video_file_id = "25b06352-9480-4c63-ac2a-ebe67d87e15a"
    expected_mux_asset_id = "bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s"
    
    print(f"Simulating endpoint call for video file: {video_file_id}")
    print(f"Expected to use Mux asset ID: {expected_mux_asset_id}")
    print("=" * 70)
    
    try:
        from app.core.config import settings
        from app.services.storage.mux import MuxStorageBackend
        
        # Get configuration (same as endpoint)
        print("1. Getting upload configuration...")
        upload_config = settings.get_upload_config()
        
        if 'mux' not in upload_config.get('backends', {}):
            print("ERROR: Mux backend not configured")
            return
            
        print("   Mux backend configuration found")
        
        # Create Mux service (same as endpoint)
        print("2. Creating Mux service...")
        mux_service = MuxStorageBackend(upload_config['backends']['mux'])
        print("   Mux service created")
        
        # Simulate video file lookup
        print("3. Simulating video file lookup...")
        print(f"   Video file ID: {video_file_id}")
        
        # In real endpoint, this would be:
        # video_file = crud.video_file.get(db=db, id=video_file_id)
        # For simulation, we'll create a mock video file object
        class MockVideoFile:
            def __init__(self):
                self.id = video_file_id
                self.mux_asset_id = expected_mux_asset_id
                self.title = "Test Video File"
                
        video_file = MockVideoFile()
        
        print(f"   Found video file: {video_file.title}")
        print(f"   Mux asset ID: {video_file.mux_asset_id}")
        
        # Check if video file has mux_asset_id (same as endpoint)
        if not video_file.mux_asset_id:
            print("ERROR: Video file does not have a mux_asset_id")
            return
            
        # This is the key call that the endpoint makes
        print(f"4. Calling get_complete_asset_info with asset ID: {video_file.mux_asset_id}")
        print("   [Watch for MUX DEBUG logs below]")
        print("-" * 50)
        
        asset_info = await mux_service.get_complete_asset_info(video_file.mux_asset_id)
        
        print("-" * 50)
        print("5. Processing asset info response...")
        
        # Same logging as we added to the endpoint
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
        
        # Simulate the update data preparation (same as endpoint)
        print("6. Preparing update data...")
        update_data = {}
        
        print(f"   [VIDEO_FILES DEBUG] Checking file_url: asset_info.get('file_url') = {repr(asset_info.get('file_url'))}")
        if asset_info.get('file_url'):
            update_data['file_url'] = asset_info['file_url']
            print(f"   [VIDEO_FILES DEBUG] Added file_url to update_data: {asset_info['file_url']}")
        else:
            print(f"   [VIDEO_FILES DEBUG] file_url NOT added to update_data. Value was: {repr(asset_info.get('file_url'))}")
            
        # Add other fields that would be updated
        if asset_info.get('mux_playback_id'):
            update_data['mux_playback_id'] = asset_info['mux_playback_id']
        if asset_info.get('playback_policy'):
            update_data['playback_policy'] = asset_info['playback_policy']
        if asset_info.get('drm_protection') is not None:
            update_data['drm_protection'] = asset_info['drm_protection']
            
        print("   [VIDEO_FILES DEBUG] Final update_data dictionary:")
        for key, value in update_data.items():
            print(f"   [VIDEO_FILES DEBUG]   - {key}: {repr(value)}")
            
        print(f"7. Would update video file {video_file_id} with {len(update_data)} fields")
        
        # Summary
        print()
        print("ENDPOINT SIMULATION RESULTS:")
        print("=" * 40)
        if update_data.get('file_url'):
            print(f"SUCCESS: file_url would be saved: {update_data['file_url']}")
        else:
            print("ISSUE: file_url would NOT be saved")
            
        if update_data.get('mux_playback_id'):
            print(f"SUCCESS: mux_playback_id would be saved: {update_data['mux_playback_id']}")
        else:
            print("ISSUE: mux_playback_id would NOT be saved")
            
    except Exception as e:
        print(f"ERROR during simulation: {str(e)}")
        import traceback
        traceback.print_exc()

async def main():
    """Main function."""
    print("Complete Endpoint Flow Simulation")
    print("=" * 35)
    asyncio.run(simulate_endpoint_flow())

if __name__ == "__main__":
    asyncio.run(simulate_endpoint_flow())