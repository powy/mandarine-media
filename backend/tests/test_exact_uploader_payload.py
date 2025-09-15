#!/usr/bin/env python3
"""
Test with the EXACT payload from the uploader log to debug the tags issue
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token

def test_exact_uploader_payload(client: TestClient, test_admin_user, db: Session):
    """Test with the exact payload from the uploader log"""

    # Create admin token
    access_token = create_access_token(subject=test_admin_user.email)
    headers = {"Authorization": f"Bearer {access_token}"}

    print("\n=== TESTING EXACT UPLOADER PAYLOAD ===")

    # This is the EXACT payload from the log line 102 (simplified)
    payload = {
        "episode_title": "Pompom et le sac",
        "media_type": "video",
        "program_name": "Les aventures de Pom-Pom et Noah",
        "season_name": "Pompom à la cuisine",
        "episode_number": 1,
        "descriptive_summary_text": "Pompom a trouvé un sac !",
        "synopsis_text": "Pompom, la petite chatte curieuse, a trouvé refuge dans un sac de courses vide.\nElle s'y est glissée discrètement, ne laissant dépasser que le bout de ses oreilles.\nLe froissement du plastique semble devenir son nouveau terrain de jeu.\nDe temps en temps, ses yeux brillants apparaissent à travers l'ouverture.\nPour elle, ce simple sac se transforme en une cachette pleine d'aventures.",
        "slug": "pompom_bag",
        "media_categories_list": ["documentary", "other"],
        "theme_names": ["nature", "thriller"],
        "actor_names": ["Pompom", "Noah"],
        "director_names": ["Thierry", "Lea"],
        "producer_names": ["Thierry", "Lea"],
        "author_names": ["Thierry", "Lea"],
        "available_country_names": ["France", "Corée"],
        "audience_category_names": ["tout publique", "jeff publique"],
        "eligible_plan_names": ["kpop-fans-abonnement"],
        "hashtags_text_list": ["#pompom", "#cat"],
        "human_keywords_text_list": ["chats", "sac"],  # THIS should go to tags
        "seo_keywords_text_list": ["SEO pompom mot cle"],
        "rights_holder": "Powy",
        "copyright_owner_text": "Thierry Durand",
        "production_year": 2025,
        "seo_title": "Titre SEO pompom",
        "seo_description": "Desc Pompom",
        "external_identifier_text": "external",
        "contract_start_date_utc": "2025-05-26T03:00:00.000Z",
        "contract_end_date_utc": "2025-05-26T03:00:00.000Z"
    }

    print(f"Payload human_keywords_text_list: {payload['human_keywords_text_list']}")

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

    print(f"\n--- FIELD ANALYSIS ---")
    print(f"Response tags: {data.get('tags')}")
    print(f"Response human_keywords_text_list: {data.get('human_keywords_text_list')}")
    print(f"Response hashtags_text_list: {data.get('hashtags_text_list')}")

    # Check database record
    from app.models.media_description import MediaDescription
    from uuid import UUID

    media_id = UUID(data['id'])
    media_record = db.query(MediaDescription).filter(MediaDescription.id == media_id).first()

    if media_record:
        print(f"\n--- DATABASE ANALYSIS ---")
        print(f"DB tags: {media_record.tags}")
        print(f"DB human_keywords_text_list: {media_record.human_keywords_text_list}")
        print(f"DB hashtags_text_list: {media_record.hashtags_text_list}")

        # The issue: Are tags empty despite human_keywords having values?
        if not media_record.tags and media_record.human_keywords_text_list:
            print(f"\n❌ BUG REPRODUCED!")
            print(f"  - human_keywords_text_list has values: {media_record.human_keywords_text_list}")
            print(f"  - tags field is empty: {media_record.tags}")
            print(f"  - Our fix should have copied human_keywords to tags!")
        elif media_record.tags == media_record.human_keywords_text_list:
            print(f"\n✅ FIX WORKING!")
            print(f"  - tags field matches human_keywords: {media_record.tags}")
        else:
            print(f"\n⚠️  UNEXPECTED STATE!")
            print(f"  - tags: {media_record.tags}")
            print(f"  - human_keywords: {media_record.human_keywords_text_list}")

    # Assertions
    assert response.status_code == 200

    # The key test: tags should equal human_keywords_text_list due to our fix
    expected_tags = ["chats", "sac"]
    actual_tags = data.get('tags', [])

    if actual_tags != expected_tags:
        print(f"\n❌ TAGS ISSUE CONFIRMED!")
        print(f"Expected tags: {expected_tags}")
        print(f"Actual tags: {actual_tags}")
        assert False, f"Tags field issue: expected {expected_tags}, got {actual_tags}"
    else:
        print(f"\n✅ TAGS WORKING CORRECTLY!")

    assert True

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])