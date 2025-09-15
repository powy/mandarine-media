"""
Debug test for original languages support in /from-text endpoint
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.language import Language
from app.core.security import create_access_token


class TestOriginalLanguagesDebug:
    """Debug original languages processing step by step"""

    def test_original_languages_support(self, client: TestClient, test_admin_user, db: Session):
        """Test original languages array processing with detailed debugging"""

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== ORIGINAL LANGUAGES DEBUG TEST ===")

        payload = {
            "episode_title": "Original Languages Test Episode",
            "media_type": "video",
            "original_language_names": ["Korean", "English"]
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
        print(f"Response original_languages field: {data.get('original_languages', 'NOT FOUND')}")

        # Check if languages were created in database
        languages_in_db = db.query(Language).all()
        print(f"Total languages in database after request: {len(languages_in_db)}")
        for language in languages_in_db:
            print(f"  - {language.name} ({language.sigle}) (ID: {language.id})")

        # The key assertion
        assert response.status_code == 200
        assert "original_languages" in data

        # Check original languages
        original_languages_list = data["original_languages"]
        print(f"Final original_languages list length: {len(original_languages_list)}")

        if len(original_languages_list) == 0:
            print("PROBLEM: Original languages array is empty despite sending original_language_names")
        else:
            print(f"SUCCESS: Original languages array contains {len(original_languages_list)} items")
            for language in original_languages_list:
                print(f"  Original Language: {language}")

        # Verify we got the expected languages
        assert len(original_languages_list) == 2, f"Expected 2 original languages, got {len(original_languages_list)}"

        # Verify language names
        original_language_names = [language["name"] for language in original_languages_list]

        assert "Korean" in original_language_names
        assert "English" in original_language_names

        print("ORIGINAL LANGUAGES TEST PASSED!")