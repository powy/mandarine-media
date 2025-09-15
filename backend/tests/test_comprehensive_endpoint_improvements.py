"""
Comprehensive end-to-end test for all /from-text endpoint improvements
Tests all the fixes implemented:
1. Audience categories assignment (fixed schema mismatch)
2. Origin countries support (added field and processing)
3. Original languages support (added field and processing)
4. Tags field support (added to schema and processing)
5. Enhanced field mappings for better compatibility
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.country import Country
from app.models.language import Language
from app.models.audience_category import AudienceCategory
from app.core.security import create_access_token


class TestComprehensiveEndpointImprovements:
    """Test all endpoint improvements together"""

    def test_all_improvements_comprehensive(self, client: TestClient, test_admin_user, db: Session):
        """Test all improvements work together in a single comprehensive test"""

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== COMPREHENSIVE IMPROVEMENTS TEST ===")

        payload = {
            "episode_title": "Comprehensive Test Episode",
            "media_type": "video",
            "production_year": 2024,

            # Person arrays (existing functionality, should still work)
            "actor_names": ["Korean Actor", "International Actor"],
            "director_names": ["Famous Director"],
            "producer_names": ["Producer A", "Producer B"],

            # NEW: Origin countries support
            "origin_country_names": ["South Korea", "United States"],

            # Existing: Available countries (should still work)
            "available_country_names": ["USA", "Canada", "France"],

            # NEW: Original languages support
            "original_language_names": ["Korean", "English"],

            # FIXED: Audience categories (schema mismatch resolved)
            "audience_category_names": ["General Audience", "Teen Plus"],

            # NEW: Tags field support
            "tags": ["action", "romance", "korean-drama"],

            # Existing: Hashtags (should still work)
            "hashtags_text_list": ["#kdrama", "#romance", "#action"],

            # Existing: Themes (should still work)
            "theme_names": ["Romance", "Action", "Drama"],

            # Existing: Plans (should still work)
            "eligible_plan_names": ["Premium", "Standard"]
        }

        print(f"Sending comprehensive payload with {len([k for k in payload.keys() if k.endswith('_names') or k == 'tags'])} array/list fields")
        print(f"Payload: {payload}")

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

        # Check database was populated
        countries_in_db = db.query(Country).count()
        languages_in_db = db.query(Language).count()
        categories_in_db = db.query(AudienceCategory).count()
        print(f"Database entities created - Countries: {countries_in_db}, Languages: {languages_in_db}, Categories: {categories_in_db}")

        # Test all relationship arrays
        relationship_fields = {
            "actors": 2,  # Korean Actor, International Actor
            "directors": 1,  # Famous Director
            "producers": 2,  # Producer A, Producer B
            "origin_countries": 2,  # South Korea, United States (NEW)
            "available_countries": 3,  # USA, Canada, France
            "original_languages": 2,  # Korean, English (NEW)
            "audience_categories": 2,  # General Audience, Teen Plus (FIXED)
            "media_themes": 3,  # Romance, Action, Drama
            "eligible_plan_id_list": 2,  # Premium, Standard
            "tags": 3,  # action, romance, korean-drama (NEW)
            "hashtags_text_list": 3  # #kdrama, #romance, #action
        }

        print(f"\n=== RELATIONSHIP FIELDS VERIFICATION ===")
        success_count = 0
        total_count = len(relationship_fields)

        for field_name, expected_count in relationship_fields.items():
            actual_data = data.get(field_name, [])
            actual_count = len(actual_data) if actual_data else 0

            status = "PASS" if actual_count == expected_count else "FAIL"
            print(f"{status} {field_name}: {actual_count}/{expected_count}")

            if actual_count == expected_count:
                success_count += 1
            else:
                print(f"    Expected: {expected_count}, Got: {actual_count}")
                print(f"    Data: {actual_data}")

        success_rate = (success_count / total_count) * 100
        print(f"\n=== FINAL RESULTS ===")
        print(f"Success rate: {success_count}/{total_count} = {success_rate:.1f}%")

        # Assertions for critical fixes
        assert response.status_code == 200
        assert success_count >= 10, f"Expected at least 10/11 fields to work, got {success_count}/11"

        # Specific assertions for NEW/FIXED features
        assert len(data.get("origin_countries", [])) == 2, "Origin countries should work (NEW)"
        assert len(data.get("original_languages", [])) == 2, "Original languages should work (NEW)"
        assert len(data.get("audience_categories", [])) == 2, "Audience categories should work (FIXED)"
        assert len(data.get("tags", [])) == 3, "Tags field should work (NEW)"

        # Verify specific content
        origin_country_names = [c["name"] for c in data.get("origin_countries", [])]
        assert "South Korea" in origin_country_names
        assert "United States" in origin_country_names

        original_language_names = [l["name"] for l in data.get("original_languages", [])]
        assert "Korean" in original_language_names
        assert "English" in original_language_names

        audience_category_names = [c["name"] for c in data.get("audience_categories", [])]
        assert "General Audience" in audience_category_names
        assert "Teen Plus" in audience_category_names

        tags_list = data.get("tags", [])
        assert "action" in tags_list
        assert "romance" in tags_list
        assert "korean-drama" in tags_list

        print(f"COMPREHENSIVE TEST PASSED! All critical improvements verified.")
        print(f"Overall success rate: {success_rate:.1f}%")

        return {
            "success_rate": success_rate,
            "successful_fields": success_count,
            "total_fields": total_count,
            "critical_fixes_verified": [
                "origin_countries", "original_languages",
                "audience_categories", "tags"
            ]
        }