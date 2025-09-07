#!/usr/bin/env python3
"""
Helper script to find the actual Mux asset ID for a video file UUID.
Since the database might not be set up, this will help identify the correct asset to test.
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

async def find_video_file_mux_asset():
    """Try multiple approaches to find the Mux asset ID for the video file."""
    
    video_file_uuid = "d258bd91-8735-4b5b-a4c4-846dbbf75ab2"
    
    print(f"Searching for Mux asset ID for video file UUID: {video_file_uuid}")
    print("=" * 70)
    
    # Approach 1: Check if we can connect to the database
    try:
        from app.database.database import engine
        from sqlalchemy import text
        
        print("Approach 1: Direct database query...")
        
        with engine.connect() as connection:
            result = connection.execute(
                text("SELECT id, title, mux_asset_id, mux_playback_id, file_url FROM video_files WHERE id = :video_id"),
                {"video_id": video_file_uuid}
            )
            row = result.fetchone()
            
            if row:
                print(f"Found video file in database:")
                print(f"  ID: {row[0]}")
                print(f"  Title: {row[1]}")
                print(f"  Mux Asset ID: {row[2]}")
                print(f"  Mux Playback ID: {row[3]}")
                print(f"  File URL: {row[4]}")
                return row[2]  # Return mux_asset_id
            else:
                print("Video file not found in database")
                
    except Exception as e:
        print(f"Database query failed: {str(e)}")
    
    # Approach 2: List recent Mux assets to help identify the correct one
    try:
        print(f"\nApproach 2: List recent Mux assets...")
        from app.core.config import settings
        from app.services.storage.mux import MuxStorageBackend
        
        upload_config = settings.get_upload_config()
        if 'mux' not in upload_config.get('backends', {}):
            print("Mux backend not configured")
            return None
            
        mux_service = MuxStorageBackend(upload_config['backends']['mux'])
        
        # Try to list assets (this might help identify the correct one)
        print("Recent Mux assets in your account:")
        
        # Use the Mux client directly to list assets
        from mux_python.api import assets_api
        from mux_python import Configuration, ApiClient
        
        configuration = Configuration()
        configuration.username = upload_config['backends']['mux']['token_id']
        configuration.password = upload_config['backends']['mux']['token_secret']
        
        with ApiClient(configuration) as api_client:
            api_instance = assets_api.AssetsApi(api_client)
            try:
                api_response = api_instance.list_assets(limit=10)  # Get last 10 assets
                
                print(f"Found {len(api_response.data)} recent assets:")
                for i, asset in enumerate(api_response.data):
                    print(f"  {i+1}. Asset ID: {asset.id}")
                    print(f"     Status: {asset.status}")
                    if hasattr(asset, 'duration') and asset.duration:
                        print(f"     Duration: {asset.duration}s")
                    if hasattr(asset, 'created_at'):
                        print(f"     Created: {asset.created_at}")
                    print()
                    
                print("Try using one of these asset IDs in your test")
                
            except Exception as e:
                print(f"Failed to list Mux assets: {str(e)}")
                
    except Exception as e:
        print(f"Mux API query failed: {str(e)}")
    
    # Approach 3: Suggest manual lookup
    print(f"\nApproach 3: Manual lookup suggestions...")
    print(f"Since '{video_file_uuid}' appears to be a video file UUID, you need to:")
    print(f"1. Check your video files table in the database")
    print(f"2. Find the record with id = '{video_file_uuid}'")  
    print(f"3. Get the 'mux_asset_id' field from that record")
    print(f"4. Use that Mux asset ID for testing")
    print()
    print(f"If the video file doesn't have a mux_asset_id yet, that might be the issue!")
    
    return None

async def main():
    """Main function."""
    print("Finding Mux Asset ID for Video File")
    print("=" * 40)
    
    asset_id = await find_video_file_mux_asset()
    
    if asset_id:
        print(f"\nFound Mux asset ID: {asset_id}")
        print(f"You can now test with this asset ID")
    else:
        print(f"\nCould not automatically find the Mux asset ID")
        print(f"You'll need to check manually in your database or Mux dashboard")

if __name__ == "__main__":
    asyncio.run(main())