import pytest
import uuid
from datetime import datetime
from fastapi import status
from app.crud.content_list import content_list as crud_content_list
from app.crud.program import program as crud_program
from app.crud.media_description import media_description as crud_media_description
from app.schemas.content_list import ContentListCreate, ContentListUpdate, ContentListReorderRequest, ThumbnailFormatEnum, ContentTypeEnum
from app.schemas.program import ProgramCreate
from app.schemas.media_description import MediaDescriptionCreate


@pytest.fixture
def sample_content_list_data():
    """Sample content list data for testing."""
    return {
        "title": "Test Content List",
        "description": "A test content list for unit testing",
        "thumbnail_format": ThumbnailFormatEnum.medium_portrait,
        "is_active": True,
        "display_order": 1,
        "content_items": [],
        "content_types": []
    }


@pytest.fixture
def sample_content_list_update_data():
    """Sample content list update data for testing."""
    return {
        "title": "Updated Test Content List",
        "description": "An updated test content list",
        "thumbnail_format": ThumbnailFormatEnum.large_landscape,
        "is_active": False,
        "display_order": 2
    }


@pytest.fixture
def sample_program_data():
    """Sample program data for testing content list items."""
    return {
        "program_name": "Test Program for Content List"
    }


@pytest.fixture
def sample_media_description_data():
    """Sample media description data for testing content list items."""
    return {
        "file_number": 12345,
        "episode_title": "Test Media for Content List",
        "media_type": "video",
        "file_name": "test_media.mp4",
        "descriptive_summary_text": "Test media for content list testing"
    }


class TestContentListCRUD:
    def test_create_content_list(self, db, sample_content_list_data):
        """Test creating a content list."""
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        assert content_list.title == sample_content_list_data["title"]
        assert content_list.description == sample_content_list_data["description"]
        assert content_list.thumbnail_format == sample_content_list_data["thumbnail_format"]
        assert content_list.is_active == sample_content_list_data["is_active"]
        assert content_list.display_order == sample_content_list_data["display_order"]
        assert content_list.id is not None
        assert content_list.creation_date_utc is not None

    def test_get_content_list(self, db, sample_content_list_data):
        """Test retrieving a content list by ID."""
        content_list_in = ContentListCreate(**sample_content_list_data)
        created_content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        retrieved_content_list = crud_content_list.get(db=db, id=created_content_list.id)
        assert retrieved_content_list is not None
        assert retrieved_content_list.id == created_content_list.id
        assert retrieved_content_list.title == created_content_list.title

    def test_get_content_list_by_title(self, db, sample_content_list_data):
        """Test retrieving a content list by title."""
        content_list_in = ContentListCreate(**sample_content_list_data)
        created_content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        retrieved_content_list = crud_content_list.get_by_title(db=db, title=created_content_list.title)
        assert retrieved_content_list is not None
        assert retrieved_content_list.id == created_content_list.id

    def test_update_content_list(self, db, sample_content_list_data, sample_content_list_update_data):
        """Test updating a content list."""
        content_list_in = ContentListCreate(**sample_content_list_data)
        created_content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        update_data = ContentListUpdate(**sample_content_list_update_data)
        updated_content_list = crud_content_list.update(db=db, db_obj=created_content_list, obj_in=update_data)
        
        assert updated_content_list.title == sample_content_list_update_data["title"]
        assert updated_content_list.description == sample_content_list_update_data["description"]
        assert updated_content_list.thumbnail_format == sample_content_list_update_data["thumbnail_format"]
        assert updated_content_list.is_active == sample_content_list_update_data["is_active"]

    def test_delete_content_list(self, db, sample_content_list_data):
        """Test deleting a content list."""
        content_list_in = ContentListCreate(**sample_content_list_data)
        created_content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        deleted_content_list = crud_content_list.remove(db=db, id=created_content_list.id)
        assert deleted_content_list.id == created_content_list.id
        
        # Verify it's actually deleted
        retrieved_content_list = crud_content_list.get(db=db, id=created_content_list.id)
        assert retrieved_content_list is None

    def test_get_active_lists(self, db, sample_content_list_data):
        """Test retrieving only active content lists."""
        # Create active content list
        active_data = sample_content_list_data.copy()
        active_data["is_active"] = True
        active_content_list_in = ContentListCreate(**active_data)
        crud_content_list.create(db=db, obj_in=active_content_list_in)
        
        # Create inactive content list
        inactive_data = sample_content_list_data.copy()
        inactive_data["title"] = "Inactive Content List"
        inactive_data["is_active"] = False
        inactive_content_list_in = ContentListCreate(**inactive_data)
        crud_content_list.create(db=db, obj_in=inactive_content_list_in)
        
        active_lists = crud_content_list.get_active_lists(db=db)
        assert len(active_lists) == 1
        assert active_lists[0].is_active is True

    def test_get_by_thumbnail_format(self, db, sample_content_list_data):
        """Test retrieving content lists by thumbnail format."""
        # Create content list with medium_portrait format
        medium_data = sample_content_list_data.copy()
        medium_data["thumbnail_format"] = ThumbnailFormatEnum.medium_portrait
        medium_content_list_in = ContentListCreate(**medium_data)
        crud_content_list.create(db=db, obj_in=medium_content_list_in)
        
        # Create content list with large_landscape format
        large_data = sample_content_list_data.copy()
        large_data["title"] = "Large Landscape Content List"
        large_data["thumbnail_format"] = ThumbnailFormatEnum.large_landscape
        large_content_list_in = ContentListCreate(**large_data)
        crud_content_list.create(db=db, obj_in=large_content_list_in)
        
        medium_lists = crud_content_list.get_by_thumbnail_format(
            db=db, thumbnail_format=ThumbnailFormatEnum.medium_portrait
        )
        assert len(medium_lists) == 1
        assert medium_lists[0].thumbnail_format == ThumbnailFormatEnum.medium_portrait

    def test_add_content_item(self, db, sample_content_list_data, sample_program_data):
        """Test adding a content item to a content list."""
        # Create content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        # Create program to add to content list
        program_in = ProgramCreate(**sample_program_data)
        program = crud_program.create(db=db, obj_in=program_in)
        
        # Add program to content list
        updated_content_list = crud_content_list.add_content_item(
            db=db, 
            content_list=content_list, 
            content_id=str(program.id), 
            content_type=ContentTypeEnum.program
        )
        
        assert len(updated_content_list.content_items) == 1
        assert len(updated_content_list.content_types) == 1
        assert updated_content_list.content_items[0] == str(program.id)
        assert updated_content_list.content_types[0] == ContentTypeEnum.program

    def test_remove_content_item(self, db, sample_content_list_data, sample_program_data):
        """Test removing a content item from a content list."""
        # Create content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        # Create program to add to content list
        program_in = ProgramCreate(**sample_program_data)
        program = crud_program.create(db=db, obj_in=program_in)
        
        # Add program to content list
        content_list = crud_content_list.add_content_item(
            db=db, 
            content_list=content_list, 
            content_id=str(program.id), 
            content_type=ContentTypeEnum.program
        )
        
        # Remove program from content list
        updated_content_list = crud_content_list.remove_content_item(
            db=db, 
            content_list=content_list, 
            content_id=str(program.id)
        )
        
        assert len(updated_content_list.content_items) == 0
        assert len(updated_content_list.content_types) == 0

    def test_reorder_content_items(self, db, sample_content_list_data, sample_program_data, sample_media_description_data):
        """Test reordering content items in a content list."""
        # Create content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        # Create program and media description
        program_in = ProgramCreate(**sample_program_data)
        program = crud_program.create(db=db, obj_in=program_in)
        
        media_in = MediaDescriptionCreate(**sample_media_description_data)
        media = crud_media_description.create(db=db, obj_in=media_in)
        
        # Add items to content list
        content_list.content_items = [str(program.id), str(media.id)]
        content_list.content_types = [ContentTypeEnum.program, ContentTypeEnum.media_description]
        db.add(content_list)
        db.commit()
        
        # Reorder items
        new_content_items = [str(media.id), str(program.id)]
        new_content_types = [ContentTypeEnum.media_description, ContentTypeEnum.program]
        
        updated_content_list = crud_content_list.reorder_content_items(
            db=db,
            content_list=content_list,
            new_content_items=new_content_items,
            new_content_types=new_content_types
        )
        
        assert updated_content_list.content_items == new_content_items
        assert updated_content_list.content_types == new_content_types

    def test_search_by_title(self, db, sample_content_list_data):
        """Test searching content lists by title."""
        # Create content lists with different titles
        search_data = sample_content_list_data.copy()
        search_data["title"] = "Searchable Content List"
        search_content_list_in = ContentListCreate(**search_data)
        crud_content_list.create(db=db, obj_in=search_content_list_in)
        
        other_data = sample_content_list_data.copy()
        other_data["title"] = "Other Content List"
        other_content_list_in = ContentListCreate(**other_data)
        crud_content_list.create(db=db, obj_in=other_content_list_in)
        
        # Search for "Searchable"
        results = crud_content_list.search_by_title(db=db, search_term="Searchable")
        assert len(results) == 1
        assert "Searchable" in results[0].title

    def test_count_active(self, db, sample_content_list_data):
        """Test counting active content lists."""
        # Create active content list
        active_data = sample_content_list_data.copy()
        active_data["is_active"] = True
        active_content_list_in = ContentListCreate(**active_data)
        crud_content_list.create(db=db, obj_in=active_content_list_in)
        
        # Create inactive content list
        inactive_data = sample_content_list_data.copy()
        inactive_data["title"] = "Inactive Content List"
        inactive_data["is_active"] = False
        inactive_content_list_in = ContentListCreate(**inactive_data)
        crud_content_list.create(db=db, obj_in=inactive_content_list_in)
        
        active_count = crud_content_list.count_active(db=db)
        assert active_count == 1


class TestContentListAPI:
    def test_get_content_lists_unauthorized(self, client):
        """Test that getting content lists without authentication fails."""
        response = client.get("/api/v1/content-lists/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_content_lists_user_access(self, client, user_token, db, sample_content_list_data):
        """Test that regular users can read content lists."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/content-lists/", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert len(data["data"]) >= 1

    def test_get_content_list_by_id_user_access(self, client, user_token, db, sample_content_list_data):
        """Test that regular users can read content list by ID."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/content-lists/{content_list.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(content_list.id)
        assert data["title"] == content_list.title

    def test_create_content_list_user_forbidden(self, client, user_token, sample_content_list_data):
        """Test that regular users cannot create content lists."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.post("/api/v1/content-lists/", json=sample_content_list_data, headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_content_list_admin_success(self, client, admin_token, sample_content_list_data):
        """Test that admin users can create content lists."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post("/api/v1/content-lists/", json=sample_content_list_data, headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == sample_content_list_data["title"]
        assert data["thumbnail_format"] == sample_content_list_data["thumbnail_format"]

    def test_create_content_list_duplicate_title(self, client, admin_token, db, sample_content_list_data):
        """Test that creating content list with duplicate title fails."""
        # Create first content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post("/api/v1/content-lists/", json=sample_content_list_data, headers=headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"]

    def test_update_content_list_user_forbidden(self, client, user_token, db, sample_content_list_data):
        """Test that regular users cannot update content lists."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        update_data = {"title": "Updated Title"}
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.put(f"/api/v1/content-lists/{content_list.id}", json=update_data, headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_content_list_admin_success(self, client, admin_token, db, sample_content_list_data):
        """Test that admin users can update content lists."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        update_data = {"title": "Updated Title"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.put(f"/api/v1/content-lists/{content_list.id}", json=update_data, headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == "Updated Title"

    def test_delete_content_list_user_forbidden(self, client, user_token, db, sample_content_list_data):
        """Test that regular users cannot delete content lists."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.delete(f"/api/v1/content-lists/{content_list.id}", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_content_list_admin_success(self, client, admin_token, db, sample_content_list_data):
        """Test that admin users can delete content lists."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.delete(f"/api/v1/content-lists/{content_list.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK

    def test_get_content_list_json_user_access(self, client, user_token, db, sample_content_list_data):
        """Test that regular users can read content list JSON."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/content-lists/{content_list.id}/json", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == content_list.title
        assert "items" in data

    def test_regenerate_json_user_forbidden(self, client, user_token, db, sample_content_list_data):
        """Test that regular users cannot regenerate JSON cache."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.post(f"/api/v1/content-lists/{content_list.id}/regenerate-json", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_regenerate_json_admin_success(self, client, admin_token, db, sample_content_list_data):
        """Test that admin users can regenerate JSON cache."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        content_list = crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(f"/api/v1/content-lists/{content_list.id}/regenerate-json", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "message" in data
        assert "content_list_id" in data

    def test_search_content_lists_user_access(self, client, user_token, db, sample_content_list_data):
        """Test that regular users can search content lists."""
        # Create a content list with searchable title
        search_data = sample_content_list_data.copy()
        search_data["title"] = "Searchable Content List"
        content_list_in = ContentListCreate(**search_data)
        crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/content-lists/search/by-title?search=Searchable", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "data" in data
        assert len(data["data"]) >= 1
        assert "Searchable" in data["data"][0]["title"]

    def test_get_stats_user_forbidden(self, client, user_token):
        """Test that regular users cannot access stats."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/content-lists/stats/summary", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_stats_admin_success(self, client, admin_token, db, sample_content_list_data):
        """Test that admin users can access stats."""
        # Create a content list
        content_list_in = ContentListCreate(**sample_content_list_data)
        crud_content_list.create(db=db, obj_in=content_list_in)
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/v1/content-lists/stats/summary", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "total_active_lists" in data
        assert "counts_by_thumbnail_format" in data


class TestContentListEdgeCases:
    def test_content_list_with_invalid_uuid_content_items(self, db, sample_content_list_data):
        """Test creating content list with invalid UUID content items."""
        invalid_data = sample_content_list_data.copy()
        invalid_data["content_items"] = ["invalid-uuid", "another-invalid-uuid"]
        invalid_data["content_types"] = [ContentTypeEnum.program, ContentTypeEnum.media_description]
        
        with pytest.raises(ValueError, match="Invalid UUID format"):
            ContentListCreate(**invalid_data)

    def test_content_list_mismatched_items_and_types(self, db, sample_content_list_data):
        """Test creating content list with mismatched content_items and content_types arrays."""
        invalid_data = sample_content_list_data.copy()
        invalid_data["content_items"] = [str(uuid.uuid4())]
        invalid_data["content_types"] = [ContentTypeEnum.program, ContentTypeEnum.media_description]
        
        with pytest.raises(ValueError, match="must have the same length"):
            ContentListCreate(**invalid_data)

    def test_reorder_with_mismatched_arrays(self):
        """Test reorder request with mismatched arrays."""
        with pytest.raises(ValueError, match="must have the same length"):
            ContentListReorderRequest(
                content_items=[str(uuid.uuid4())],
                content_types=[ContentTypeEnum.program, ContentTypeEnum.media_description]
            )

    def test_get_nonexistent_content_list(self, client, user_token):
        """Test getting nonexistent content list."""
        nonexistent_id = uuid.uuid4()
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/content-lists/{nonexistent_id}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_nonexistent_content_list(self, client, admin_token):
        """Test updating nonexistent content list."""
        nonexistent_id = uuid.uuid4()
        update_data = {"title": "Updated Title"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.put(f"/api/v1/content-lists/{nonexistent_id}", json=update_data, headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_nonexistent_content_list(self, client, admin_token):
        """Test deleting nonexistent content list."""
        nonexistent_id = uuid.uuid4()
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.delete(f"/api/v1/content-lists/{nonexistent_id}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_content_list_with_empty_title(self, client, admin_token):
        """Test creating content list with empty title."""
        invalid_data = {
            "title": "",
            "thumbnail_format": ThumbnailFormatEnum.medium_portrait,
            "is_active": True
        }
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post("/api/v1/content-lists/", json=invalid_data, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY