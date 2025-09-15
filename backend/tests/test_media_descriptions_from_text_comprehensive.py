"""
Comprehensive tests for media descriptions /from-text endpoint

This test suite covers the complete pipeline:
1. Frontend array data processing
2. Backend relationship conversion
3. Database persistence
4. API response verification
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.media_description import MediaDescription
from app.models.public_person import PublicPerson
from app.models.media_theme import MediaTheme
from app.models.audience_category import AudienceCategory
from app.models.country import Country
from app.models.subscription_plan import SubscriptionPlan
from app.core.security import create_access_token


class TestMediaDescriptionFromTextEndpoint:
    """Test the complete /from-text endpoint pipeline"""

    def test_basic_from_text_creation(self, client: TestClient, test_admin_user, db: Session):
        """Test basic media description creation from text fields"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video"
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.json()}")

        assert response.status_code in [200, 201]  # Accept both for now
        data = response.json()
        assert data["episode_title"] == "Test Episode"
        assert data["media_type"] == "video"
        assert "id" in data

    def test_actors_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that actor names array is processed correctly"""
        # Create test persons first
        person1 = PublicPerson(id=uuid4(), stage_name_roman="John Smith")
        person2 = PublicPerson(id=uuid4(), stage_name_roman="Jane Doe")
        db.add_all([person1, person2])
        db.commit()

        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "actor_names": ["John Smith", "Jane Doe", "New Actor"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should have 3 actors (2 existing + 1 new)
        assert len(data["actors"]) == 3

        # Verify the persons were processed correctly
        actor_names = [actor["stage_name_roman"] for actor in data["actors"]]
        assert "John Smith" in actor_names
        assert "Jane Doe" in actor_names
        assert "New Actor" in actor_names

    def test_directors_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that director names array is processed correctly"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "director_names": ["Steven Spielberg", "Christopher Nolan"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should create 2 new directors
        assert len(data["directors"]) == 2
        director_names = [director["stage_name_roman"] for director in data["directors"]]
        assert "Steven Spielberg" in director_names
        assert "Christopher Nolan" in director_names

    def test_producers_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that producer names array is processed correctly"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "producer_names": ["Producer A", "Producer B", "Producer C"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should create 3 producers
        assert len(data["producers"]) == 3
        producer_names = [producer["stage_name_roman"] for producer in data["producers"]]
        assert "Producer A" in producer_names
        assert "Producer B" in producer_names
        assert "Producer C" in producer_names

    def test_authors_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that author names array is processed correctly"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "author_names": ["Author One", "Author Two"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should create 2 authors
        assert len(data["authors"]) == 2
        author_names = [author["stage_name_roman"] for author in data["authors"]]
        assert "Author One" in author_names
        assert "Author Two" in author_names

    def test_themes_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that theme names array is processed correctly"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "theme_names": ["Action", "Drama", "Comedy"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should create 3 themes
        assert len(data["media_themes"]) == 3
        theme_names = [theme["name"] for theme in data["media_themes"]]
        assert "Action" in theme_names
        assert "Drama" in theme_names
        assert "Comedy" in theme_names

    def test_audience_categories_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that audience category names array is processed correctly"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "audience_category_names": ["General Audience", "Teen Plus", "Adult"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should create 3 audience categories
        assert len(data["audience_categories"]) == 3
        category_names = [cat["name"] for cat in data["audience_categories"]]
        assert "General Audience" in category_names
        assert "Teen Plus" in category_names
        assert "Adult" in category_names

    def test_countries_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that available country names array is processed correctly"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "available_country_names": ["United States", "Canada", "France"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should create 3 countries
        assert len(data["available_countries"]) == 3
        country_names = [country["name"] for country in data["available_countries"]]
        assert "United States" in country_names
        assert "Canada" in country_names
        assert "France" in country_names

    def test_eligible_plans_array_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test that eligible plan names array is processed correctly"""
        payload = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "eligible_plan_names": ["Premium", "Family Plan", "Student"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should create 3 eligible plans
        assert len(data["eligible_plans"]) == 3
        plan_names = [plan["name"] for plan in data["eligible_plans"]]
        assert "Premium" in plan_names
        assert "Family Plan" in plan_names
        assert "Student" in plan_names

    def test_complete_relationship_processing(self, client: TestClient, test_admin_user, db: Session):
        """Test processing all relationship fields together"""
        payload = {
            "episode_title": "Complete Test Episode",
            "media_type": "video",
            "actor_names": ["Actor A", "Actor B"],
            "director_names": ["Director X"],
            "producer_names": ["Producer Y", "Producer Z"],
            "author_names": ["Author One"],
            "theme_names": ["Adventure", "Family"],
            "audience_category_names": ["General Audience"],
            "available_country_names": ["United States", "Canada"],
            "eligible_plan_names": ["Premium"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Verify all relationships are created
        assert len(data["actors"]) == 2
        assert len(data["directors"]) == 1
        assert len(data["producers"]) == 2
        assert len(data["authors"]) == 1
        assert len(data["media_themes"]) == 2
        assert len(data["audience_categories"]) == 1
        assert len(data["available_countries"]) == 2
        assert len(data["eligible_plans"]) == 1

    def test_text_fields_with_relationships(self, client: TestClient, test_admin_user, db: Session):
        """Test that text fields work correctly alongside relationship fields"""
        payload = {
            "episode_title": "Mixed Field Test",
            "media_type": "video",
            "production_year": 2025,
            "seo_title": "SEO Test Title",
            "seo_description": "SEO Test Description",
            "seo_keywords_text_list": ["keyword1", "keyword2"],
            "human_keywords_text_list": ["tag1", "tag2"],
            "external_identifier_text": "external-123",
            "actor_names": ["Test Actor"],
            "director_names": ["Test Director"]
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Verify text fields
        assert data["production_year"] == 2025
        assert data["seo_title"] == "SEO Test Title"
        assert data["seo_description"] == "SEO Test Description"
        assert data["seo_keywords_text_list"] == ["keyword1", "keyword2"]
        assert data["human_keywords_text_list"] == ["tag1", "tag2"]
        assert data["external_identifier_text"] == "external-123"

        # Verify relationship fields
        assert len(data["actors"]) == 1
        assert len(data["directors"]) == 1

    def test_empty_arrays_handling(self, client: TestClient, test_admin_user, db: Session):
        """Test that empty arrays are handled correctly"""
        payload = {
            "episode_title": "Empty Arrays Test",
            "media_type": "video",
            "actor_names": [],
            "director_names": [],
            "theme_names": []
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should have empty relationship arrays
        assert len(data["actors"]) == 0
        assert len(data["directors"]) == 0
        assert len(data["media_themes"]) == 0

    def test_null_arrays_handling(self, client: TestClient, test_admin_user, db: Session):
        """Test that null/missing arrays are handled correctly"""
        payload = {
            "episode_title": "Null Arrays Test",
            "media_type": "video"
            # All relationship fields omitted
        }

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        assert response.status_code in [200, 201]  # Accept both success codes
        data = response.json()

        # Should have empty relationship arrays
        assert len(data["actors"]) == 0
        assert len(data["directors"]) == 0
        assert len(data["media_themes"]) == 0