import pytest
import uuid
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.media_showcase import MediaShowcase
from app.models.media_description import MediaDescription
from app.models.media_theme import MediaTheme
from app.schemas.media_showcase import ThumbnailFormatEnum, ListTypeEnum
from app.db.database import engine


@pytest.fixture
def sample_media_showcase_data():
    """Sample media showcase data for testing."""
    return {
        "title": "Test Media Showcase",
        "description": "A test media showcase for unit testing",
        "thumbnail_format": ThumbnailFormatEnum.format_1920x1080.value,
        "list_type": ListTypeEnum.carousel.value,
        "percentage_width": 100,
        "percentage_height": 80,
        "latest_first": True,
        "is_active": True,
        "priority_in_screen": 1,
        "media_type": "video",
        "media_categories_list": ["movie", "drama"],
        "slug": "test-showcase"
    }


@pytest.fixture
def sample_media_description(db: Session):
    """Create a test MediaDescription."""
    media_desc = MediaDescription(
        file_number=1001,
        episode_title="Test Movie",
        media_type="video",
        friendly_url="/watch/test-movie",
        slug="test-movie",
        media_categories_list=["movie", "drama"],
        descriptive_summary_text="A test movie description",
        is_featured=True,
        production_year=2024,
        content_status="published"
    )
    db.add(media_desc)
    db.commit()
    db.refresh(media_desc)
    return media_desc


@pytest.fixture  
def sample_media_theme(db: Session):
    """Create a test MediaTheme."""
    theme = MediaTheme(
        name="Test Theme"
    )
    db.add(theme)
    db.commit()
    db.refresh(theme)
    return theme


class TestMediaShowcaseModel:
    """Test MediaShowcase model functionality."""

    def test_create_media_showcase(self, db: Session, sample_media_showcase_data):
        """Test creating a MediaShowcase with all fields."""
        showcase = MediaShowcase(**sample_media_showcase_data)
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        assert showcase.id is not None
        assert showcase.title == sample_media_showcase_data["title"]
        assert showcase.description == sample_media_showcase_data["description"]
        assert showcase.thumbnail_format == sample_media_showcase_data["thumbnail_format"]
        assert showcase.priority_in_screen == sample_media_showcase_data["priority_in_screen"]
        assert showcase.list_type == sample_media_showcase_data["list_type"]
        assert showcase.percentage_width == sample_media_showcase_data["percentage_width"]
        assert showcase.percentage_height == sample_media_showcase_data["percentage_height"]
        assert showcase.is_active == sample_media_showcase_data["is_active"]
        assert showcase.latest_first == sample_media_showcase_data["latest_first"]
        assert showcase.slug == sample_media_showcase_data["slug"]
        assert showcase.creation_date_utc is not None
        assert showcase.last_updated_utc is not None

    def test_media_showcase_with_media_descriptions(
        self, db: Session, sample_media_showcase_data, sample_media_description
    ):
        """Test MediaShowcase relationship with MediaDescription."""
        showcase = MediaShowcase(**sample_media_showcase_data)
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        # Add MediaDescription to showcase
        showcase.media_descriptions.append(sample_media_description)
        db.commit()

        # Verify relationship
        assert len(showcase.media_descriptions) == 1
        assert showcase.media_descriptions[0].id == sample_media_description.id
        assert sample_media_description in showcase.media_descriptions

    def test_media_showcase_with_media_themes(
        self, db: Session, sample_media_showcase_data, sample_media_theme
    ):
        """Test MediaShowcase relationship with MediaTheme."""
        showcase = MediaShowcase(**sample_media_showcase_data)
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        # Add MediaTheme to showcase
        showcase.media_themes.append(sample_media_theme)
        db.commit()

        # Verify relationship
        assert len(showcase.media_themes) == 1
        assert showcase.media_themes[0].id == sample_media_theme.id
        assert sample_media_theme in showcase.media_themes

    def test_json_generation_basic(
        self, db: Session, sample_media_showcase_data
    ):
        """Test basic JSON generation without items."""
        showcase = MediaShowcase(**sample_media_showcase_data)
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        json_data = showcase.update_json(db)

        assert json_data["id"] == str(showcase.id)
        assert json_data["title"] == showcase.title
        assert json_data["description"] == showcase.description
        assert json_data["thumbnail_format"] == showcase.thumbnail_format
        assert json_data["priority_in_screen"] == showcase.priority_in_screen
        assert json_data["list_type"] == showcase.list_type
        assert json_data["width_percentage"] == showcase.percentage_width
        assert json_data["height_percentage"] == showcase.percentage_height
        assert json_data["is_active"] == showcase.is_active
        assert json_data["items"] == []
        assert json_data["last_updated"] is not None

    def test_json_generation_with_items(
        self, db: Session, sample_media_showcase_data, sample_media_description
    ):
        """Test JSON generation with MediaDescription items (final structure without file_number, synopsis_text)."""
        showcase = MediaShowcase(**sample_media_showcase_data)
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        # Add MediaDescription using ORM relationship
        showcase.media_descriptions.append(sample_media_description)
        db.commit()
        db.refresh(showcase)

        json_data = showcase.update_json(db)

        assert len(json_data["items"]) == 1
        item = json_data["items"][0]
        
        # Verify final item structure (without file_number, synopsis_text)
        assert item["id"] == str(sample_media_description.id)
        assert item["title"] == sample_media_description.episode_title  # Renamed from episode_title
        assert item["media_type"] == sample_media_description.media_type
        assert item["friendly_url"] == sample_media_description.friendly_url
        assert item["slug"] == sample_media_description.slug
        assert item["media_categories_list"] == sample_media_description.media_categories_list
        assert item["descriptive_summary_text"] == sample_media_description.descriptive_summary_text
        assert item["is_featured"] == sample_media_description.is_featured
        assert "thumbnail_url" in item
        assert item["display_order"] == 0
        
        # Verify removed fields are not present
        assert "file_number" not in item
        assert "synopsis_text" not in item
        assert "is_premium_content" not in item
        assert "production_year" not in item
        assert "content_status" not in item
        assert "main_video_file_id" not in item

    def test_thumbnail_url_generation(
        self, db: Session, sample_media_showcase_data, sample_media_description
    ):
        """Test thumbnail URL generation based on thumbnail_format."""
        # Test different thumbnail formats
        formats_to_test = [
            ThumbnailFormatEnum.format_1920x1080,
            ThumbnailFormatEnum.format_1920x720,
            ThumbnailFormatEnum.format_1080x1080,
            ThumbnailFormatEnum.format_810x1080,
            ThumbnailFormatEnum.format_1080x1920
        ]

        for format_enum in formats_to_test:
            showcase_data = sample_media_showcase_data.copy()
            showcase_data["thumbnail_format"] = format_enum.value
            showcase_data["slug"] = f"test-showcase-{format_enum.value.replace('x', '-')}"
            
            showcase = MediaShowcase(**showcase_data)
            
            # Test the helper method
            thumbnail_url = showcase._get_thumbnail_url(sample_media_description, format_enum.value)
            
            # Should return None since test MediaDescription doesn't have image IDs set
            assert thumbnail_url is None

    def test_json_caching(
        self, db: Session, sample_media_showcase_data
    ):
        """Test JSON caching functionality."""
        showcase = MediaShowcase(**sample_media_showcase_data)
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        # Initial state - no cached JSON
        assert showcase.json_content is None
        assert showcase.json_last_updated is None

        # Generate JSON
        json_data = showcase.update_json(db)

        # Verify JSON was cached
        assert showcase.json_content is not None
        assert showcase.json_last_updated is not None
        
        # Verify cached content matches generated data
        cached_data = json.loads(showcase.json_content)
        assert cached_data == json_data

    def test_priority_ordering(self, db: Session, sample_media_showcase_data):
        """Test priority_in_screen ordering functionality."""
        # Create multiple showcases with different priorities
        showcases = []
        for i, priority in enumerate([3, 1, 2]):
            data = sample_media_showcase_data.copy()
            data["title"] = f"Showcase {i+1}"
            data["priority_in_screen"] = priority
            data["slug"] = f"showcase-{i+1}"
            
            showcase = MediaShowcase(**data)
            db.add(showcase)
            showcases.append(showcase)
        
        db.commit()

        # Query showcases ordered by priority
        ordered_showcases = (
            db.query(MediaShowcase)
            .order_by(MediaShowcase.priority_in_screen)
            .all()
        )

        # Verify correct order (1, 2, 3)
        assert len(ordered_showcases) >= 3
        priorities = [s.priority_in_screen for s in ordered_showcases if s.title.startswith("Showcase")]
        expected_priorities = [1, 2, 3]
        assert priorities == expected_priorities

    def test_slug_uniqueness(self, db: Session, sample_media_showcase_data):
        """Test that slug field has unique constraint."""
        # Create first showcase
        showcase1 = MediaShowcase(**sample_media_showcase_data)
        db.add(showcase1)
        db.commit()

        # Try to create second showcase with same slug
        data2 = sample_media_showcase_data.copy()
        data2["title"] = "Different Title"
        showcase2 = MediaShowcase(**data2)
        db.add(showcase2)

        # This should raise an integrity error due to unique constraint
        with pytest.raises(Exception):  # SQLite raises IntegrityError
            db.commit()

    def test_required_fields(self, db: Session):
        """Test that required fields are enforced."""
        # Missing title should fail
        with pytest.raises(Exception):
            showcase = MediaShowcase(
                thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
                list_type=ListTypeEnum.classic.value,
                percentage_width=100,
                percentage_height=80
                # Missing title
            )
            db.add(showcase)
            db.commit()

    def test_default_values(self, db: Session):
        """Test default values for optional fields."""
        showcase = MediaShowcase(
            title="Test Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80
        )
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        assert showcase.is_active is True  # Default
        assert showcase.priority_in_screen == 0  # Default
        assert showcase.latest_first is False  # Default (model default is False)
        assert showcase.json_content is None
        assert showcase.json_last_updated is None