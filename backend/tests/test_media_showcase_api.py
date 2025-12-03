import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import UUID, uuid4

from app.main import app
from app.models.media_showcase import MediaShowcase
from app.models.media_description import MediaDescription
from app.models.media_theme import MediaTheme
from app.schemas.media_showcase import ThumbnailFormatEnum, ListTypeEnum


@pytest.fixture
def sample_showcase_data():
    """Sample showcase data for API tests."""
    return {
        "title": "API Test Showcase",
        "description": "A showcase for testing API endpoints",
        "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
        "list_type": ListTypeEnum.carousel.value,
        "percentage_width": 100,
        "percentage_height": 75,
        "is_active": True,
        "priority_in_screen": 1,
        "media_type": "video",
        "media_categories_list": ["movie", "action"],
        "latest_first": True,
        "slug": "api-test-showcase",
        "relative_url_link": None,
        "media_description_ids": [],
        "media_theme_ids": []
    }


@pytest.fixture
def created_showcase(db: Session, sample_showcase_data):
    """Create a showcase for testing."""
    showcase = MediaShowcase(**{k: v for k, v in sample_showcase_data.items() 
                               if k not in ['media_description_ids', 'media_theme_ids']})
    db.add(showcase)
    db.commit()
    db.refresh(showcase)
    return showcase


@pytest.fixture
def test_media_descriptions(db: Session):
    """Create test MediaDescriptions."""
    descriptions = []
    for i in range(3):
        desc = MediaDescription(
            file_number=2000 + i,
            episode_title=f"API Test Movie {i+1}",
            media_type="video",
            friendly_url=f"/watch/api-test-movie-{i+1}",
            slug=f"api-test-movie-{i+1}",
            media_categories_list=["movie", "action"],
            descriptive_summary_text=f"API test movie {i+1} description",
            is_featured=(i == 0)
        )
        db.add(desc)
        descriptions.append(desc)
    
    db.commit()
    for desc in descriptions:
        db.refresh(desc)
    return descriptions


class TestMediaShowcaseAPI:
    """Test MediaShowcase API endpoints."""

    def test_get_media_showcases_empty(self, client):
        """Test getting showcases when none exist."""
        response = client.get("/api/v1/media-showcases/")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)

    def test_get_media_showcases_with_data(self, client, created_showcase):
        """Test getting showcases with existing data."""
        response = client.get("/api/v1/media-showcases/")
        assert response.status_code == 200
        data = response.json()
        
        showcase_ids = [item["id"] for item in data["data"]]
        assert str(created_showcase.id) in showcase_ids

    def test_get_media_showcases_with_filters(self, client, created_showcase):
        """Test getting showcases with various filters."""
        # Test active filter
        response = client.get("/api/v1/media-showcases/?is_active=true")
        assert response.status_code == 200
        data = response.json()

        # All returned showcases should be active
        for showcase in data["data"]:
            assert showcase["is_active"] is True

        # Test thumbnail_format filter
        response = client.get(f"/api/v1/media-showcases/?thumbnail_format={ThumbnailFormatEnum.format_1920x1080.value}")
        assert response.status_code == 200
        data = response.json()

        # All returned showcases should have the specified format
        for showcase in data["data"]:
            assert showcase["thumbnail_format"] == ThumbnailFormatEnum.format_1920x1080.value

    def test_get_media_showcases_with_search_parameter(self, client, admin_token, created_showcase):
        """Test getting showcases with q search parameter in main list endpoint."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create showcases with distinct titles
        showcase_data_1 = {
            "title": "Searchable Amazing Content",
            "description": "First test showcase",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": ListTypeEnum.carousel.value,
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 10,
            "slug": "searchable-amazing-content",
            "media_description_ids": []
        }
        showcase_data_2 = {
            "title": "Different Showcase Title",
            "description": "Second test showcase",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": ListTypeEnum.carousel.value,
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 11,
            "slug": "different-showcase-title",
            "media_description_ids": []
        }

        client.post("/api/v1/media-showcases/", json=showcase_data_1, headers=headers)
        client.post("/api/v1/media-showcases/", json=showcase_data_2, headers=headers)

        # Search for "Amazing"
        response = client.get("/api/v1/media-showcases/?q=Amazing")
        assert response.status_code == 200
        data = response.json()

        # Should find showcase with "Amazing" in title
        found_titles = [item["title"] for item in data["data"]]
        assert any("Amazing" in title for title in found_titles)

        # Search for "Different"
        response = client.get("/api/v1/media-showcases/?q=Different")
        assert response.status_code == 200
        data = response.json()

        found_titles = [item["title"] for item in data["data"]]
        assert any("Different" in title for title in found_titles)

        # Case-insensitive search
        response = client.get("/api/v1/media-showcases/?q=amazing")
        assert response.status_code == 200
        data = response.json()

        found_titles = [item["title"] for item in data["data"]]
        assert any("Amazing" in title for title in found_titles)

    def test_create_media_showcase(self, client, admin_token, sample_showcase_data):
        """Test creating a new media showcase."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post("/api/v1/media-showcases/", json=sample_showcase_data, headers=headers)
        assert response.status_code == 200
        
        created_showcase = response.json()
        assert created_showcase["title"] == sample_showcase_data["title"]
        assert created_showcase["description"] == sample_showcase_data["description"]
        assert created_showcase["thumbnail_format"] == sample_showcase_data["thumbnail_format"]
        assert created_showcase["priority_in_screen"] == sample_showcase_data["priority_in_screen"]
        assert created_showcase["slug"] == sample_showcase_data["slug"]
        assert "id" in created_showcase

    def test_create_media_showcase_duplicate_slug(self, client, admin_token, created_showcase, sample_showcase_data):
        """Test creating a showcase with duplicate slug fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Use same slug as existing showcase
        sample_showcase_data["slug"] = created_showcase.slug
        sample_showcase_data["title"] = "Different Title"

        response = client.post("/api/v1/media-showcases/", json=sample_showcase_data, headers=headers)
        assert response.status_code == 400
        assert "slug already exists" in response.json()["detail"].lower()

    def test_get_media_showcase_by_id(self, client, created_showcase):
        """Test getting a specific showcase by ID."""
        response = client.get(f"/api/v1/media-showcases/{created_showcase.id}")
        assert response.status_code == 200
        
        showcase = response.json()
        assert showcase["id"] == str(created_showcase.id)
        assert showcase["title"] == created_showcase.title

    def test_get_media_showcase_not_found(self, client):
        """Test getting a non-existent showcase."""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/media-showcases/{fake_id}")
        assert response.status_code == 404

    def test_update_media_showcase(self, client, admin_token, created_showcase):
        """Test updating a media showcase."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        update_data = {
            "title": "Updated API Test Showcase",
            "description": "Updated description",
            "priority_in_screen": 5,
            "is_active": False
        }

        response = client.put(f"/api/v1/media-showcases/{created_showcase.id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        updated_showcase = response.json()
        assert updated_showcase["title"] == update_data["title"]
        assert updated_showcase["description"] == update_data["description"]
        assert updated_showcase["priority_in_screen"] == update_data["priority_in_screen"]
        assert updated_showcase["is_active"] == update_data["is_active"]

    def test_update_showcase_duplicate_slug(self, client, admin_token, db: Session, created_showcase, sample_showcase_data):
        """Test updating showcase with duplicate slug fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Create another showcase
        other_data = sample_showcase_data.copy()
        other_data["title"] = "Other Showcase"
        other_data["slug"] = "other-showcase"
        other_showcase = MediaShowcase(**{k: v for k, v in other_data.items()
                                         if k not in ['media_description_ids', 'media_theme_ids']})
        db.add(other_showcase)
        db.commit()

        # Try to update first showcase to use other's slug
        update_data = {"slug": other_showcase.slug}
        response = client.put(f"/api/v1/media-showcases/{created_showcase.id}", json=update_data, headers=headers)
        assert response.status_code == 400
        assert "slug already exists" in response.json()["detail"].lower()

    def test_delete_media_showcase(self, client, admin_token, created_showcase):
        """Test deleting a media showcase."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.delete(f"/api/v1/media-showcases/{created_showcase.id}", headers=headers)
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"].lower()
        
        # Verify showcase is gone
        get_response = client.get(f"/api/v1/media-showcases/{created_showcase.id}")
        assert get_response.status_code == 404

    def test_get_showcase_items_empty(self, client, created_showcase):
        """Test getting showcase items when none exist."""
        response = client.get(f"/api/v1/media-showcases/{created_showcase.id}/items")
        assert response.status_code == 200
        
        showcase_with_items = response.json()
        assert "items" in showcase_with_items or len(showcase_with_items.get("media_descriptions", [])) == 0

    def test_add_showcase_items(self, client, admin_token, created_showcase, test_media_descriptions):
        """Test adding items to a showcase."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        add_data = {
            "media_description_ids": [str(desc.id) for desc in test_media_descriptions[:2]]
        }

        response = client.post(f"/api/v1/media-showcases/{created_showcase.id}/items", json=add_data, headers=headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["items_affected"] == 2
        assert result["showcase_id"] == str(created_showcase.id)

    def test_add_showcase_items_with_position(self, client, admin_token, created_showcase, test_media_descriptions):
        """Test adding items to a showcase at specific position."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Add first item
        add_data1 = {
            "media_description_ids": [str(test_media_descriptions[0].id)]
        }
        client.post(f"/api/v1/media-showcases/{created_showcase.id}/items", json=add_data1, headers=headers)

        # Add second item at position 0 (should be first)
        add_data2 = {
            "media_description_ids": [str(test_media_descriptions[1].id)],
            "position": 0
        }
        response = client.post(f"/api/v1/media-showcases/{created_showcase.id}/items", json=add_data2, headers=headers)
        assert response.status_code == 200

    def test_replace_showcase_items(self, client, admin_token, created_showcase, test_media_descriptions):
        """Test replacing all items in a showcase."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First add some items
        add_data = {
            "media_description_ids": [str(desc.id) for desc in test_media_descriptions[:2]]
        }
        client.post(f"/api/v1/media-showcases/{created_showcase.id}/items", json=add_data, headers=headers)

        # Replace with different item
        replace_data = {
            "media_description_ids": [str(test_media_descriptions[2].id)]
        }
        response = client.put(f"/api/v1/media-showcases/{created_showcase.id}/items", json=replace_data, headers=headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["new_item_count"] == 1

    def test_remove_showcase_items(self, client, admin_token, created_showcase, test_media_descriptions):
        """Test removing items from a showcase."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First add items
        add_data = {
            "media_description_ids": [str(desc.id) for desc in test_media_descriptions]
        }
        client.post(f"/api/v1/media-showcases/{created_showcase.id}/items", json=add_data, headers=headers)

        # Remove first two items
        remove_data = {
            "media_description_ids": [str(desc.id) for desc in test_media_descriptions[:2]]
        }
        response = client.request("DELETE", f"/api/v1/media-showcases/{created_showcase.id}/items", json=remove_data, headers=headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["items_affected"] == 2

    def test_reorder_showcase_item(self, client, admin_token, created_showcase, test_media_descriptions):
        """Test reordering a single item in a showcase."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Add items first
        add_data = {
            "media_description_ids": [str(desc.id) for desc in test_media_descriptions]
        }
        client.post(f"/api/v1/media-showcases/{created_showcase.id}/items", json=add_data, headers=headers)

        # Reorder last item to first position
        reorder_data = {
            "media_description_id": str(test_media_descriptions[2].id),
            "new_priority": 0
        }
        response = client.put(f"/api/v1/media-showcases/{created_showcase.id}/items/reorder", json=reorder_data, headers=headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["items_affected"] == 1

    def test_get_showcase_by_slug(self, client, created_showcase):
        """Test getting a showcase by slug."""
        response = client.get(f"/api/v1/media-showcases/by-slug/{created_showcase.slug}")
        assert response.status_code == 200
        
        showcase = response.json()
        assert showcase["id"] == str(created_showcase.id)
        assert showcase["slug"] == created_showcase.slug

    def test_get_showcase_by_slug_not_found(self, client):
        """Test getting a showcase by non-existent slug."""
        response = client.get("/api/v1/media-showcases/by-slug/non-existent-slug")
        assert response.status_code == 404

    def test_get_showcase_json_cache(self, client, created_showcase):
        """Test getting cached JSON representation."""
        response = client.get(f"/api/v1/media-showcases/{created_showcase.id}/json")
        assert response.status_code == 200
        
        json_response = response.json()
        assert "showcase" in json_response
        showcase_json = json_response["showcase"]
        assert showcase_json["id"] == str(created_showcase.id)
        assert showcase_json["title"] == created_showcase.title
        assert "items" in showcase_json

    def test_get_showcase_json_with_refresh(self, client, created_showcase):
        """Test getting JSON cache with refresh parameter."""
        response = client.get(f"/api/v1/media-showcases/{created_showcase.id}/json?refresh=true")
        assert response.status_code == 200
        
        json_response = response.json()
        assert "showcase" in json_response

    def test_refresh_showcase_cache(self, client, admin_token, created_showcase):
        """Test refreshing showcase cache."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(f"/api/v1/media-showcases/{created_showcase.id}/refresh-cache", headers=headers)
        assert response.status_code == 200
        
        refreshed_showcase = response.json()
        assert refreshed_showcase["id"] == str(created_showcase.id)

    def test_search_media_showcases(self, client, created_showcase):
        """Test searching showcases by title."""
        # Search for part of the title
        search_term = "API"
        response = client.get(f"/api/v1/media-showcases/search/?q={search_term}")
        assert response.status_code == 200
        
        search_results = response.json()
        assert "data" in search_results
        assert "pagination" in search_results
        
        # Should find our test showcase
        found_titles = [item["title"] for item in search_results["data"]]
        assert any("API" in title for title in found_titles)

    def test_search_media_showcases_no_results(self, client):
        """Test searching with no results."""
        response = client.get("/api/v1/media-showcases/search/?q=NonExistentShowcase")
        assert response.status_code == 200
        
        search_results = response.json()
        assert len(search_results["data"]) == 0

    def test_search_showcases_with_pagination(self, client, created_showcase):
        """Test search with pagination parameters."""
        response = client.get("/api/v1/media-showcases/search/?q=API&skip=0&limit=1")
        assert response.status_code == 200
        
        search_results = response.json()
        pagination = search_results["pagination"]
        assert pagination["skip"] == 0
        assert pagination["limit"] == 1

    def test_json_structure_final_format(self, client, admin_token, created_showcase, test_media_descriptions):
        """Test that JSON structure matches final specification (no file_number, synopsis_text)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Add a media description to the showcase
        add_data = {
            "media_description_ids": [str(test_media_descriptions[0].id)]
        }
        client.post(f"/api/v1/media-showcases/{created_showcase.id}/items", json=add_data, headers=headers)
        
        # Get JSON representation
        response = client.get(f"/api/v1/media-showcases/{created_showcase.id}/json")
        assert response.status_code == 200
        
        json_data = response.json()["showcase"]
        
        # Verify showcase-level fields
        assert "priority_in_screen" in json_data
        assert json_data["priority_in_screen"] == created_showcase.priority_in_screen
        
        # Verify items structure
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]
        
        # Required fields present
        required_fields = [
            "id", "title", "media_type", "friendly_url", "slug",
            "media_categories_list", "descriptive_summary_text",
            "is_featured", "thumbnail_url", "display_order"
        ]
        for field in required_fields:
            assert field in item, f"Missing required field: {field}"
        
        # Removed fields should not be present
        removed_fields = ["file_number", "synopsis_text", "is_premium_content", 
                         "production_year", "content_status", "main_video_file_id"]
        for field in removed_fields:
            assert field not in item, f"Removed field should not be present: {field}"
        
        # Verify field values
        assert item["title"] == test_media_descriptions[0].episode_title  # Renamed from episode_title
        assert item["display_order"] == 0  # Item-level priority, not showcase priority

    def test_api_error_handling_not_found(self, client):
        """Test API error handling for various not found scenarios."""
        fake_id = str(uuid4())
        
        # Test various endpoints with non-existent ID
        endpoints_to_test = [
            f"/api/v1/media-showcases/{fake_id}",
            f"/api/v1/media-showcases/{fake_id}/items",
            f"/api/v1/media-showcases/{fake_id}/json",
        ]
        
        for endpoint in endpoints_to_test:
            response = client.get(endpoint)
            assert response.status_code == 404

    def test_api_validation_errors(self, client, admin_token):
        """Test API validation for invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Test creating showcase with invalid data
        invalid_data = {
            "title": "",  # Empty title should fail
            "thumbnail_format": "invalid_format",
            "percentage_width": 0  # Below minimum (ge=1) should fail
        }

        response = client.post("/api/v1/media-showcases/", json=invalid_data, headers=headers)
        assert response.status_code == 422  # Validation error

    def test_pagination_parameters(self, client, created_showcase):
        """Test pagination parameters in list endpoints."""
        response = client.get("/api/v1/media-showcases/?skip=0&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        pagination = data["pagination"]
        assert pagination["skip"] == 0
        assert pagination["limit"] == 10
        assert "total" in pagination
        assert "page" in pagination
        assert "pages" in pagination

    def test_showcase_ordering_by_priority(self, client, admin_token, db: Session, sample_showcase_data):
        """Test that showcases are returned ordered by priority_in_screen."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Create showcases with different priorities
        priorities = [3, 1, 2]
        showcase_ids = []

        for i, priority in enumerate(priorities):
            data = sample_showcase_data.copy()
            data["title"] = f"Priority {priority} Showcase"
            data["slug"] = f"priority-{priority}-showcase"
            data["priority_in_screen"] = priority

            response = client.post("/api/v1/media-showcases/", json=data, headers=headers)
            assert response.status_code == 200
            showcase_ids.append(response.json()["id"])
        
        # Get all showcases
        response = client.get("/api/v1/media-showcases/")
        assert response.status_code == 200
        
        showcases = response.json()["data"]
        
        # Find our test showcases and verify they're ordered by priority
        test_showcases = [s for s in showcases if "Priority" in s["title"]]
        test_priorities = [s["priority_in_screen"] for s in test_showcases]
        
        # Should be in ascending order: [1, 2, 3]
        assert test_priorities == sorted(test_priorities)

    def test_create_showcase_with_media_descriptions_no_double_insertion(self, client, admin_token, test_media_descriptions):
        """Test creating a showcase with media descriptions doesn't cause double insertion bug."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create showcase with media descriptions
        showcase_data = {
            "title": "Double Insertion Test Showcase",
            "description": "Testing the double insertion fix",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": ListTypeEnum.carousel.value,
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 1,
            "slug": "double-insertion-test",
            "media_description_ids": [str(desc.id) for desc in test_media_descriptions[:2]]
        }

        response = client.post("/api/v1/media-showcases/", json=showcase_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        created_showcase = response.json()
        assert created_showcase["title"] == "Double Insertion Test Showcase"

        # Verify media descriptions were added exactly once
        response = client.get(f"/api/v1/media-showcases/{created_showcase['id']}/items")
        assert response.status_code == 200

        showcase_with_items = response.json()
        # Should have exactly 2 media descriptions (no duplicates)
        assert len(showcase_with_items.get("media_descriptions", [])) == 2 or len(showcase_with_items.get("items", [])) == 2

    def test_create_showcase_with_duplicate_media_description_ids(self, client, admin_token, test_media_descriptions):
        """Test creating a showcase with duplicate media description IDs in the request."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create showcase with duplicate media description IDs
        first_desc_id = str(test_media_descriptions[0].id)
        showcase_data = {
            "title": "Duplicate IDs Test Showcase",
            "description": "Testing duplicate ID handling",
            "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
            "list_type": ListTypeEnum.carousel.value,
            "percentage_width": 100,
            "percentage_height": 75,
            "is_active": True,
            "priority_in_screen": 1,
            "slug": "duplicate-ids-test",
            "media_description_ids": [first_desc_id, first_desc_id, first_desc_id]  # Same ID 3 times
        }

        response = client.post("/api/v1/media-showcases/", json=showcase_data, headers=headers)
        # Should succeed due to our idempotency checks
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        created_showcase = response.json()

        # Verify only one instance of the media description was added
        response = client.get(f"/api/v1/media-showcases/{created_showcase['id']}/items")
        assert response.status_code == 200

        showcase_with_items = response.json()
        # Should have exactly 1 media description (duplicates removed)
        actual_count = len(showcase_with_items.get("media_descriptions", [])) or len(showcase_with_items.get("items", []))
        assert actual_count == 1