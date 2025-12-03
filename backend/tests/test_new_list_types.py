"""
Test new list_type enum values (hero, field, ranking)
This test verifies the end-to-end functionality of the new enum values.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.schemas.media_showcase import ThumbnailFormatEnum, ListTypeEnum


class TestNewListTypes:
    """Test new list_type enum values through the API."""

    def test_create_showcase_with_hero_type(self, client, admin_token):
        """Test creating a showcase with 'hero' list_type."""
        showcase_data = {
            "title": "Hero Showcase Test",
            "description": "Testing hero list type",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": "hero",  # New enum value
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 1,
            "latest_first": True,
        }

        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            "/api/v1/media-showcases/",
            json=showcase_data,
            headers=headers
        )

        assert response.status_code == 200, f"Failed: {response.json()}"
        data = response.json()
        assert data["list_type"] == "hero"
        assert data["title"] == "Hero Showcase Test"

    def test_create_showcase_with_field_type(self, client, admin_token):
        """Test creating a showcase with 'field' list_type."""
        showcase_data = {
            "title": "Field Showcase Test",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": "field",  # New enum value
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 2,
            "latest_first": True,
        }

        response = client.post(
            "/api/v1/media-showcases/",
            json=showcase_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200, f"Failed: {response.json()}"
        data = response.json()
        assert data["list_type"] == "field"

    def test_create_showcase_with_ranking_type(self, client, admin_token):
        """Test creating a showcase with 'ranking' list_type."""
        showcase_data = {
            "title": "Ranking Showcase Test",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": "ranking",  # New enum value
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 3,
            "latest_first": True,
        }

        response = client.post(
            "/api/v1/media-showcases/",
            json=showcase_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200, f"Failed: {response.json()}"
        data = response.json()
        assert data["list_type"] == "ranking"

    def test_filter_showcases_by_new_list_types(self, client, admin_token):
        """Test filtering showcases by new list_type values."""
        # Create showcases with new types
        for list_type in ["hero", "field", "ranking"]:
            showcase_data = {
                "title": f"{list_type.capitalize()} Filter Test",
                "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
                "list_type": list_type,
                "percentage_width": 100,
                "percentage_height": 75,
                "is_active": True,
                "priority_in_screen": 0,
                "latest_first": True,
            }
            response = client.post(
                "/api/v1/media-showcases/",
                json=showcase_data,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200

        # Test filtering by each new type
        for list_type in ["hero", "field", "ranking"]:
            response = client.get(
                f"/api/v1/media-showcases/?list_type={list_type}"
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["data"]) > 0
            for showcase in data["data"]:
                assert showcase["list_type"] == list_type

    def test_update_showcase_to_new_list_type(self, client, admin_token):
        """Test updating an existing showcase to use a new list_type."""
        # Create with classic
        showcase_data = {
            "title": "Update Test Showcase",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": "classic",
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 0,
            "latest_first": True,
        }

        create_response = client.post(
            "/api/v1/media-showcases/",
            json=showcase_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        showcase_id = create_response.json()["id"]

        # Update to hero
        update_data = {"list_type": "hero"}
        update_response = client.put(
            f"/api/v1/media-showcases/{showcase_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["list_type"] == "hero"

    def test_invalid_list_type_rejected(self, client, admin_token):
        """Test that invalid list_type values are rejected."""
        showcase_data = {
            "title": "Invalid Test",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": "invalid_type",  # Invalid value
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 0,
            "latest_first": True,
        }

        response = client.post(
            "/api/v1/media-showcases/",
            json=showcase_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 422  # Validation error
        error_data = response.json()
        assert "detail" in error_data

    def test_all_five_list_types_accepted(self, client, admin_token):
        """Comprehensive test: Verify all 5 list_type values work."""
        all_types = ["classic", "carousel", "hero", "field", "ranking"]

        for idx, list_type in enumerate(all_types):
            showcase_data = {
                "title": f"Complete Test {list_type}",
                "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
                "list_type": list_type,
                "percentage_width": 100,
                "percentage_height": 75,
                "is_active": True,
                "priority_in_screen": idx,
                "latest_first": True,
            }

            response = client.post(
                "/api/v1/media-showcases/",
                json=showcase_data,
                headers={"Authorization": f"Bearer {admin_token}"}
            )

            assert response.status_code == 200, f"Failed for {list_type}: {response.json()}"
            data = response.json()
            assert data["list_type"] == list_type, f"Wrong list_type returned for {list_type}"

        print("\nSUCCESS: All 5 list_type values (classic, carousel, hero, field, ranking) work correctly!")

    def test_percentage_values_above_100(self, client, admin_token):
        """Test that percentage values above 100 are accepted (no upper limit)."""
        test_values = [150, 200, 500, 1000]

        for value in test_values:
            showcase_data = {
                "title": f"Large Scale Test {value}%",
                "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
                "list_type": "hero",
                "percentage_width": value,
                "percentage_height": value,
                "is_active": True,
                "priority_in_screen": 0,
                "latest_first": True,
            }

            headers = {"Authorization": f"Bearer {admin_token}"}
            response = client.post(
                "/api/v1/media-showcases/",
                json=showcase_data,
                headers=headers
            )

            assert response.status_code == 200, f"Failed for value {value}: {response.json()}"
            data = response.json()
            assert data["percentage_width"] == value
            assert data["percentage_height"] == value

        print(f"\nSUCCESS: Percentage values above 100 work correctly (tested: {test_values})")

    def test_percentage_zero_rejected(self, client, admin_token):
        """Test that percentage value of 0 is rejected (minimum is 1)."""
        showcase_data = {
            "title": "Zero Test",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": "classic",
            "percentage_width": 0,  # Should fail
            "percentage_height": 100,
            "is_active": True,
            "priority_in_screen": 0,
            "latest_first": True,
        }

        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(
            "/api/v1/media-showcases/",
            json=showcase_data,
            headers=headers
        )

        assert response.status_code == 422  # Validation error
        error_data = response.json()
        assert "detail" in error_data