import pytest
import uuid
from sqlalchemy.orm import Session

from app.models.media_description import MediaDescription
from app.models.program import Program
from app.models.season import Season
from app.models.picture import Picture
from app.utils.media_description_serializer import (
    serialize_media_description_to_json,
    _resolve_program_season_ids,
    _get_all_image_format_urls,
    _get_thumbnail_url
)


@pytest.fixture
def sample_program(db: Session):
    """Create a test Program."""
    program = Program(
        program_name="Test Program"
    )
    db.add(program)
    db.commit()
    db.refresh(program)
    return program


@pytest.fixture
def sample_season(db: Session, sample_program):
    """Create a test Season."""
    season = Season(
        program_id=sample_program.id,
        season_number=1,
        season_name="Season 1"
    )
    db.add(season)
    db.commit()
    db.refresh(season)
    return season


@pytest.fixture
def sample_media_description(db: Session, sample_program, sample_season):
    """Create a test MediaDescription (episode)."""
    media_desc = MediaDescription(
        file_number=1001,
        episode_title="Test Episode",
        media_type="video",
        friendly_url="/watch/test-episode",
        slug="test-episode",
        media_categories_list=["drama"],
        descriptive_summary_text="A test episode description",
        is_featured=True,
        production_year=2024,
        content_status="published",
        program_id=sample_program.id,
        season_id=sample_season.id,
        episode_number=1
    )
    db.add(media_desc)
    db.commit()
    db.refresh(media_desc)
    return media_desc


@pytest.fixture
def sample_season_media_description(db: Session, sample_program, sample_season):
    """Create a test MediaDescription with media_type='season'."""
    media_desc = MediaDescription(
        file_number=1002,
        episode_title="Season 1 Description",
        media_type="season",
        friendly_url="/season/season-1",
        slug="season-1-desc",
        media_categories_list=["drama"],
        descriptive_summary_text="Season 1 general description",
        is_featured=True,
        production_year=2024,
        content_status="published",
        season_id=sample_season.id
    )
    db.add(media_desc)
    db.commit()
    db.refresh(media_desc)
    return media_desc


@pytest.fixture
def sample_program_media_description(db: Session, sample_program):
    """Create a test MediaDescription with media_type='program'."""
    media_desc = MediaDescription(
        file_number=1003,
        episode_title="Program Description",
        media_type="program",
        friendly_url="/program/test-program",
        slug="test-program-desc",
        media_categories_list=["drama"],
        descriptive_summary_text="Program general description",
        is_featured=True,
        production_year=2024,
        content_status="published",
        program_id=sample_program.id
    )
    db.add(media_desc)
    db.commit()
    db.refresh(media_desc)
    return media_desc


@pytest.fixture
def sample_picture(db: Session, sample_media_description):
    """Create test Pictures and link them to MediaDescription."""
    picture1 = Picture(
        image_url="https://example.com/image_1920x1080.jpg"
    )
    picture2 = Picture(
        image_url="https://example.com/image_1920x720.jpg"
    )
    db.add(picture1)
    db.add(picture2)
    db.commit()
    db.refresh(picture1)
    db.refresh(picture2)

    # Link pictures to media description
    sample_media_description.image_1920_1080_id = picture1.id
    sample_media_description.image_1920_720_id = picture2.id
    db.commit()
    db.refresh(sample_media_description)

    return picture1


class TestSerializeMediaDescriptionToJson:
    """Test serialize_media_description_to_json function."""

    def test_basic_serialization(self, db: Session, sample_media_description):
        """Test basic serialization of MediaDescription."""
        result = serialize_media_description_to_json(sample_media_description, db)

        assert result["id"] == str(sample_media_description.id)
        assert result["title"] == "Test Episode"
        assert result["media_type"] == "video"
        assert result["friendly_url"] == "/watch/test-episode"
        assert result["slug"] == "test-episode"
        assert result["media_categories_list"] == ["drama"]
        assert result["descriptive_summary_text"] == "A test episode description"
        assert result["is_featured"] is True
        assert result["episode_number"] == 1
        assert result["program_id"] == str(sample_media_description.program_id)
        assert result["season_id"] == str(sample_media_description.season_id)

    def test_serialization_with_pictures(self, db: Session, sample_media_description, sample_picture):
        """Test serialization includes all image URLs."""
        result = serialize_media_description_to_json(sample_media_description, db)

        assert result["image_1920_1080_url"] == "https://example.com/image_1920x1080.jpg"
        assert result["image_1920_720_url"] == "https://example.com/image_1920x720.jpg"
        assert result["image_1080_1080_url"] is None
        assert result["image_810_1080_url"] is None
        assert result["image_1080_1920_url"] is None

    def test_serialization_with_thumbnail_format(self, db: Session, sample_media_description, sample_picture):
        """Test serialization with specific thumbnail format."""
        result = serialize_media_description_to_json(
            sample_media_description,
            db,
            thumbnail_format="1920x720"
        )

        assert result["thumbnail_url"] == "https://example.com/image_1920x720.jpg"

    def test_serialization_with_display_order(self, db: Session, sample_media_description):
        """Test serialization without display_order (caller adds it)."""
        assoc_id = uuid.uuid4()
        result = serialize_media_description_to_json(
            sample_media_description,
            db,
            include_display_order=True,
            association_id=assoc_id
        )

        # NOTE: display_order is NOT included by serializer function
        # It's context-specific and added by the caller (MediaShowcase, Season, etc.)
        assert "display_order" not in result


class TestResolveIds:
    """Test _resolve_program_season_ids helper function."""

    def test_resolve_regular_episode(self, db: Session, sample_media_description):
        """Test resolution for regular episode (has both program_id and season_id)."""
        program_id, season_id = _resolve_program_season_ids(sample_media_description, db)

        # Function returns strings for JSON serialization
        assert program_id == str(sample_media_description.program_id)
        assert season_id == str(sample_media_description.season_id)

    def test_resolve_season_media_type(self, db: Session, sample_season_media_description, sample_season):
        """Test resolution for media_type='season' (should fetch program_id from season)."""
        # Need to set the general_media_description_id on season for lookup
        sample_season.general_media_description_id = sample_season_media_description.id
        db.commit()

        program_id, season_id = _resolve_program_season_ids(sample_season_media_description, db)

        assert program_id == str(sample_season.program_id)
        assert season_id == str(sample_season.id)

    def test_resolve_program_media_type(self, db: Session, sample_program_media_description, sample_program):
        """Test resolution for media_type='program' (only program_id, no season)."""
        # Need to set the general_media_description_id on program for lookup
        sample_program.general_media_description_id = sample_program_media_description.id
        db.commit()

        program_id, season_id = _resolve_program_season_ids(sample_program_media_description, db)

        assert program_id == str(sample_program.id)
        assert season_id is None


class TestImageHelpers:
    """Test image URL helper functions."""

    def test_get_all_image_format_urls(self, db: Session, sample_media_description, sample_picture):
        """Test getting all 5 image format URLs."""
        urls = _get_all_image_format_urls(sample_media_description)

        assert urls["image_1920_1080_url"] == "https://example.com/image_1920x1080.jpg"
        assert urls["image_1920_720_url"] == "https://example.com/image_1920x720.jpg"
        assert urls["image_1080_1080_url"] is None
        assert urls["image_810_1080_url"] is None
        assert urls["image_1080_1920_url"] is None

    def test_get_thumbnail_url_existing_format(self, db: Session, sample_media_description, sample_picture):
        """Test getting thumbnail URL for existing format."""
        url = _get_thumbnail_url(sample_media_description, "1920x720")

        assert url == "https://example.com/image_1920x720.jpg"

    def test_get_thumbnail_url_missing_format(self, db: Session, sample_media_description, sample_picture):
        """Test getting thumbnail URL for non-existent format returns None."""
        url = _get_thumbnail_url(sample_media_description, "1080x1080")

        assert url is None
