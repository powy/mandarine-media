import pytest
import uuid
from datetime import datetime
from fastapi import status
from app.crud.screen_description import screen_description as crud_screen_description
from app.schemas.screen_description import ScreenDescriptionCreate, ScreenDescriptionUpdate, ScreenTypeEnum


@pytest.fixture
def sample_screen_description_data():
    """Sample screen description data for testing."""
    return {
        "title": "Test Screen Description",
        "description": "A test screen description for unit testing",
        "screen_type": ScreenTypeEnum.homepage,
        "is_active": True,
        "display_order": 1,
        "in_top_menu": False,
        "media_showcases": []
    }


@pytest.fixture
def sample_screen_description_update_data():
    """Sample screen description update data for testing."""
    return {
        "title": "Updated Test Screen Description",
        "description": "An updated test screen description",
        "screen_type": ScreenTypeEnum.category,
        "is_active": False,
        "display_order": 2
    }


class TestScreenDescriptionCRUD:
    """Test CRUD operations for ScreenDescription model."""

    def test_create_screen_description_success(self, db, sample_screen_description_data):
        """Test successful creation of screen description."""
        screen_description_in = ScreenDescriptionCreate(**sample_screen_description_data)
        screen_description = crud_screen_description.create(db=db, obj_in=screen_description_in)

        assert screen_description.title == sample_screen_description_data["title"]
        assert screen_description.description == sample_screen_description_data["description"]
        assert screen_description.screen_type == sample_screen_description_data["screen_type"].value
        assert screen_description.is_active == sample_screen_description_data["is_active"]
        assert screen_description.display_order == sample_screen_description_data["display_order"]
        assert screen_description.media_showcases == []

    def test_read_screen_description_success(self, db, sample_screen_description_data):
        """Test successful reading of screen description."""
        screen_description_in = ScreenDescriptionCreate(**sample_screen_description_data)
        created_screen = crud_screen_description.create(db=db, obj_in=screen_description_in)

        retrieved_screen = crud_screen_description.get(db=db, id=created_screen.id)

        assert retrieved_screen is not None
        assert retrieved_screen.id == created_screen.id
        assert retrieved_screen.title == sample_screen_description_data["title"]

    def test_update_screen_description_success(self, db, sample_screen_description_data, sample_screen_description_update_data):
        """Test successful update of screen description."""
        screen_description_in = ScreenDescriptionCreate(**sample_screen_description_data)
        created_screen = crud_screen_description.create(db=db, obj_in=screen_description_in)

        screen_description_update = ScreenDescriptionUpdate(**sample_screen_description_update_data)
        updated_screen = crud_screen_description.update(db=db, db_obj=created_screen, obj_in=screen_description_update)

        assert updated_screen.title == sample_screen_description_update_data["title"]
        assert updated_screen.description == sample_screen_description_update_data["description"]
        assert updated_screen.screen_type == sample_screen_description_update_data["screen_type"].value
        assert updated_screen.is_active == sample_screen_description_update_data["is_active"]
        assert updated_screen.display_order == sample_screen_description_update_data["display_order"]

    def test_delete_screen_description_success(self, db, sample_screen_description_data):
        """Test successful deletion of screen description."""
        screen_description_in = ScreenDescriptionCreate(**sample_screen_description_data)
        created_screen = crud_screen_description.create(db=db, obj_in=screen_description_in)

        deleted_screen = crud_screen_description.remove(db=db, id=created_screen.id)

        assert deleted_screen.id == created_screen.id

        # Verify deletion
        retrieved_screen = crud_screen_description.get(db=db, id=created_screen.id)
        assert retrieved_screen is None

    def test_get_multi_screen_descriptions(self, db, sample_screen_description_data):
        """Test getting multiple screen descriptions."""
        # Create multiple screen descriptions
        for i in range(3):
            data = sample_screen_description_data.copy()
            data["title"] = f"Test Screen {i+1}"
            data["display_order"] = i + 1
            screen_description_in = ScreenDescriptionCreate(**data)
            crud_screen_description.create(db=db, obj_in=screen_description_in)

        screens = crud_screen_description.get_multi(db=db, limit=10)

        assert len(screens) >= 3

    def test_get_by_screen_type(self, db, sample_screen_description_data):
        """Test getting screen descriptions by screen type."""
        # Create screens with different types
        homepage_data = sample_screen_description_data.copy()
        homepage_data["screen_type"] = ScreenTypeEnum.homepage
        homepage_data["title"] = "Homepage Screen"

        category_data = sample_screen_description_data.copy()
        category_data["screen_type"] = ScreenTypeEnum.category
        category_data["title"] = "Category Screen"

        homepage_in = ScreenDescriptionCreate(**homepage_data)
        category_in = ScreenDescriptionCreate(**category_data)

        crud_screen_description.create(db=db, obj_in=homepage_in)
        crud_screen_description.create(db=db, obj_in=category_in)

        homepage_screens = crud_screen_description.get_by_screen_type(db=db, screen_type=ScreenTypeEnum.homepage)
        category_screens = crud_screen_description.get_by_screen_type(db=db, screen_type=ScreenTypeEnum.category)

        assert len(homepage_screens) >= 1
        assert len(category_screens) >= 1
        assert all(screen.screen_type == "homepage" for screen in homepage_screens)
        assert all(screen.screen_type == "category" for screen in category_screens)

    def test_get_active_screens(self, db, sample_screen_description_data):
        """Test getting active screen descriptions."""
        # Create active and inactive screens
        active_data = sample_screen_description_data.copy()
        active_data["is_active"] = True
        active_data["title"] = "Active Screen"

        inactive_data = sample_screen_description_data.copy()
        inactive_data["is_active"] = False
        inactive_data["title"] = "Inactive Screen"

        active_in = ScreenDescriptionCreate(**active_data)
        inactive_in = ScreenDescriptionCreate(**inactive_data)

        crud_screen_description.create(db=db, obj_in=active_in)
        crud_screen_description.create(db=db, obj_in=inactive_in)

        active_screens = crud_screen_description.get_active_screens(db=db)

        assert len(active_screens) >= 1
        assert all(screen.is_active for screen in active_screens)

    def test_media_showcase_operations(self, db, sample_screen_description_data):
        """Test media showcase operations on screen descriptions."""
        screen_description_in = ScreenDescriptionCreate(**sample_screen_description_data)
        created_screen = crud_screen_description.create(db=db, obj_in=screen_description_in)

        # Test adding media showcases
        showcase_id1 = str(uuid.uuid4())
        showcase_id2 = str(uuid.uuid4())

        created_screen.add_media_showcase(showcase_id1)
        created_screen.add_media_showcase(showcase_id2)

        assert len(created_screen.media_showcases) == 2
        assert showcase_id1 in created_screen.media_showcases
        assert showcase_id2 in created_screen.media_showcases

        # Test removing media showcase
        created_screen.remove_media_showcase(showcase_id1)

        assert len(created_screen.media_showcases) == 1
        assert showcase_id1 not in created_screen.media_showcases
        assert showcase_id2 in created_screen.media_showcases

        # Test reordering
        showcase_id3 = str(uuid.uuid4())
        new_order = [showcase_id3, showcase_id2]
        created_screen.reorder_media_showcases(new_order)

        assert created_screen.media_showcases == new_order
        assert created_screen.get_media_showcase_count() == 2