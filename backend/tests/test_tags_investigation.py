#!/usr/bin/env python3
"""
Investigate the tags field issue - test if tags are properly saved and retrieved
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token

def test_tags_field_investigation(client: TestClient, test_admin_user, db: Session):
    """Deep investigation of the tags field issue"""

    # Create admin token
    access_token = create_access_token(subject=test_admin_user.email)
    headers = {"Authorization": f"Bearer {access_token}"}

    print("\n=== TAGS FIELD INVESTIGATION ===")

    # Test payload with both human_keywords and explicit tags
    payload = {
        "episode_title": "Tags Investigation Test",
        "media_type": "video",
        "human_keywords_text_list": ["keyword1", "keyword2"],
        "tags": ["explicit_tag1", "explicit_tag2"]  # Explicitly set tags
    }

    print(f"Sending payload:")
    print(f"  - human_keywords_text_list: {payload['human_keywords_text_list']}")
    print(f"  - tags: {payload['tags']}")

    response = client.post(
        "/api/v1/media-descriptions/from-text",
        json=payload,
        headers=headers
    )

    print(f"Response status: {response.status_code}")

    if response.status_code != 200:
        print(f"ERROR: {response.json()}")
        assert False, f"Request failed with status {response.status_code}"

    data = response.json()

    print(f"\n--- API RESPONSE ANALYSIS ---")
    print(f"Response tags field: {data.get('tags', 'NOT FOUND')}")
    print(f"Response human_keywords field: {data.get('human_keywords_text_list', 'NOT FOUND')}")

    # Check the created record in database
    from app.models.media_description import MediaDescription
    from uuid import UUID

    media_id = UUID(data['id'])
    media_record = db.query(MediaDescription).filter(MediaDescription.id == media_id).first()

    if media_record:
        print(f"\n--- DATABASE RECORD ANALYSIS ---")
        print(f"DB tags field (raw): {repr(media_record.tags)}")
        print(f"DB human_keywords field (raw): {repr(media_record.human_keywords_text_list)}")

        print(f"\n--- DIAGNOSIS ---")
        if media_record.tags is None:
            print("ISSUE: tags field is None in database")
        elif not media_record.tags:
            print("ISSUE: tags field is empty list/array in database")
        else:
            print(f"SUCCESS: tags field contains: {media_record.tags}")

        if data.get('tags') != media_record.tags:
            print(f"MISMATCH: API response tags ({data.get('tags')}) != DB tags ({media_record.tags})")
        else:
            print("MATCH: API response tags match database tags")

        # Test: Should tags equal human_keywords based on our fix?
        if media_record.tags == media_record.human_keywords_text_list:
            print("EXPECTED: tags equals human_keywords (due to our fix)")
        else:
            print("UNEXPECTED: tags does not equal human_keywords")

    else:
        print("ERROR: Could not find created record in database")
        assert False, "Created record not found"

    # Final assertions
    assert response.status_code == 200
    assert data.get('tags') is not None, "Tags field should not be None in response"
    assert len(data.get('tags', [])) > 0, "Tags field should not be empty"

    # The current fix should prioritize human_keywords over explicit tags
    expected_tags = payload['human_keywords_text_list']  # Our fix uses human_keywords first
    actual_tags = data.get('tags', [])

    assert actual_tags == expected_tags, f"Expected tags {expected_tags}, got {actual_tags}"

    print(f"\nSUCCESS: Tags investigation completed - tags are working as expected")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])