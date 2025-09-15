#!/usr/bin/env python3
"""
Test to compare what the uploader sends vs what the /from-text endpoint expects.
This runs within the pytest framework so we can reuse the test fixtures.
"""

import pytest
from uuid import uuid4
from app.core.security import create_access_token

class TestUploaderPayloadComparison:
    """Compare uploader payload with working from-text payloads"""
    
    def test_uploader_vs_working_payload(self, client, db, test_admin_user):
        """Test uploader-style payload vs known working payload"""
        
        # Create auth token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Known working payload (from existing tests)
        working_payload = {
            "episode_title": "Working Test Episode",
            "media_type": "video", 
            "program_name": "Test Program",  # singular
            "actor_names": ["Test Actor One", "Test Actor Two"],
            "theme_names": ["Action", "Comedy"],
            "available_country_names": ["United States"],
            "audience_category_names": ["General Audience"],
            "eligible_plan_names": ["Basic Plan"],
            "descriptive_summary_text": "Working test",
            "content_status": "draft"
        }
        
        # Uploader-style payload (simulating what orchestrationService.js sends)
        uploader_payload = {
            "episode_title": "Uploader Test Episode", 
            "media_type": "video",
            "program_name": "Test Program Name",  # Should work - singular string
            "season_name": "Season 1",  # Should work - singular string
            "episode_number": 1,
            "descriptive_summary_text": "Test summary",
            "synopsis_text": "Test synopsis",
            "slug": "test-episode-slug",
            "media_categories_list": ["drama", "romance"],  # This might be the issue
            "theme_names": ["Action", "Comedy"],  # Should work
            "actor_names": ["John Doe", "Jane Smith"],  # Fixed - should work
            "director_names": ["Director One"],  # Fixed - should work  
            "producer_names": ["Producer One", "Producer Two"],  # Fixed - should work
            "author_names": ["Author One"],  # Fixed - should work
            "available_country_names": ["United States", "Canada"],  # Should work
            "hashtags_text_list": ["test", "episode"],  # This might be issue
            "human_keywords_text_list": ["keyword1", "keyword2"]  # This might be issue
        }
        
        print(f"\n=== TESTING KNOWN WORKING PAYLOAD ===")
        response1 = client.post(
            "/api/v1/media-descriptions/from-text",
            json=working_payload,
            headers=headers
        )
        
        print(f"Working payload status: {response1.status_code}")
        if response1.status_code != 200:
            print(f"Working payload error: {response1.text}")
        
        assert response1.status_code == 200, f"Known working payload failed: {response1.text}"
        
        print(f"\n=== TESTING UPLOADER-STYLE PAYLOAD ===") 
        response2 = client.post(
            "/api/v1/media-descriptions/from-text",
            json=uploader_payload,
            headers=headers
        )
        
        print(f"Uploader payload status: {response2.status_code}")
        if response2.status_code != 200:
            print(f"Uploader payload error: {response2.text}")
            
            # Try to identify specific problem fields
            print(f"\n=== DEBUGGING FIELD BY FIELD ===")
            
            # Test minimal uploader payload
            minimal_uploader = {
                "episode_title": uploader_payload["episode_title"],
                "media_type": uploader_payload["media_type"]
            }
            
            # Add fields one by one to see which breaks it
            test_fields = [
                ("program_name", uploader_payload.get("program_name")),
                ("season_name", uploader_payload.get("season_name")),  
                ("episode_number", uploader_payload.get("episode_number")),
                ("descriptive_summary_text", uploader_payload.get("descriptive_summary_text")),
                ("synopsis_text", uploader_payload.get("synopsis_text")),
                ("slug", uploader_payload.get("slug")),
                ("media_categories_list", uploader_payload.get("media_categories_list")),
                ("theme_names", uploader_payload.get("theme_names")),
                ("actor_names", uploader_payload.get("actor_names")),
                ("director_names", uploader_payload.get("director_names")),
                ("producer_names", uploader_payload.get("producer_names")),  
                ("author_names", uploader_payload.get("author_names")),
                ("available_country_names", uploader_payload.get("available_country_names")),
                ("hashtags_text_list", uploader_payload.get("hashtags_text_list")),
                ("human_keywords_text_list", uploader_payload.get("human_keywords_text_list"))
            ]
            
            working_fields = []
            for field_name, field_value in test_fields:
                if field_value is not None:
                    test_payload = {**minimal_uploader, field_name: field_value}
                    test_response = client.post(
                        "/api/v1/media-descriptions/from-text",
                        json=test_payload,
                        headers=headers
                    )
                    
                    if test_response.status_code == 200:
                        working_fields.append(field_name)
                        print(f"✓ {field_name}: WORKS")
                    else:
                        print(f"✗ {field_name}: FAILS - {test_response.text}")
            
            print(f"\nWORKING FIELDS: {working_fields}")
        else:
            print("✓ Uploader payload works!")
            
        # The test passes if we get information about what works/doesn't work
        # Don't fail the test - we want to see the debug output
        print(f"\nTEST COMPLETED - Check debug output above")