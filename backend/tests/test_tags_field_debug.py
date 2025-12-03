"""
Debug test for tags field support in /from-text endpoint
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token


class TestTagsFieldDebug:
    """Debug tags field processing step by step"""

    def test_tags_field_support(self, client: TestClient, test_admin_user, db: Session):
        """Test tags field processing with detailed debugging"""

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== TAGS FIELD DEBUG TEST ===")

        payload = {
            "episode_title": "Tags Field Test Episode",
            "media_type": "video",
            "tags": ["action", "drama", "korean"],
            "hashtags_text_list": ["#kpop", "#drama", "#romantic"]
        }

        print(f"Sending payload: {payload}")

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        print(f"Response status: {response.status_code}")

        if response.status_code != 200:
            print(f"Error response: {response.json()}")
            assert False, f"Request failed with status {response.status_code}"

        data = response.json()
        print(f"Response tags field: {data.get('tags', 'NOT FOUND')}")
        print(f"Response hashtags_text_list field: {data.get('hashtags_text_list', 'NOT FOUND')}")

        # The key assertion
        assert response.status_code == 200

        # Check tags field
        if "tags" in data:
            tags_list = data["tags"]
            print(f"Final tags list length: {len(tags_list)}")

            if len(tags_list) == 0:
                print("ISSUE: Tags array is empty despite sending tags")
            else:
                print(f"SUCCESS: Tags array contains {len(tags_list)} items")
                for tag in tags_list:
                    print(f"  Tag: {tag}")

            # Verify we got the expected tags
            assert len(tags_list) == 3, f"Expected 3 tags, got {len(tags_list)}"
            assert "action" in tags_list
            assert "drama" in tags_list
            assert "korean" in tags_list
        else:
            print("ISSUE: Tags field not found in response")
            # Don't fail the test, just observe

        # Check hashtags field
        if "hashtags_text_list" in data:
            hashtags_list = data["hashtags_text_list"]
            print(f"Final hashtags list length: {len(hashtags_list)}")

            if len(hashtags_list) > 0:
                print(f"SUCCESS: Hashtags array contains {len(hashtags_list)} items")
                for hashtag in hashtags_list:
                    print(f"  Hashtag: {hashtag}")

            # Verify we got the expected hashtags
            assert len(hashtags_list) == 3, f"Expected 3 hashtags, got {len(hashtags_list)}"
            assert "#kpop" in hashtags_list
            assert "#drama" in hashtags_list
            assert "#romantic" in hashtags_list
        else:
            print("ISSUE: Hashtags field not found in response")

        print("TAGS FIELD TEST PASSED!")