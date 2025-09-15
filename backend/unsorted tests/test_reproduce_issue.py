#!/usr/bin/env python3
"""
Script to reproduce the original languages issue with the from-text endpoint
This replicates the scenario described by the user.
"""

import requests
import json
import os
import sys

# Add the current directory to Python path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import create_access_token
from app.models.user import User
from app.db.database import get_db_session
from sqlalchemy.orm import Session


def test_reproduce_issue():
    """Test the exact scenario from the media-uploader example"""

    # Get a database session
    db = next(get_db_session())

    # Create or get an admin user for testing
    admin_user = db.query(User).filter(User.email == "admin@test.com").first()
    if not admin_user:
        print("No admin user found. Please ensure test setup includes admin user.")
        return

    # Create admin token
    access_token = create_access_token(subject=admin_user.email)
    headers = {"Authorization": f"Bearer {access_token}"}

    # Test payload based on the media-uploader example
    payload = {
        "episode_title": "La Grande Aventure - Test",
        "media_type": "video",
        "file_number": 99999,  # Use a unique number to avoid conflicts
        "program_name": "Aventures Épiques",
        "season_name": "Saison 1",
        "episode_number": 1,
        "descriptive_summary_text": "Une aventure extraordinaire commence...",
        "synopsis_text": "Dans ce premier épisode, nos héros découvrent un monde mystérieux.",
        "production_year": 2024,
        "is_featured": True,
        "content_status": "published",

        "actor_names": ["Marie Dubois", "Jean Martin", "Sophie Laurent"],
        "director_names": ["Pierre Renaud"],
        "producer_names": ["Productions Kyool", "Studio Films"],
        "author_names": ["Émilie Rousseau"],

        "theme_names": ["Adventure", "Friendship", "Discovery"],
        "available_country_names": ["France", "Belgium", "Canada"],
        "audience_category_names": ["Family", "Teens"],

        # The crucial field that's allegedly not working
        "original_language_names": ["Français"],
        "available_subtitle_language_names": ["Français", "Anglais", "Espagnol", "Allemand"],
        "available_audio_language_names": ["Français", "Anglais"],

        "seo_title": "La Grande Aventure - Premier Épisode Épique",
        "seo_description": "Découvrez La Grande Aventure, une série captivante qui vous transportera dans un monde mystérieux...",
        "hashtags_text_list": ["#aventure", "#série", "#mystère"],
        "tags": ["adventure", "mystery", "family-friendly"],

        "rights_holder": "Kyool Media Productions",
        "copyright_owner_text": "© 2024 Kyool Media Productions",
        "external_identifier_text": "KMP-ADV-S01E01-TEST",

        "translation_share": 0.15,
        "sacem_share": 0.05,
        "revenue_share": 0.80,
        "paid_token_cost": 2
    }

    print("=== REPRODUCING ORIGINAL LANGUAGES ISSUE ===")
    print(f"Payload original_language_names: {payload['original_language_names']}")

    # Make the request to the actual endpoint
    base_url = "http://localhost:8000"  # Adjust if needed
    url = f"{base_url}/api/v1/media-descriptions/from-text"

    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Response status: {response.status_code}")

        if response.status_code != 200:
            print(f"Error response: {response.text}")
            return

        data = response.json()

        # Check the original_languages field in the response
        original_languages = data.get('original_languages', [])
        print(f"Response original_languages field: {original_languages}")
        print(f"Number of original languages returned: {len(original_languages)}")

        if len(original_languages) == 0:
            print("❌ PROBLEM REPRODUCED: Original languages array is empty!")
            print("This confirms the issue described by the user.")
        else:
            print("✅ No issue found: Original languages are properly populated")
            for lang in original_languages:
                print(f"  - {lang.get('name', 'Unknown')} (ID: {lang.get('id', 'Unknown')})")

        # Also check if the media description was created successfully
        media_desc_id = data.get('id')
        if media_desc_id:
            print(f"Media description created with ID: {media_desc_id}")
        else:
            print("❌ Media description was not created successfully")

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Error occurred: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    test_reproduce_issue()