#!/usr/bin/env python3
"""
Check what assets exist in the Mux account to verify if the provided ID format is valid.
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

async def check_mux_account():
    """Check what assets exist in the current Mux account."""
    
    try:
        from app.core.config import settings
        
        # Get configuration
        upload_config = settings.get_upload_config()
        if 'mux' not in upload_config.get('backends', {}):
            print("Mux backend not configured")
            return
            
        mux_config = upload_config['backends']['mux']
        print(f"Using Mux credentials:")
        print(f"  Token ID: {mux_config['token_id']}")
        print(f"  Token Secret: {mux_config['token_secret'][:10]}...")
        print()
        
        # Import Mux directly to list assets
        import mux_python
        from mux_python.rest import ApiException
        
        # Create configuration
        configuration = mux_python.Configuration()
        configuration.username = mux_config['token_id']
        configuration.password = mux_config['token_secret']
        
        # Create API client
        with mux_python.ApiClient(configuration) as api_client:
            # Create assets API instance
            api_instance = mux_python.AssetsApi(api_client)
            
            print("Listing assets in Mux account...")
            try:
                # List assets
                api_response = api_instance.list_assets(limit=20)
                
                print(f"Found {len(api_response.data)} assets in account:")
                print("=" * 80)
                
                for i, asset in enumerate(api_response.data):
                    print(f"{i+1}. Asset ID: {asset.id}")
                    print(f"   Status: {asset.status}")
                    print(f"   Created: {asset.created_at}")
                    if hasattr(asset, 'duration') and asset.duration:
                        print(f"   Duration: {asset.duration}s")
                    if hasattr(asset, 'playback_ids') and asset.playback_ids:
                        print(f"   Playback IDs: {len(asset.playback_ids)}")
                        for pb in asset.playback_ids[:2]:  # Show first 2
                            print(f"     - {pb.id} ({pb.policy if hasattr(pb, 'policy') else 'no policy'})")
                    print()
                
                # Now check if the user's ID exists
                user_asset_id = "d258bd91-8735-4b5b-a4c4-846dbbf75ab2"
                print(f"Checking if user's asset ID exists: {user_asset_id}")
                print("-" * 50)
                
                try:
                    specific_asset = api_instance.get_asset(user_asset_id)
                    print("SUCCESS! User's asset found:")
                    print(f"  ID: {specific_asset.data.id}")
                    print(f"  Status: {specific_asset.data.status}")
                    print(f"  Created: {specific_asset.data.created_at}")
                    if hasattr(specific_asset.data, 'playback_ids') and specific_asset.data.playback_ids:
                        print(f"  Playback IDs: {len(specific_asset.data.playback_ids)}")
                        for pb in specific_asset.data.playback_ids:
                            print(f"    - {pb.id} ({pb.policy if hasattr(pb, 'policy') else 'no policy'})")
                    
                    # This means the asset exists and our earlier test should have worked
                    print()
                    print("IMPORTANT: The asset exists! The earlier failure might be due to:")
                    print("1. Temporary Mux API issue")
                    print("2. Different error handling in our service")
                    print("3. Asset was created after our test")
                    
                except ApiException as e:
                    if e.status == 404:
                        print("Asset NOT FOUND in this Mux account")
                        print("This confirms the asset doesn't exist in the current account")
                        print()
                        print("Possible reasons:")
                        print("1. Asset is in a different Mux account")
                        print("2. Asset ID format is incorrect")
                        print("3. Asset was deleted")
                    else:
                        print(f"Error checking specific asset: {e}")
                
            except ApiException as e:
                print(f"Error listing assets: {e}")
                
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Main function."""
    print("Checking Mux Account Assets")
    print("=" * 30)
    asyncio.run(check_mux_account())

if __name__ == "__main__":
    main()