import pytest
import uuid
from datetime import datetime
from fastapi import status
from app.crud.screen_content import screen_content as crud_screen_content
from app.crud.content_list import content_list as crud_content_list
from app.schemas.screen_content import ScreenContentCreate, ScreenContentUpdate, ScreenContentReorderRequest, ScreenTypeEnum
from app.schemas.content_list import ContentListCreate, ThumbnailFormatEnum


@pytest.fixture
def sample_screen_content_data():
    """Sample screen content data for testing."""
    return {
        "title": "Test Screen Content",
        "description": "A test screen content for unit testing",
        "screen_type": ScreenTypeEnum.homepage,
        "is_active": True,
        "display_order": 1,
        "content_lists": []
    }


@pytest.fixture
def sample_screen_content_update_data():
    """Sample screen content update data for testing."""
    return {
        "title": "Updated Test Screen Content",
        "description": "An updated test screen content",
        "screen_type": ScreenTypeEnum.category,
        "is_active": False,
        "display_order": 2
    }


@pytest.fixture
def sample_content_list_data():
    """Sample content list data for testing screen content items."""
    return {
        "title": "Test Content List for Screen",
        "description": "A test content list for screen content testing",
        "thumbnail_format": ThumbnailFormatEnum.medium_portrait,
        "is_active": True,
        "display_order": 1,
        "content_items": [],
        "content_types": []
    }


class TestScreenContentCRUD:
    def test_create_screen_content(self, db, sample_screen_content_data):
        """Test creating a screen content."""
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        assert screen_content.title == sample_screen_content_data["title"]
        assert screen_content.description == sample_screen_content_data["description"]
        assert screen_content.screen_type == sample_screen_content_data["screen_type"]
        assert screen_content.is_active == sample_screen_content_data["is_active"]
        assert screen_content.display_order == sample_screen_content_data["display_order"]
        assert screen_content.id is not None
        assert screen_content.creation_date_utc is not None

    def test_get_screen_content(self, db, sample_screen_content_data):
        """Test retrieving a screen content by ID."""
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        created_screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        retrieved_screen_content = crud_screen_content.get(db=db, id=created_screen_content.id)
        assert retrieved_screen_content is not None
        assert retrieved_screen_content.id == created_screen_content.id
        assert retrieved_screen_content.title == created_screen_content.title

    def test_get_screen_content_by_title(self, db, sample_screen_content_data):
        """Test retrieving a screen content by title."""
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        created_screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        retrieved_screen_content = crud_screen_content.get_by_title(db=db, title=created_screen_content.title)
        assert retrieved_screen_content is not None
        assert retrieved_screen_content.id == created_screen_content.id

    def test_update_screen_content(self, db, sample_screen_content_data, sample_screen_content_update_data):
        """Test updating a screen content."""
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        created_screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        update_data = ScreenContentUpdate(**sample_screen_content_update_data)
        updated_screen_content = crud_screen_content.update(db=db, db_obj=created_screen_content, obj_in=update_data)
        
        assert updated_screen_content.title == sample_screen_content_update_data["title"]
        assert updated_screen_content.description == sample_screen_content_update_data["description"]
        assert updated_screen_content.screen_type == sample_screen_content_update_data["screen_type"]
        assert updated_screen_content.is_active == sample_screen_content_update_data["is_active"]

    def test_delete_screen_content(self, db, sample_screen_content_data):
        """Test deleting a screen content."""
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        created_screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        deleted_screen_content = crud_screen_content.remove(db=db, id=created_screen_content.id)
        assert deleted_screen_content.id == created_screen_content.id
        
        # Verify it's actually deleted
        retrieved_screen_content = crud_screen_content.get(db=db, id=created_screen_content.id)
        assert retrieved_screen_content is None

    def test_get_active_screens(self, db, sample_screen_content_data):
        """Test retrieving only active screen contents."""
        # Create active screen content
        active_data = sample_screen_content_data.copy()
        active_data["is_active"] = True
        active_screen_content_in = ScreenContentCreate(**active_data)
        crud_screen_content.create(db=db, obj_in=active_screen_content_in)
        
        # Create inactive screen content
        inactive_data = sample_screen_content_data.copy()
        inactive_data["title"] = "Inactive Screen Content"
        inactive_data["is_active"] = False
        inactive_screen_content_in = ScreenContentCreate(**inactive_data)
        crud_screen_content.create(db=db, obj_in=inactive_screen_content_in)
        
        active_screens = crud_screen_content.get_active_screens(db=db)
        assert len(active_screens) == 1
        assert active_screens[0].is_active is True

    def test_get_by_screen_type(self, db, sample_screen_content_data):
        """Test retrieving screen contents by screen type."""
        # Create homepage screen content
        homepage_data = sample_screen_content_data.copy()
        homepage_data["screen_type"] = ScreenTypeEnum.homepage
        homepage_screen_content_in = ScreenContentCreate(**homepage_data)
        crud_screen_content.create(db=db, obj_in=homepage_screen_content_in)
        
        # Create category screen content
        category_data = sample_screen_content_data.copy()
        category_data["title"] = "Category Screen Content"
        category_data["screen_type"] = ScreenTypeEnum.category
        category_screen_content_in = ScreenContentCreate(**category_data)
        crud_screen_content.create(db=db, obj_in=category_screen_content_in)
        
        homepage_screens = crud_screen_content.get_by_screen_type(
            db=db, screen_type=ScreenTypeEnum.homepage
        )
        assert len(homepage_screens) == 1
        assert homepage_screens[0].screen_type == ScreenTypeEnum.homepage

    def test_add_content_list(self, db, sample_screen_content_data, sample_content_list_data):
        """Test adding a content list to a screen content."""
        # Create screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        # Create content list to add to screen content
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        # Add content list to screen content
        updated_screen_content = crud_screen_content.add_content_list(
            db=db, 
            screen_content=screen_content, 
            content_list_id=str(content_list.id)
        )
        
        assert len(updated_screen_content.content_lists) == 1
        assert updated_screen_content.content_lists[0] == str(content_list.id)

    def test_remove_content_list(self, db, sample_screen_content_data, sample_content_list_data):
        """Test removing a content list from a screen content."""
        # Create screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        # Create content list to add to screen content
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        # Add content list to screen content
        screen_content = crud_screen_content.add_content_list(
            db=db, 
            screen_content=screen_content, 
            content_list_id=str(content_list.id)
        )
        
        # Remove content list from screen content
        updated_screen_content = crud_screen_content.remove_content_list(
            db=db, 
            screen_content=screen_content, 
            content_list_id=str(content_list.id)
        )
        
        assert len(updated_screen_content.content_lists) == 0

    def test_reorder_content_lists(self, db, sample_screen_content_data, sample_content_list_data):
        """Test reordering content lists in a screen content."""
        # Create screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        # Create two content lists
        content_list1_in = ContentListCreate(**sample_content_list_data)
        content_list1 = crud_content_list.create(db=db, obj_in=content_list1_in)
        
        content_list2_data = sample_content_list_data.copy()
        content_list2_data["title"] = "Second Content List"
        content_list2_in = ContentListCreate(**content_list2_data)
        content_list2 = crud_content_list.create(db=db, obj_in=content_list2_in)
        
        # Set initial order
        screen_content.content_lists = [str(content_list1.id), str(content_list2.id)]
        db.add(screen_content)
        db.commit()
        
        # Reorder content lists
        new_content_lists = [str(content_list2.id), str(content_list1.id)]
        
        updated_screen_content = crud_screen_content.reorder_content_lists(
            db=db,
            screen_content=screen_content,
            new_content_lists=new_content_lists
        )
        
        assert updated_screen_content.content_lists == new_content_lists

    def test_search_by_title(self, db, sample_screen_content_data):
        """Test searching screen contents by title."""
        # Create screen contents with different titles
        search_data = sample_screen_content_data.copy()
        search_data["title"] = "Searchable Screen Content"
        search_screen_content_in = ScreenContentCreate(**search_data)
        crud_screen_content.create(db=db, obj_in=search_screen_content_in)
        
        other_data = sample_screen_content_data.copy()
        other_data["title"] = "Other Screen Content"
        other_screen_content_in = ScreenContentCreate(**other_data)
        crud_screen_content.create(db=db, obj_in=other_screen_content_in)
        
        # Search for "Searchable"
        results = crud_screen_content.search_by_title(db=db, search_term="Searchable")
        assert len(results) == 1
        assert "Searchable" in results[0].title

    def test_count_active(self, db, sample_screen_content_data):
        """Test counting active screen contents."""
        # Create active screen content
        active_data = sample_screen_content_data.copy()
        active_data["is_active"] = True
        active_screen_content_in = ScreenContentCreate(**active_data)
        crud_screen_content.create(db=db, obj_in=active_screen_content_in)
        
        # Create inactive screen content
        inactive_data = sample_screen_content_data.copy()
        inactive_data["title"] = "Inactive Screen Content"
        inactive_data["is_active"] = False
        inactive_screen_content_in = ScreenContentCreate(**inactive_data)
        crud_screen_content.create(db=db, obj_in=inactive_screen_content_in)
        
        active_count = crud_screen_content.count_active(db=db)
        assert active_count == 1

    def test_get_primary_screen_by_type(self, db, sample_screen_content_data):
        """Test getting primary screen by type (lowest display_order)."""
        # Create first homepage screen
        first_data = sample_screen_content_data.copy()
        first_data["screen_type"] = ScreenTypeEnum.homepage
        first_data["display_order"] = 2
        first_screen_content_in = ScreenContentCreate(**first_data)
        crud_screen_content.create(db=db, obj_in=first_screen_content_in)
        
        # Create second homepage screen with lower display_order
        second_data = sample_screen_content_data.copy()
        second_data["title"] = "Primary Homepage Screen"
        second_data["screen_type"] = ScreenTypeEnum.homepage
        second_data["display_order"] = 1
        second_screen_content_in = ScreenContentCreate(**second_data)
        crud_screen_content.create(db=db, obj_in=second_screen_content_in)
        
        primary_screen = crud_screen_content.get_primary_screen_by_type(
            db=db, screen_type=ScreenTypeEnum.homepage
        )
        assert primary_screen is not None
        assert primary_screen.display_order == 1
        assert primary_screen.title == "Primary Homepage Screen"


class TestScreenContentAPI:
    def test_get_screen_contents_unauthorized(self, client):
        """Test that getting screen contents without authentication fails."""
        response = client.get("/api/v1/screen-contents/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_screen_contents_user_access(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users can read screen contents."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/screen-contents/", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert len(data["data"]) >= 1

    def test_get_screen_content_by_id_user_access(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users can read screen content by ID."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/screen-contents/{screen_content.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(screen_content.id)
        assert data["title"] == screen_content.title

    def test_create_screen_content_user_forbidden(self, client, user_token, sample_screen_content_data):
        """Test that regular users cannot create screen contents."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.post("/api/v1/screen-contents/", json=sample_screen_content_data, headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_screen_content_admin_success(self, client, admin_token, sample_screen_content_data):
        """Test that admin users can create screen contents."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post("/api/v1/screen-contents/", json=sample_screen_content_data, headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == sample_screen_content_data["title"]
        assert data["screen_type"] == sample_screen_content_data["screen_type"]

    def test_create_screen_content_duplicate_title(self, client, admin_token, db, sample_screen_content_data):
        """Test that creating screen content with duplicate title fails."""
        # Create first screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post("/api/v1/screen-contents/", json=sample_screen_content_data, headers=headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"]

    def test_update_screen_content_user_forbidden(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users cannot update screen contents."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        update_data = {"title": "Updated Title"}
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.put(f"/api/v1/screen-contents/{screen_content.id}", json=update_data, headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_screen_content_admin_success(self, client, admin_token, db, sample_screen_content_data):
        """Test that admin users can update screen contents."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        update_data = {"title": "Updated Title"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.put(f"/api/v1/screen-contents/{screen_content.id}", json=update_data, headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == "Updated Title"

    def test_delete_screen_content_user_forbidden(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users cannot delete screen contents."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.delete(f"/api/v1/screen-contents/{screen_content.id}", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_screen_content_admin_success(self, client, admin_token, db, sample_screen_content_data):
        """Test that admin users can delete screen contents."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.delete(f"/api/v1/screen-contents/{screen_content.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK

    def test_get_screen_content_json_user_access(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users can read screen content JSON."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/screen-contents/{screen_content.id}/json", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == screen_content.title
        assert "content_lists" in data

    def test_get_by_screen_type_user_access(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users can read screen contents by type."""
        # Create a homepage screen content
        homepage_data = sample_screen_content_data.copy()
        homepage_data["screen_type"] = ScreenTypeEnum.homepage
        screen_content_in = ScreenContentCreate(**homepage_data)
        crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/screen-contents/by-type/homepage", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["screen_type"] == "homepage"
        assert "screens" in data
        assert len(data["screens"]) >= 1

    def test_get_primary_homepage_screen_user_access(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users can read primary homepage screen."""
        # Create a homepage screen content
        homepage_data = sample_screen_content_data.copy()
        homepage_data["screen_type"] = ScreenTypeEnum.homepage
        screen_content_in = ScreenContentCreate(**homepage_data)
        crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/screen-contents/homepage/primary", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["screen_type"] == ScreenTypeEnum.homepage

    def test_regenerate_json_user_forbidden(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users cannot regenerate JSON cache."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        screen_content = crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.post(f"/api/v1/screen-contents/{screen_content.id}/regenerate-json", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_search_screen_contents_user_access(self, client, user_token, db, sample_screen_content_data):
        """Test that regular users can search screen contents."""
        # Create a screen content with searchable title
        search_data = sample_screen_content_data.copy()
        search_data["title"] = "Searchable Screen Content"
        screen_content_in = ScreenContentCreate(**search_data)
        crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/screen-contents/search/by-title?search=Searchable", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "data" in data
        assert len(data["data"]) >= 1
        assert "Searchable" in data["data"][0]["title"]

    def test_get_stats_user_forbidden(self, client, user_token):
        """Test that regular users cannot access stats."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/screen-contents/stats/summary", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_stats_admin_success(self, client, admin_token, db, sample_screen_content_data):
        """Test that admin users can access stats."""
        # Create a screen content
        screen_content_in = ScreenContentCreate(**sample_screen_content_data)
        crud_screen_content.create(db=db, obj_in=screen_content_in)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/v1/screen-contents/stats/summary", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "total_active_screens" in data
        assert "counts_by_screen_type" in data


class TestScreenContentEdgeCases:
    def test_screen_content_with_invalid_uuid_content_lists(self, db, sample_screen_content_data):
        """Test creating screen content with invalid UUID content lists."""
        invalid_data = sample_screen_content_data.copy()
        invalid_data["content_lists"] = ["invalid-uuid", "another-invalid-uuid"]
        
        with pytest.raises(ValueError, match="Invalid UUID format"):
            ScreenContentCreate(**invalid_data)

    def test_reorder_with_invalid_uuids(self):
        """Test reorder request with invalid UUIDs."""
        with pytest.raises(ValueError, match="Invalid UUID format"):
            ScreenContentReorderRequest(
                content_lists=["invalid-uuid", "another-invalid-uuid"]
            )

    def test_get_nonexistent_screen_content(self, client, user_token):
        """Test getting nonexistent screen content."""
        nonexistent_id = uuid.uuid4()
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/screen-contents/{nonexistent_id}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_nonexistent_screen_content(self, client, admin_token):
        """Test updating nonexistent screen content."""
        nonexistent_id = uuid.uuid4()
        update_data = {"title": "Updated Title"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.put(f"/api/v1/screen-contents/{nonexistent_id}", json=update_data, headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_nonexistent_screen_content(self, client, admin_token):
        """Test deleting nonexistent screen content."""
        nonexistent_id = uuid.uuid4()
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.delete(f"/api/v1/screen-contents/{nonexistent_id}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_screen_content_with_empty_title(self, client, admin_token):
        """Test creating screen content with empty title."""
        invalid_data = {
            "title": "",
            "screen_type": ScreenTypeEnum.homepage,
            "is_active": True
        }
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post("/api/v1/screen-contents/", json=invalid_data, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_primary_homepage_screen_not_found(self, client, user_token):
        """Test getting primary homepage screen when none exists."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/screen-contents/homepage/primary", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND