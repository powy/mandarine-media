"""
Test slug uniqueness functionality in MediaDescription CRUD
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.crud import media_description


class TestSlugUniqueness:
    """Test automatic slug uniqueness handling"""

    def test_slug_uniqueness_direct_crud(self, db: Session):
        """Test slug uniqueness using CRUD methods directly"""

        # Test get_by_slug method
        result = media_description.get_by_slug(db, slug="nonexistent-slug")
        assert result is None

        # Test ensure_unique_slug with non-existing slug
        unique_slug = media_description.ensure_unique_slug(db=db, base_slug="test-slug")
        assert unique_slug == "test-slug"

    def test_slug_uniqueness_via_endpoint(self, client: TestClient, test_admin_user, db: Session):
        """Test slug uniqueness through the /from-text endpoint"""

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== SLUG UNIQUENESS TEST ===")

        # First request with slug 'pompom_bag' - should succeed
        payload1 = {
            "episode_title": "First Episode",
            "media_type": "video",
            "slug": "pompom_bag"
        }

        print(f"Creating first media with slug: {payload1['slug']}")
        response1 = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload1,
            headers=headers
        )

        print(f"Response 1 status: {response1.status_code}")
        assert response1.status_code == 200
        data1 = response1.json()
        first_slug = data1.get("slug")
        print(f"First media got slug: {first_slug}")
        assert first_slug == "pompom_bag"

        # Second request with same slug 'pompom_bag' - should auto-increment
        payload2 = {
            "episode_title": "Second Episode",
            "media_type": "video",
            "slug": "pompom_bag"
        }

        print(f"Creating second media with slug: {payload2['slug']}")
        response2 = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload2,
            headers=headers
        )

        print(f"Response 2 status: {response2.status_code}")
        assert response2.status_code == 200
        data2 = response2.json()
        second_slug = data2.get("slug")
        print(f"Second media got slug: {second_slug}")
        assert second_slug == "pompom_bag_2"

        # Third request with same slug - should increment to _3
        payload3 = {
            "episode_title": "Third Episode",
            "media_type": "video",
            "slug": "pompom_bag"
        }

        print(f"Creating third media with slug: {payload3['slug']}")
        response3 = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload3,
            headers=headers
        )

        print(f"Response 3 status: {response3.status_code}")
        assert response3.status_code == 200
        data3 = response3.json()
        third_slug = data3.get("slug")
        print(f"Third media got slug: {third_slug}")
        assert third_slug == "pompom_bag_3"

        print("SUCCESS: All slugs are unique!")
        print(f"Final slugs: {first_slug}, {second_slug}, {third_slug}")

        # Verify all three records exist with different slugs
        assert first_slug != second_slug != third_slug
        assert all([first_slug, second_slug, third_slug])

        # Verify we can retrieve them by slug using our new CRUD method
        from app.crud.media_description import media_description as md_crud

        found1 = md_crud.get_by_slug(db, slug=first_slug)
        found2 = md_crud.get_by_slug(db, slug=second_slug)
        found3 = md_crud.get_by_slug(db, slug=third_slug)

        assert found1 is not None
        assert found2 is not None
        assert found3 is not None

        assert found1.episode_title == "First Episode"
        assert found2.episode_title == "Second Episode"
        assert found3.episode_title == "Third Episode"

        print("SUCCESS: All records retrievable by their unique slugs!")

    def test_no_slug_provided(self, client: TestClient, test_admin_user):
        """Test that records without slugs work normally"""

        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        payload = {
            "episode_title": "No Slug Episode",
            "media_type": "video"
            # No slug provided
        }

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        # slug should be None if not provided
        assert data.get("slug") is None
        print("SUCCESS: Records without slugs work normally!")