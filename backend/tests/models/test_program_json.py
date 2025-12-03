import pytest
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.season import Season
from app.models.media_description import MediaDescription
from app.models.picture import Picture


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
def sample_general_description(db: Session, sample_program):
    """Create a general MediaDescription for the program."""
    media_desc = MediaDescription(
        file_number=1001,
        episode_title="Test Program General Description",
        media_type="program",
        friendly_url="/program/test-program",
        slug="test-program-general",
        media_categories_list=["drama", "action"],
        descriptive_summary_text="General description for Test Program",
        is_featured=True,
        production_year=2024,
        content_status="published"
    )
    db.add(media_desc)
    db.commit()
    db.refresh(media_desc)
    return media_desc


@pytest.fixture
def sample_seasons(db: Session, sample_program):
    """Create multiple test seasons."""
    seasons = []

    # Season 1
    season1 = Season(
        program_id=sample_program.id,
        season_number=1,
        season_name="Season 1"
    )
    db.add(season1)
    seasons.append(season1)

    # Season 2
    season2 = Season(
        program_id=sample_program.id,
        season_number=2,
        season_name="Season 2"
    )
    db.add(season2)
    seasons.append(season2)

    db.commit()
    for season in seasons:
        db.refresh(season)

    return seasons


@pytest.fixture
def sample_picture(db: Session, sample_general_description):
    """Create a test Picture for general description."""
    picture = Picture(
        image_url="https://example.com/program_1920x1080.jpg"
    )
    db.add(picture)
    db.commit()
    db.refresh(picture)

    # Link picture to general description
    sample_general_description.image_1920_1080_id = picture.id
    db.commit()
    db.refresh(sample_general_description)

    return picture


class TestProgramUpdateJson:
    """Test Program.update_json() method."""

    def test_update_json_basic(self, db: Session, sample_program):
        """Test basic JSON generation without general description or seasons."""
        result = sample_program.update_json(db)

        assert result is not None
        assert result["id"] == str(sample_program.id)
        assert result["program_name"] == "Test Program"
        assert result["season_count"] == 0
        assert result["general_description"] is None
        assert result["seasons"] == []
        assert "creation_date_utc" in result
        assert "last_updated" in result

    def test_update_json_with_general_description(
        self, db: Session, sample_program, sample_general_description
    ):
        """Test JSON generation with general description."""
        sample_program.general_media_description_id = sample_general_description.id
        db.commit()
        db.refresh(sample_program)

        result = sample_program.update_json(db)

        assert result["general_description"] is not None
        assert result["general_description"]["id"] == str(sample_general_description.id)
        assert result["general_description"]["title"] == "Test Program General Description"
        assert result["general_description"]["media_type"] == "program"

    def test_update_json_with_seasons(
        self, db: Session, sample_program, sample_seasons
    ):
        """Test JSON generation with nested seasons."""
        result = sample_program.update_json(db)

        # Should include both seasons
        assert result["season_count"] == 2
        assert len(result["seasons"]) == 2

        # Verify seasons are included and ordered by season_number
        assert result["seasons"][0]["season_number"] == 1
        assert result["seasons"][1]["season_number"] == 2
        assert result["seasons"][0]["season_name"] == "Season 1"
        assert result["seasons"][1]["season_name"] == "Season 2"

    def test_update_json_regenerates_season_json(
        self, db: Session, sample_program, sample_seasons
    ):
        """Test that update_json regenerates season JSONs before including them."""
        # Pre-populate season JSON caches
        for season in sample_seasons:
            season.update_json(db)

        db.refresh(sample_program)

        # Update program JSON (should regenerate season JSONs)
        result = sample_program.update_json(db)

        # Verify seasons have their JSON content
        for season in sample_seasons:
            db.refresh(season)
            assert season.json_content is not None
            assert season.json_last_updated is not None

    def test_update_json_stores_in_json_content(
        self, db: Session, sample_program, sample_seasons
    ):
        """Test that update_json stores result in json_content column."""
        sample_program.update_json(db)
        db.refresh(sample_program)

        assert sample_program.json_content is not None
        parsed = json.loads(sample_program.json_content)
        assert parsed["id"] == str(sample_program.id)
        assert parsed["season_count"] == 2

    def test_update_json_updates_timestamp(
        self, db: Session, sample_program
    ):
        """Test that update_json updates json_last_updated."""
        before_time = datetime.now(timezone.utc)
        sample_program.update_json(db)
        db.refresh(sample_program)

        assert sample_program.json_last_updated is not None
        # SQLite doesn't preserve timezone info, so make before_time naive for comparison
        before_time_naive = before_time.replace(tzinfo=None)
        last_updated_naive = sample_program.json_last_updated.replace(tzinfo=None) if sample_program.json_last_updated.tzinfo else sample_program.json_last_updated
        assert last_updated_naive >= before_time_naive

    def test_update_json_with_pictures(
        self, db: Session, sample_program, sample_general_description, sample_picture
    ):
        """Test JSON generation includes image URLs from general description."""
        sample_program.general_media_description_id = sample_general_description.id
        db.commit()
        db.refresh(sample_program)

        result = sample_program.update_json(db)

        assert result["general_description"]["image_1920_1080_url"] == "https://example.com/program_1920x1080.jpg"

    def test_get_json_data(self, db: Session, sample_program, sample_seasons):
        """Test get_json_data() method returns parsed JSON."""
        sample_program.update_json(db)
        db.refresh(sample_program)

        json_data = sample_program.get_json_data()

        assert json_data is not None
        assert json_data["id"] == str(sample_program.id)
        assert json_data["season_count"] == 2

    def test_get_json_data_when_empty(self, db: Session, sample_program):
        """Test get_json_data() returns None when json_content is empty."""
        json_data = sample_program.get_json_data()

        assert json_data is None

    def test_nested_season_structure(self, db: Session, sample_program, sample_seasons):
        """Test that nested seasons have complete SeasonJSON structure."""
        result = sample_program.update_json(db)

        # Each season should have full SeasonJSON structure
        for season_json in result["seasons"]:
            assert "id" in season_json
            assert "season_number" in season_json
            assert "season_name" in season_json
            assert "program_id" in season_json
            assert "creation_date_utc" in season_json
            assert "last_updated" in season_json
            assert "episode_count" in season_json
            assert "episodes" in season_json
            assert season_json["program_id"] == str(sample_program.id)

    def test_general_description_uses_large_images(self, db: Session, sample_program, sample_general_description):
        """Test that program banners (general_description) prioritize large images."""
        # Create picture with all three variants
        picture = Picture(
            image_url="https://example.com/program-banner-original.jpg",
            large_image_url="https://example.com/program-banner-large.jpg",
            small_image_url="https://example.com/program-banner-small.jpg",
            file_name="program-banner.jpg",
            width=1920,
            height=1080
        )
        db.add(picture)
        db.commit()
        db.refresh(picture)

        # Link picture to general description
        sample_general_description.image_1920_1080_id = picture.id
        db.commit()
        db.refresh(sample_general_description)

        # Link general description to program
        sample_program.general_media_description_id = sample_general_description.id
        db.commit()
        db.refresh(sample_program)

        # Generate JSON
        result = sample_program.update_json(db)

        # Verify the banner uses large image (not small)
        assert result["general_description"] is not None
        assert result["general_description"]["thumbnail_url"] == "https://example.com/program-banner-large.jpg"
