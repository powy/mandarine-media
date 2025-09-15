"""
Test to reproduce the exact user scenario with the from-text endpoint
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.language import Language
from app.models.media_description import MediaDescription
from app.core.security import create_access_token


def test_user_scenario_original_languages(client: TestClient, test_admin_user, db: Session):
    """Test the exact scenario described by the user"""

    # Create admin token
    access_token = create_access_token(subject=test_admin_user.email)
    headers = {"Authorization": f"Bearer {access_token}"}

    print("\n=== REPRODUCING USER SCENARIO ===")

    # Test payload based on the user's Excel example and media-uploader example
    payload = {
        "episode_title": "La Grande Aventure - User Test",
        "media_type": "video",
        "file_number": 88888,  # Use a unique number
        "program_name": "Aventures Épiques",
        "season_name": "Saison 1",
        "episode_number": 1,
        "descriptive_summary_text": "Une aventure extraordinaire commence...",
        "synopsis_text": "Dans ce premier épisode, nos héros découvrent un monde mystérieux.",
        "production_year": 2024,
        "is_featured": True,
        "content_status": "published",

        "actor_names": ["Marie Dubois", "Jean Martin"],
        "director_names": ["Pierre Renaud"],

        # The field that's supposedly failing
        "original_language_names": ["Français", "English"],
        "available_subtitle_language_names": ["Français", "English", "Español"],
        "available_audio_language_names": ["Français", "English"],

        "rights_holder": "Kyool Media Productions",
        "external_identifier_text": "KMP-ADV-S01E01-USER-TEST"
    }

    print(f"Sending payload with original_language_names: {payload['original_language_names']}")

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

    # Key check: original_languages field
    original_languages = data.get('original_languages', [])
    print(f"Response original_languages field: {original_languages}")
    print(f"Number of original languages in response: {len(original_languages)}")

    # Check languages in database
    languages_in_db = db.query(Language).all()
    print(f"Total languages in database after request: {len(languages_in_db)}")
    for language in languages_in_db:
        print(f"  - {language.name} ({language.sigle}) (ID: {language.id})")

    # Check the media description directly from database
    media_desc = db.query(MediaDescription).filter(
        MediaDescription.file_number == 88888
    ).first()

    if media_desc:
        print(f"Media description found in DB with ID: {media_desc.id}")
        print(f"Original languages in DB model: {len(media_desc.original_languages)}")
        for lang in media_desc.original_languages:
            print(f"  DB Language: {lang.name} ({lang.sigle})")
    else:
        print("❌ Media description not found in database!")

    # Verify the issue
    if len(original_languages) == 0:
        print("❌ ISSUE REPRODUCED: original_languages field is empty in API response")
        print("   But checking if languages exist in database...")
        if media_desc and len(media_desc.original_languages) > 0:
            print("   🔍 Languages exist in DB but not returned in API response - SERIALIZATION ISSUE")
        else:
            print("   🔍 Languages not created or not associated - CREATION/ASSOCIATION ISSUE")
    else:
        print("✅ No issue found: original_languages properly populated in response")

    # The user expects this to work like the backoffice
    assert len(original_languages) == 2, f"Expected 2 original languages, got {len(original_languages)}"

    language_names = [lang["name"] for lang in original_languages]
    assert "Français" in language_names, "Français should be in original languages"
    assert "English" in language_names, "English should be in original languages"

    print("✅ USER SCENARIO TEST PASSED!")


if __name__ == "__main__":
    # Run this specific test
    pytest.main([__file__ + "::test_user_scenario_original_languages", "-v", "-s"])