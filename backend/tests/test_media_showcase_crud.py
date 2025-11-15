import pytest
import uuid
from typing import List
from sqlalchemy.orm import Session

from app.crud.media_showcase import media_showcase as crud_media_showcase
from app.models.media_showcase import MediaShowcase
from app.models.media_description import MediaDescription
from app.models.media_theme import MediaTheme
from app.schemas.media_showcase import (
    MediaShowcaseCreate, 
    MediaShowcaseUpdate,
    ThumbnailFormatEnum,
    ListTypeEnum
)


@pytest.fixture
def sample_media_showcase_create():
    """Sample MediaShowcaseCreate data for testing."""
    return MediaShowcaseCreate(
        title="Test Media Showcase",
        description="A test media showcase for CRUD testing",
        thumbnail_format=ThumbnailFormatEnum.format_1920x1080,
        list_type=ListTypeEnum.carousel,
        percentage_width=100,
        percentage_height=80,
        latest_first=True,
        is_active=True,
        priority_in_screen=1,
        media_type="video",
        media_categories_list=["movie", "drama"],
        slug="test-showcase-crud",
        relative_url_link=None,
        media_description_ids=[],
        media_theme_ids=[]
    )


@pytest.fixture
def multiple_media_descriptions(db: Session) -> List[MediaDescription]:
    """Create multiple MediaDescriptions for testing."""
    descriptions = []
    for i in range(3):
        desc = MediaDescription(
            file_number=1000 + i,
            episode_title=f"Test Movie {i+1}",
            media_type="video",
            friendly_url=f"/watch/test-movie-{i+1}",
            slug=f"test-movie-{i+1}",
            media_categories_list=["movie"],
            descriptive_summary_text=f"Test movie {i+1} description",
            is_featured=(i == 0),  # Only first one featured
        )
        db.add(desc)
        descriptions.append(desc)
    
    db.commit()
    for desc in descriptions:
        db.refresh(desc)
    return descriptions


@pytest.fixture
def sample_media_theme(db: Session) -> MediaTheme:
    """Create a MediaTheme for testing."""
    theme = MediaTheme(
        name="Action",
        description="Action movies and shows"
    )
    db.add(theme)
    db.commit()
    db.refresh(theme)
    return theme


class TestMediaShowcaseCRUD:
    """Test MediaShowcase CRUD operations."""

    def test_create_showcase(self, db: Session, sample_media_showcase_create):
        """Test creating a MediaShowcase."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        assert showcase.id is not None
        assert showcase.title == sample_media_showcase_create.title
        assert showcase.description == sample_media_showcase_create.description
        assert showcase.thumbnail_format == sample_media_showcase_create.thumbnail_format.value
        assert showcase.priority_in_screen == sample_media_showcase_create.priority_in_screen
        assert showcase.slug == sample_media_showcase_create.slug
        assert showcase.is_active == sample_media_showcase_create.is_active

    def test_get_showcase_by_id(self, db: Session, sample_media_showcase_create):
        """Test getting a MediaShowcase by ID."""
        created_showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        retrieved_showcase = crud_media_showcase.get(db, id=created_showcase.id)
        
        assert retrieved_showcase is not None
        assert retrieved_showcase.id == created_showcase.id
        assert retrieved_showcase.title == created_showcase.title

    def test_get_showcase_by_title(self, db: Session, sample_media_showcase_create):
        """Test getting a MediaShowcase by title."""
        created_showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        retrieved_showcase = crud_media_showcase.get_by_title(db, title=created_showcase.title)
        
        assert retrieved_showcase is not None
        assert retrieved_showcase.id == created_showcase.id

    def test_get_showcase_by_slug(self, db: Session, sample_media_showcase_create):
        """Test getting a MediaShowcase by slug."""
        created_showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        retrieved_showcase = crud_media_showcase.get_by_slug(db, slug=created_showcase.slug)
        
        assert retrieved_showcase is not None
        assert retrieved_showcase.id == created_showcase.id

    def test_update_showcase(self, db: Session, sample_media_showcase_create):
        """Test updating a MediaShowcase."""
        created_showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        update_data = MediaShowcaseUpdate(
            title="Updated Title",
            description="Updated description",
            priority_in_screen=5,
            is_active=False
        )
        
        updated_showcase = crud_media_showcase.update(
            db, db_obj=created_showcase, obj_in=update_data
        )
        
        assert updated_showcase.title == "Updated Title"
        assert updated_showcase.description == "Updated description"
        assert updated_showcase.priority_in_screen == 5
        assert updated_showcase.is_active is False
        # Unchanged fields should remain the same
        assert updated_showcase.slug == sample_media_showcase_create.slug

    def test_delete_showcase(self, db: Session, sample_media_showcase_create):
        """Test deleting a MediaShowcase."""
        created_showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        showcase_id = created_showcase.id
        
        crud_media_showcase.remove(db, id=showcase_id)
        
        deleted_showcase = crud_media_showcase.get(db, id=showcase_id)
        assert deleted_showcase is None

    def test_get_active_showcases(self, db: Session, sample_media_showcase_create):
        """Test getting only active showcases ordered by priority_in_screen."""
        # Create active showcase
        active_data = sample_media_showcase_create.copy()
        active_data.title = "Active Showcase"
        active_data.slug = "active-showcase"
        active_data.priority_in_screen = 1
        active_data.is_active = True
        active_showcase = crud_media_showcase.create(db, obj_in=active_data)
        
        # Create inactive showcase
        inactive_data = sample_media_showcase_create.copy()
        inactive_data.title = "Inactive Showcase"
        inactive_data.slug = "inactive-showcase"
        inactive_data.priority_in_screen = 2
        inactive_data.is_active = False
        crud_media_showcase.create(db, obj_in=inactive_data)
        
        active_showcases = crud_media_showcase.get_active_showcases(db)
        
        # Should only return active showcase
        active_titles = [s.title for s in active_showcases]
        assert "Active Showcase" in active_titles
        assert "Inactive Showcase" not in active_titles

    def test_get_by_thumbnail_format(self, db: Session, sample_media_showcase_create):
        """Test getting showcases by thumbnail format."""
        # Create showcase with specific format
        format_1080_data = sample_media_showcase_create.copy()
        format_1080_data.thumbnail_format = ThumbnailFormatEnum.format_1080x1080
        format_1080_data.slug = "format-1080-showcase"
        format_1080_showcase = crud_media_showcase.create(db, obj_in=format_1080_data)
        
        # Create showcase with different format
        format_720_data = sample_media_showcase_create.copy()
        format_720_data.thumbnail_format = ThumbnailFormatEnum.format_1920x720
        format_720_data.slug = "format-720-showcase"
        crud_media_showcase.create(db, obj_in=format_720_data)
        
        showcases_1080 = crud_media_showcase.get_by_thumbnail_format(
            db, thumbnail_format=ThumbnailFormatEnum.format_1080x1080.value
        )
        
        assert len(showcases_1080) >= 1
        assert any(s.id == format_1080_showcase.id for s in showcases_1080)

    def test_add_media_descriptions(
        self, db: Session, sample_media_showcase_create, multiple_media_descriptions
    ):
        """Test adding MediaDescriptions to a showcase."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        media_desc_ids = [desc.id for desc in multiple_media_descriptions]
        
        updated_showcase = crud_media_showcase.add_media_descriptions(
            db, 
            showcase_id=showcase.id,
            media_description_ids=media_desc_ids
        )
        
        assert len(updated_showcase.media_descriptions) == 3
        added_ids = [desc.id for desc in updated_showcase.media_descriptions]
        for desc_id in media_desc_ids:
            assert desc_id in added_ids

    def test_add_media_descriptions_with_start_priority(
        self, db: Session, sample_media_showcase_create, multiple_media_descriptions
    ):
        """Test adding MediaDescriptions with specific start priority."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        # Add first description at priority 0
        crud_media_showcase.add_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=[multiple_media_descriptions[0].id],
            start_priority=0
        )
        
        # Add second description at priority 5
        crud_media_showcase.add_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=[multiple_media_descriptions[1].id],
            start_priority=5
        )
        
        # Verify priorities were set correctly
        from sqlalchemy import text
        priorities = db.execute(
            text("""
                SELECT media_description_id, priority_in_showcase 
                FROM media_showcase_media_descriptions 
                WHERE media_showcase_id = :showcase_id
                ORDER BY priority_in_showcase
            """),
            {"showcase_id": str(showcase.id).replace('-', '')}
        ).fetchall()
        
        assert len(priorities) == 2
        assert priorities[0][1] == 0  # First priority
        assert priorities[1][1] == 5  # Second priority

    def test_remove_media_descriptions(
        self, db: Session, sample_media_showcase_create, multiple_media_descriptions
    ):
        """Test removing MediaDescriptions from a showcase."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        # Add all descriptions
        all_ids = [desc.id for desc in multiple_media_descriptions]
        crud_media_showcase.add_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=all_ids
        )
        
        # Remove first two descriptions
        remove_ids = [multiple_media_descriptions[0].id, multiple_media_descriptions[1].id]
        updated_showcase = crud_media_showcase.remove_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=remove_ids
        )
        
        # Should have only one description left
        remaining_ids = [desc.id for desc in updated_showcase.media_descriptions]
        assert len(remaining_ids) == 1
        assert multiple_media_descriptions[2].id in remaining_ids
        assert multiple_media_descriptions[0].id not in remaining_ids
        assert multiple_media_descriptions[1].id not in remaining_ids

    def test_replace_all_media_descriptions(
        self, db: Session, sample_media_showcase_create, multiple_media_descriptions
    ):
        """Test replacing all MediaDescriptions in a showcase."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        # Add initial descriptions
        initial_ids = [multiple_media_descriptions[0].id, multiple_media_descriptions[1].id]
        crud_media_showcase.add_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=initial_ids
        )
        
        # Replace with different description
        new_ids = [multiple_media_descriptions[2].id]
        updated_showcase = crud_media_showcase.replace_all_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=new_ids
        )
        
        # Should have only the new description
        remaining_ids = [desc.id for desc in updated_showcase.media_descriptions]
        assert len(remaining_ids) == 1
        assert multiple_media_descriptions[2].id in remaining_ids

    def test_reorder_media_descriptions(
        self, db: Session, sample_media_showcase_create, multiple_media_descriptions
    ):
        """Test reordering MediaDescriptions in a showcase."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        # Add descriptions with initial order
        all_ids = [desc.id for desc in multiple_media_descriptions]
        crud_media_showcase.add_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=all_ids
        )
        
        # Reorder: put last item first
        reorder_items = [
            {
                "media_description_id": multiple_media_descriptions[2].id,
                "priority_in_showcase": 0
            },
            {
                "media_description_id": multiple_media_descriptions[0].id,
                "priority_in_showcase": 1
            }
        ]
        
        crud_media_showcase.reorder_media_descriptions(
            db,
            showcase_id=showcase.id,
            items=reorder_items
        )
        
        # Verify new order
        from sqlalchemy import text
        priorities = db.execute(
            text("""
                SELECT media_description_id, priority_in_showcase
                FROM media_showcase_media_descriptions
                WHERE media_showcase_id = :showcase_id
                ORDER BY priority_in_showcase
            """),
            {"showcase_id": str(showcase.id).replace('-', '')}
        ).fetchall()

        # First in order should be the reordered item
        assert len(priorities) > 0, "No records found in association table"
        assert str(priorities[0][0]) == str(multiple_media_descriptions[2].id).replace('-', '')
        assert priorities[0][1] == 0

    def test_refresh_json_cache(self, db: Session, sample_media_showcase_create):
        """Test refreshing JSON cache."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        # Initially no cached JSON
        assert showcase.json_content is None
        
        # Refresh cache
        updated_showcase = crud_media_showcase.refresh_json_cache(
            db, showcase_id=showcase.id
        )
        
        # Should now have cached JSON
        assert updated_showcase.json_content is not None
        assert updated_showcase.json_last_updated is not None

    def test_get_json_cache(self, db: Session, sample_media_showcase_create):
        """Test getting cached JSON."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        # Get JSON (should generate if not cached)
        json_data = crud_media_showcase.get_json_cache(
            db, showcase_id=showcase.id
        )
        
        assert json_data is not None
        assert json_data["id"] == str(showcase.id)
        assert json_data["title"] == showcase.title

    def test_search_by_title(self, db: Session, sample_media_showcase_create):
        """Test searching showcases by title."""
        # Create showcases with different titles
        search_data = sample_media_showcase_create.copy()
        search_data.title = "Action Movies Showcase"
        search_data.slug = "action-movies"
        action_showcase = crud_media_showcase.create(db, obj_in=search_data)
        
        drama_data = sample_media_showcase_create.copy()
        drama_data.title = "Drama Series Collection"
        drama_data.slug = "drama-series"
        crud_media_showcase.create(db, obj_in=drama_data)
        
        # Search for "Action"
        results = crud_media_showcase.search_by_title(db, search_term="Action")
        
        result_titles = [r.title for r in results]
        assert "Action Movies Showcase" in result_titles
        assert "Drama Series Collection" not in result_titles

    def test_get_multi_ordered(self, db: Session, sample_media_showcase_create):
        """Test getting showcases ordered by priority_in_screen."""
        # Create showcases with different priorities
        for i, priority in enumerate([3, 1, 2]):
            data = sample_media_showcase_create.copy()
            data.title = f"Showcase Priority {priority}"
            data.slug = f"showcase-priority-{priority}"
            data.priority_in_screen = priority
            crud_media_showcase.create(db, obj_in=data)
        
        # Get ordered showcases
        showcases = crud_media_showcase.get_multi_ordered(db, active_only=True)
        
        # Find our test showcases and verify order
        test_showcases = [s for s in showcases if s.title.startswith("Showcase Priority")]
        priorities = [s.priority_in_screen for s in test_showcases]
        
        # Should be ordered by priority: 1, 2, 3
        assert priorities == [1, 2, 3]

    def test_showcase_not_found_error(self, db: Session):
        """Test error handling for non-existent showcase."""
        non_existent_id = uuid.uuid4()
        
        with pytest.raises(ValueError, match="Showcase not found"):
            crud_media_showcase.add_media_descriptions(
                db,
                showcase_id=non_existent_id,
                media_description_ids=[uuid.uuid4()]
            )

    def test_get_with_items(
        self, db: Session, sample_media_showcase_create, multiple_media_descriptions
    ):
        """Test getting showcase with its ordered media descriptions."""
        showcase = crud_media_showcase.create(db, obj_in=sample_media_showcase_create)
        
        # Add descriptions
        crud_media_showcase.add_media_descriptions(
            db,
            showcase_id=showcase.id,
            media_description_ids=[desc.id for desc in multiple_media_descriptions]
        )
        
        # Get with items
        showcase_with_items = crud_media_showcase.get_with_items(
            db, showcase_id=showcase.id
        )
        
        assert showcase_with_items is not None
        assert len(showcase_with_items.media_descriptions) == 3