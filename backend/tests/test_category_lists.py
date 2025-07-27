import pytest
import uuid
from datetime import datetime
from fastapi import status
from app.crud.category_list import category_list as crud_category_list
from app.crud.media_description import media_description as crud_media_description
from app.schemas.category_list import CategoryListCreate, CategoryListUpdate, CategoryListItemCreate, CategoryListItemUpdate
from app.schemas.media_description import MediaDescriptionCreate


@pytest.fixture
def sample_category_list_data():
    """Sample category list data for testing."""
    return {
        "name": "test_list",
        "title": "Test Category List",
        "description": "A test category list for unit testing",
        "is_active": True,
        "display_order": 1
    }


@pytest.fixture
def sample_category_list_update_data():
    """Sample category list update data for testing."""
    return {
        "title": "Updated Test Category List",
        "description": "An updated test category list",
        "is_active": False,
        "display_order": 2
    }


@pytest.fixture
def sample_media_description_data():
    """Sample media description data for testing category list items."""
    return {
        "file_number": 12345,
        "episode_title": "Test Media for Category",
        "media_type": "video",
        "file_name": "test_media.mp4",
        "descriptive_summary_text": "Test media for category list testing",
        "main_thumbnail_url": "https://example.com/thumbnail.jpg",
        "content_status": "published"
    }


@pytest.fixture
def sample_category_list_item_data():
    """Sample category list item data for testing."""
    return {
        "title": "Test Category Item",
        "display_order": 1,
        "is_active": True,
        "size_width": 300,
        "size_height": 200,
        "forward_link": "https://example.com/content"
    }


class TestCategoryListsAPI:
    """Test category lists CRUD operations."""
    
    def test_create_category_list_success(self, client, admin_token, sample_category_list_data):
        """Test successful creation of a category list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_category_list_data["name"]
        assert data["title"] == sample_category_list_data["title"]
        assert data["description"] == sample_category_list_data["description"]
        assert data["is_active"] == sample_category_list_data["is_active"]
        assert data["display_order"] == sample_category_list_data["display_order"]
        assert "id" in data
        assert "creation_date_utc" in data
    
    def test_create_category_list_unauthorized(self, client, sample_category_list_data):
        """Test category list creation without authentication."""
        response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data
        )
        
        assert response.status_code == 401
    
    def test_create_category_list_non_admin(self, client, user_token, sample_category_list_data):
        """Test category list creation with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        
        assert response.status_code == 403
    
    def test_create_category_list_duplicate_name(self, client, admin_token, sample_category_list_data):
        """Test creation of category list with duplicate name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first category list
        response1 = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert response1.status_code == 200
        
        # Try to create second with same name
        response2 = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert response2.status_code == 400
    
    def test_get_category_lists_success(self, client, admin_token):
        """Test successful retrieval of category lists."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/v1/category-lists", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
    
    def test_get_category_lists_with_pagination(self, client, admin_token, sample_category_list_data):
        """Test category lists retrieval with pagination."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create multiple category lists
        for i in range(5):
            test_data = sample_category_list_data.copy()
            test_data["name"] = f"test-list-{i}"
            test_data["title"] = f"Test List {i}"
            client.post("/api/v1/category-lists", json=test_data, headers=headers)
        
        # Test pagination
        response = client.get("/api/v1/category-lists?limit=3&skip=0", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 3
        assert data["pagination"]["limit"] == 3
        assert data["pagination"]["skip"] == 0
    
    def test_get_category_list_by_id_success(self, client, admin_token, sample_category_list_data):
        """Test successful retrieval of category list by ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        create_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert create_response.status_code == 200
        category_list_id = create_response.json()["id"]
        
        # Get category list by ID
        response = client.get(f"/api/v1/category-lists/{category_list_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == category_list_id
        assert data["name"] == sample_category_list_data["name"]
        assert "items" in data
        assert isinstance(data["items"], list)
    
    def test_get_category_list_by_id_not_found(self, client, admin_token):
        """Test retrieval of non-existent category list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/category-lists/{fake_id}", headers=headers)
        
        assert response.status_code == 404
    
    def test_update_category_list_success(self, client, admin_token, sample_category_list_data, sample_category_list_update_data):
        """Test successful update of category list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        create_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert create_response.status_code == 200
        category_list_id = create_response.json()["id"]
        
        # Update category list
        response = client.put(
            f"/api/v1/category-lists/{category_list_id}",
            json=sample_category_list_update_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == sample_category_list_update_data["title"]
        assert data["description"] == sample_category_list_update_data["description"]
        assert data["is_active"] == sample_category_list_update_data["is_active"]
        assert data["display_order"] == sample_category_list_update_data["display_order"]
    
    def test_delete_category_list_success(self, client, admin_token, sample_category_list_data):
        """Test successful deletion of category list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        create_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert create_response.status_code == 200
        category_list_id = create_response.json()["id"]
        
        # Delete category list
        response = client.delete(f"/api/v1/category-lists/{category_list_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify deletion
        get_response = client.get(f"/api/v1/category-lists/{category_list_id}", headers=headers)
        assert get_response.status_code == 404


class TestCategoryListItemsAPI:
    """Test category list items CRUD operations."""
    
    def test_create_category_list_item_success(self, client, admin_token, sample_category_list_data, sample_category_list_item_data):
        """Test successful creation of a category list item."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list first
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Add category_list_id to item data
        item_data = sample_category_list_item_data.copy()
        item_data["category_list_id"] = category_list_id
        
        # Create category list item
        response = client.post(
            f"/api/v1/category-lists/{category_list_id}/items",
            json=item_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == item_data["title"]
        assert data["display_order"] == item_data["display_order"]
        assert data["is_active"] == item_data["is_active"]
        assert data["category_list_id"] == category_list_id
    
    def test_create_category_list_item_with_media(self, client, admin_token, sample_category_list_data, sample_category_list_item_data, sample_media_description_data):
        """Test creation of category list item with associated media."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        media_response = client.post(
            "/api/v1/media-descriptions",
            json=sample_media_description_data,
            headers=headers
        )
        assert media_response.status_code == 200
        media_id = media_response.json()["id"]
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Create category list item with media reference
        item_data = sample_category_list_item_data.copy()
        item_data["category_list_id"] = category_list_id
        item_data["media_description_id"] = media_id
        
        response = client.post(
            f"/api/v1/category-lists/{category_list_id}/items",
            json=item_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["media_description_id"] == media_id
        assert data["media_title"] == sample_media_description_data["episode_title"]
        assert data["thumbnail_url"] == sample_media_description_data["main_thumbnail_url"]
    
    def test_get_category_list_items_success(self, client, admin_token, sample_category_list_data):
        """Test successful retrieval of category list items."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Get category list items
        response = client.get(f"/api/v1/category-lists/{category_list_id}/items", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
    
    def test_update_category_list_item_success(self, client, admin_token, sample_category_list_data, sample_category_list_item_data):
        """Test successful update of category list item."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Create category list item
        item_data = sample_category_list_item_data.copy()
        item_data["category_list_id"] = category_list_id
        
        item_response = client.post(
            f"/api/v1/category-lists/{category_list_id}/items",
            json=item_data,
            headers=headers
        )
        assert item_response.status_code == 200
        item_id = item_response.json()["id"]
        
        # Update category list item
        update_data = {
            "title": "Updated Item Title",
            "display_order": 5,
            "is_active": False
        }
        
        response = client.put(
            f"/api/v1/category-lists/{category_list_id}/items/{item_id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["display_order"] == update_data["display_order"]
        assert data["is_active"] == update_data["is_active"]
    
    def test_delete_category_list_item_success(self, client, admin_token, sample_category_list_data, sample_category_list_item_data):
        """Test successful deletion of category list item."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Create category list item
        item_data = sample_category_list_item_data.copy()
        item_data["category_list_id"] = category_list_id
        
        item_response = client.post(
            f"/api/v1/category-lists/{category_list_id}/items",
            json=item_data,
            headers=headers
        )
        assert item_response.status_code == 200
        item_id = item_response.json()["id"]
        
        # Delete category list item
        response = client.delete(f"/api/v1/category-lists/{category_list_id}/items/{item_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify deletion by getting items list
        items_response = client.get(f"/api/v1/category-lists/{category_list_id}/items", headers=headers)
        assert items_response.status_code == 200
        items_data = items_response.json()["data"]
        assert len(items_data) == 0


class TestCategoryListItemsOrdering:
    """Test category list items ordering functionality."""
    
    def test_update_items_order_success(self, client, admin_token, sample_category_list_data):
        """Test successful updating of category list items order."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Create multiple items
        item_ids = []
        for i in range(3):
            item_data = {
                "category_list_id": category_list_id,
                "title": f"Item {i+1}",
                "display_order": i + 1,
                "is_active": True
            }
            
            item_response = client.post(
                f"/api/v1/category-lists/{category_list_id}/items",
                json=item_data,
                headers=headers
            )
            assert item_response.status_code == 200
            item_ids.append(item_response.json()["id"])
        
        # Update order (reverse the order)
        order_update_data = {
            "items": [
                {"id": item_ids[2], "display_order": 1},
                {"id": item_ids[1], "display_order": 2},
                {"id": item_ids[0], "display_order": 3}
            ]
        }
        
        response = client.put(
            f"/api/v1/category-lists/{category_list_id}/items/order",
            json=order_update_data,
            headers=headers
        )
        
        assert response.status_code == 200
        
        # Verify new order
        items_response = client.get(f"/api/v1/category-lists/{category_list_id}/items", headers=headers)
        assert items_response.status_code == 200
        items = items_response.json()["data"]
        
        # Sort by display_order to check order
        items.sort(key=lambda x: x["display_order"])
        assert items[0]["id"] == item_ids[2]
        assert items[1]["id"] == item_ids[1]
        assert items[2]["id"] == item_ids[0]


class TestCategoryListJSON:
    """Test category list JSON generation and retrieval."""
    
    def test_get_category_list_json_success(self, client, admin_token, sample_category_list_data, sample_media_description_data):
        """Test successful retrieval of category list JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description
        media_response = client.post(
            "/api/v1/media-descriptions",
            json=sample_media_description_data,
            headers=headers
        )
        assert media_response.status_code == 200
        media_id = media_response.json()["id"]
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Create category list item with media
        item_data = {
            "category_list_id": category_list_id,
            "title": "Test Item",
            "display_order": 1,
            "is_active": True,
            "media_description_id": media_id
        }
        
        item_response = client.post(
            f"/api/v1/category-lists/{category_list_id}/items",
            json=item_data,
            headers=headers
        )
        assert item_response.status_code == 200
        
        # Regenerate JSON
        regenerate_response = client.post(
            f"/api/v1/category-lists/{category_list_id}/regenerate-json",
            headers=headers
        )
        assert regenerate_response.status_code == 200
        
        # Get JSON by list name
        response = client.get(f"/api/v1/category-lists/{sample_category_list_data['name']}/json")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_category_list_data["name"]
        assert data["title"] == sample_category_list_data["title"]
        assert "items" in data
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == item_data["title"]
        assert data["items"][0]["media_title"] == sample_media_description_data["episode_title"]
    
    def test_regenerate_category_list_json_success(self, client, admin_token, sample_category_list_data):
        """Test successful regeneration of category list JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Regenerate JSON
        response = client.post(
            f"/api/v1/category-lists/{category_list_id}/regenerate-json",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_regenerate_all_category_lists_json_success(self, client, admin_token, sample_category_list_data):
        """Test successful regeneration of all category lists JSON."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create multiple category lists
        created_ids = []
        for i in range(3):
            test_data = sample_category_list_data.copy()
            test_data["name"] = f"test_list_{'abcdefg'[i]}"
            test_data["title"] = f"Test List {i}"
            
            create_response = client.post("/api/v1/category-lists", json=test_data, headers=headers)
            assert create_response.status_code == 200
            created_ids.append(create_response.json()["id"])
        
        # Regenerate all JSON
        response = client.post("/api/v1/category-lists/regenerate-all-json", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "updated_count" in data
        assert "failed_count" in data
        assert data["updated_count"] >= 3


class TestCategoryListInitialization:
    """Test category list default initialization."""
    
    def test_initialize_default_categories_success(self, client, admin_token):
        """Test successful initialization of default categories."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/category-lists/initialize-defaults", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "created_categories" in data
        assert isinstance(data["created_categories"], list)
        
        # Verify some expected default categories were created
        expected_categories = ["home", "movies", "short_dramas", "webtoons", "dramas"]
        for category in expected_categories:
            assert category in data["created_categories"]
    
    def test_initialize_default_categories_unauthorized(self, client, user_token):
        """Test initialization of default categories with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/category-lists/initialize-defaults", headers=headers)
        
        assert response.status_code == 403


class TestCategoryListCRUDMethods:
    """Test CRUD methods directly (unit tests for crud layer)."""
    
    def test_create_default_categories_crud(self, db):
        """Test create_default_categories CRUD method."""
        from app.db.database import SessionLocal
        
        db_session = SessionLocal()
        try:
            created_categories = crud_category_list.create_default_categories(db_session)
            
            assert len(created_categories) > 0
            
            # Verify home category with sub-lists
            home_lists = [cat for cat in created_categories if cat.name == "welcome"]
            assert len(home_lists) == 1
            
            # Verify other default categories
            expected_categories = ["welcome", "movie", "tv-show", "short-drama", "webtoon"]
            created_names = [cat.name for cat in created_categories]
            
            for expected in expected_categories:
                assert expected in created_names
        
        finally:
            db_session.close()
    
    def test_update_json_method(self, db, sample_category_list_data, sample_media_description_data):
        """Test update_json method in CategoryList model."""
        from app.db.database import SessionLocal
        from app.crud.media_description import media_description as crud_media
        from app.schemas.media_description import MediaDescriptionCreate
        
        db_session = SessionLocal()
        try:
            # Create media description
            media_create = MediaDescriptionCreate(**sample_media_description_data)
            media = crud_media.create(db_session, obj_in=media_create)
            
            # Create category list
            list_create = CategoryListCreate(**sample_category_list_data)
            category_list = crud_category_list.create(db_session, obj_in=list_create)
            
            # Create category list item
            item_create = CategoryListItemCreate(
                category_list_id=category_list.id,
                title="Test Item",
                display_order=1,
                is_active=True,
                media_description_id=media.id
            )
            crud_category_list.create_item(db_session, obj_in=item_create)
            
            # Test update_json method
            category_list.update_json(db_session)
            db_session.commit()
            db_session.refresh(category_list)
            
            # Verify JSON was generated
            assert category_list.json_content is not None
            assert category_list.json_last_updated is not None
            
            # Parse and verify JSON content
            import json
            json_data = json.loads(category_list.json_content)
            assert json_data["name"] == category_list.name
            assert json_data["title"] == category_list.title
            assert len(json_data["items"]) == 1
            assert json_data["items"][0]["media_title"] == media.episode_title
        
        finally:
            db_session.close()


class TestCategoryListValidation:
    """Test validation and error cases."""
    
    def test_create_category_list_invalid_data(self, client, admin_token):
        """Test category list creation with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Missing required fields
        invalid_data = {
            "title": "Test List"
            # Missing 'name' field
        }
        
        response = client.post(
            "/api/v1/category-lists",
            json=invalid_data,
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_create_category_list_item_invalid_media_id(self, client, admin_token, sample_category_list_data):
        """Test creation of category list item with invalid media ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create category list
        list_response = client.post(
            "/api/v1/category-lists",
            json=sample_category_list_data,
            headers=headers
        )
        assert list_response.status_code == 200
        category_list_id = list_response.json()["id"]
        
        # Try to create item with invalid media ID
        item_data = {
            "category_list_id": category_list_id,
            "title": "Test Item",
            "display_order": 1,
            "is_active": True,
            "media_description_id": str(uuid.uuid4())  # Invalid ID
        }
        
        response = client.post(
            f"/api/v1/category-lists/{category_list_id}/items",
            json=item_data,
            headers=headers
        )
        
        assert response.status_code == 400
    
    def test_get_category_list_json_not_found(self, client):
        """Test retrieval of JSON for non-existent category list."""
        response = client.get("/api/v1/category-lists/non-existent-list/json")
        
        assert response.status_code == 404