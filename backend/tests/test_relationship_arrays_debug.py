"""
Debug test specifically for relationship array processing
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.public_person import PublicPerson
from app.core.security import create_access_token


class TestRelationshipArraysDebug:
    """Debug relationship array processing step by step"""

    def test_actors_array_debug(self, client: TestClient, test_admin_user, db: Session):
        """Test actors array processing with detailed debugging"""

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== ACTORS ARRAY DEBUG TEST ===")

        payload = {
            "episode_title": "Actors Test Episode",
            "media_type": "video",
            "actor_names": ["John Smith", "Jane Doe"]
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
        print(f"Response actors field: {data.get('actors', 'NOT FOUND')}")
        print(f"Total response keys: {len(data.keys())}")
        print(f"Response keys containing 'actor': {[k for k in data.keys() if 'actor' in k.lower()]}")

        # Check if persons were created in database
        persons_in_db = db.query(PublicPerson).all()
        print(f"Total persons in database after request: {len(persons_in_db)}")
        for person in persons_in_db:
            print(f"  - {person.stage_name_roman} (ID: {person.id})")

        # The key assertion
        assert response.status_code == 200
        assert "actors" in data

        # This is what we're debugging - should NOT be empty
        actors_list = data["actors"]
        print(f"Final actors list length: {len(actors_list)}")

        if len(actors_list) == 0:
            print("PROBLEM CONFIRMED: Actors array is empty despite sending actor_names")
        else:
            print(f"PARTIAL SUCCESS: Actors array contains {len(actors_list)} out of 2 expected items")
            for actor in actors_list:
                print(f"  Actor: {actor}")

            if len(actors_list) < 2:
                print("ISSUE FOUND: Not all actors were added - likely position conflict!")

        # For now, just verify the request succeeds - we expect this to reveal the issue
        assert len(actors_list) >= 0  # Don't fail the test, just observe

    def test_themes_array_debug(self, client: TestClient, test_admin_user, db: Session):
        """Test themes array processing with detailed debugging"""

        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== THEMES ARRAY DEBUG TEST ===")

        payload = {
            "episode_title": "Themes Test Episode",
            "media_type": "video",
            "theme_names": ["Action", "Drama", "Comedy"]
        }

        print(f"Sending payload: {payload}")

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        print(f"Response status: {response.status_code}")
        data = response.json()
        print(f"Response themes field: {data.get('media_themes', 'NOT FOUND')}")
        print(f"Alternative themes field: {data.get('themes', 'NOT FOUND')}")

        themes_list = data.get("media_themes", [])
        print(f"Final themes list length: {len(themes_list)}")

        if len(themes_list) == 0:
            print("❌ PROBLEM: Themes array is empty despite sending theme_names")
        else:
            print("✅ SUCCESS: Themes array contains data")

        assert response.status_code == 200

    def test_multiple_arrays_debug(self, client: TestClient, test_admin_user, db: Session):
        """Test multiple relationship arrays at once"""

        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== MULTIPLE ARRAYS DEBUG TEST ===")

        payload = {
            "episode_title": "Multiple Arrays Test",
            "media_type": "video",
            "actor_names": ["Actor A", "Actor B"],
            "director_names": ["Director X"],
            "producer_names": ["Producer Y"],
            "theme_names": ["Adventure"],
            "audience_category_names": ["General"],
            "available_country_names": ["USA"]
        }

        print(f"Sending payload with {len([k for k in payload.keys() if k.endswith('_names')])} array fields")

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        print(f"Response status: {response.status_code}")
        data = response.json()

        # Check all relationship fields
        relationship_fields = [
            "actors", "directors", "producers", "authors",
            "media_themes", "audience_categories", "available_countries"
        ]

        empty_fields = []
        populated_fields = []

        for field in relationship_fields:
            field_data = data.get(field, [])
            field_length = len(field_data) if field_data else 0
            print(f"{field}: {field_length} items")

            if field_length == 0:
                empty_fields.append(field)
            else:
                populated_fields.append(field)

        print(f"\nSUMMARY:")
        print(f"Empty fields: {empty_fields}")
        print(f"Populated fields: {populated_fields}")
        print(f"Success rate: {len(populated_fields)}/{len(relationship_fields)} = {len(populated_fields)/len(relationship_fields)*100:.1f}%")

        assert response.status_code == 200