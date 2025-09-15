#!/usr/bin/env python3
"""
End-to-end test to verify uploader tool payload compatibility with /from-text endpoint.
This simulates what the media uploader tool actually sends to the backend.
"""

import requests
import json
import sys
import os

# Configuration
BACKEND_URL = "http://localhost:8000"
TEST_USERNAME = "admin@example.com" 
TEST_PASSWORD = "password"

def authenticate():
    """Get JWT token from backend"""
    login_url = f"{BACKEND_URL}/api/v1/auth/login"
    
    login_data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(login_url, data=login_data)
    
    if response.status_code != 200:
        print(f"Authentication failed: {response.status_code}")
        print(f"Response: {response.text}")
        return None
    
    token = response.json().get("access_token")
    print(f"Authentication successful")
    return token

def test_uploader_payload(token):
    """Test with payload that matches what uploader tool sends"""
    
    # This simulates what the uploader tool mapExcelToApiSchemaTextOnly() sends
    uploader_payload = {
        "episode_title": "Test Episode from Uploader",
        "media_type": "video",
        "program_name": "Test Program Name",
        "season_name": "Season 1",
        "episode_number": 1,
        "descriptive_summary_text": "Test summary",
        "synopsis_text": "Test synopsis", 
        "slug": "test-episode-slug",
        "media_categories_list": ["drama", "romance"],
        "theme_names": ["Action", "Comedy"],
        "actor_names": ["John Doe", "Jane Smith"],
        "director_names": ["Director One"],
        "producer_names": ["Producer One", "Producer Two"],
        "author_names": ["Author One"],
        "available_country_names": ["United States", "Canada"],
        "hashtags_text_list": ["test", "episode"],
        "human_keywords_text_list": ["keyword1", "keyword2"]
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"\nTesting uploader payload...")
    print(f"Payload keys: {list(uploader_payload.keys())}")
    
    response = requests.post(
        f"{BACKEND_URL}/api/v1/media-descriptions/from-text",
        json=uploader_payload,
        headers=headers
    )
    
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        print("SUCCESS: Uploader payload accepted!")
        result = response.json()
        print(f"Created media description ID: {result.get('id')}")
        print(f"File number: {result.get('file_number')}")
        return True
    else:
        print("FAILED: Uploader payload rejected!")
        print(f"Error response: {response.text}")
        return False

def main():
    print("Starting Uploader <-> Backend Integration Test")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Step 1: Authenticate
    token = authenticate()
    if not token:
        sys.exit(1)
    
    # Step 2: Test uploader payload
    success = test_uploader_payload(token)
    
    if success:
        print("\nAll tests passed! Uploader is compatible with backend.")
        sys.exit(0)
    else:
        print("\nTest failed! Uploader payload needs fixes.")
        sys.exit(1)

if __name__ == "__main__":
    main()