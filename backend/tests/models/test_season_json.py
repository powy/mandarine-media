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
def sample_general_description(db: Session, sample_program, sample_season):
    """Create a general MediaDescription for the season."""
    media_desc = MediaDescription(
        file_number=2001,
        episode_title="Season 1 General Description",
        media_type="season",
        friendly_url="/season/season-1",
        slug="season-1-general",
        media_categories_list=["drama"],
        descriptive_summary_text="General description for Season 1",
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
def sample_episodes(db: Session, sample_program, sample_season):
    """Create multiple test episodes with different statuses."""
    episodes = []

    # Published episode 1
    ep1 = MediaDescription(
        file_number=3001,
        episode_title="Episode 1",
        media_type="video",
        friendly_url="/watch/ep1",
        slug="ep1",
        media_categories_list=["drama"],
        descriptive_summary_text="Episode 1 description",
        is_featured=False,
        production_year=2024,
        content_status="published",
        program_id=sample_program.id,
        season_id=sample_season.id,
        episode_number=1
    )
    db.add(ep1)
    episodes.append(ep1)

    # Published episode 2
    ep2 = MediaDescription(
        file_number=3002,
        episode_title="Episode 2",
        media_type="video",
        friendly_url="/watch/ep2",
        slug="ep2",
        media_categories_list=["drama"],
        descriptive_summary_text="Episode 2 description",
        is_featured=False,
        production_year=2024,
        content_status="published",
        program_id=sample_program.id,
        season_id=sample_season.id,
        episode_number=2
    )
    db.add(ep2)
    episodes.append(ep2)

    # Draft episode (should be filtered out)
    ep3 = MediaDescription(
        file_number=3003,
        episode_title="Episode 3 Draft",
        media_type="video",
        friendly_url="/watch/ep3",
        slug="ep3",
        media_categories_list=["drama"],
        descriptive_summary_text="Episode 3 draft",
        is_featured=False,
        production_year=2024,
        content_status="draft",
        program_id=sample_program.id,
        season_id=sample_season.id,
        episode_number=3
    )
    db.add(ep3)
    episodes.append(ep3)

    db.commit()
    for ep in episodes:
        db.refresh(ep)

    # Episodes are linked via season_id FK - no need for association table
    return episodes


@pytest.fixture
def sample_picture(db: Session, sample_general_description):
    """Create a test Picture for general description."""
    picture = Picture(
        image_url="https://example.com/season_1920x1080.jpg"
    )
    db.add(picture)
    db.commit()
    db.refresh(picture)

    # Link picture to general description
    sample_general_description.image_1920_1080_id = picture.id
    db.commit()
    db.refresh(sample_general_description)

    return picture


class TestSeasonUpdateJson:
    """Test Season.update_json() method."""

    def test_update_json_basic(self, db: Session, sample_season):
        """Test basic JSON generation without general description or episodes."""
        result = sample_season.update_json(db)

        assert result is not None
        assert result["id"] == str(sample_season.id)
        assert result["season_number"] == 1
        assert result["season_name"] == "Season 1"
        assert result["program_id"] == str(sample_season.program_id)
        assert result["episode_count"] == 0
        assert result["general_description"] is None
        assert result["episodes"] == []
        assert "creation_date_utc" in result
        assert "last_updated" in result

    def test_update_json_with_general_description(
        self, db: Session, sample_season, sample_general_description
    ):
        """Test JSON generation with general description."""
        sample_season.general_media_description_id = sample_general_description.id
        db.commit()
        db.refresh(sample_season)

        result = sample_season.update_json(db)

        assert result["general_description"] is not None
        assert result["general_description"]["id"] == str(sample_general_description.id)
        assert result["general_description"]["title"] == "Season 1 General Description"
        assert result["general_description"]["media_type"] == "season"

    def test_update_json_with_episodes(
        self, db: Session, sample_season, sample_episodes
    ):
        """Test JSON generation with episodes (filters published only)."""
        result = sample_season.update_json(db)

        # Should only include published episodes (2 out of 3)
        assert result["episode_count"] == 2
        assert len(result["episodes"]) == 2

        # Verify episodes are included
        episode_titles = [ep["title"] for ep in result["episodes"]]
        assert "Episode 1" in episode_titles
        assert "Episode 2" in episode_titles
        assert "Episode 3 Draft" not in episode_titles

    def test_update_json_stores_in_json_content(
        self, db: Session, sample_season, sample_episodes
    ):
        """Test that update_json stores result in json_content column."""
        sample_season.update_json(db)
        db.refresh(sample_season)

        assert sample_season.json_content is not None
        parsed = json.loads(sample_season.json_content)
        assert parsed["id"] == str(sample_season.id)
        assert parsed["episode_count"] == 2

    def test_update_json_updates_timestamp(
        self, db: Session, sample_season
    ):
        """Test that update_json updates json_last_updated."""
        from datetime import datetime, timezone
        before_time = datetime.now(timezone.utc)
        sample_season.update_json(db)
        db.refresh(sample_season)

        assert sample_season.json_last_updated is not None
        # SQLite doesn't preserve timezone info, so make before_time naive for comparison
        before_time_naive = before_time.replace(tzinfo=None)
        last_updated_naive = sample_season.json_last_updated.replace(tzinfo=None) if sample_season.json_last_updated.tzinfo else sample_season.json_last_updated
        assert last_updated_naive >= before_time_naive

    def test_update_json_with_pictures(
        self, db: Session, sample_season, sample_general_description, sample_picture
    ):
        """Test JSON generation includes image URLs from general description."""
        sample_season.general_media_description_id = sample_general_description.id
        db.commit()
        db.refresh(sample_season)

        result = sample_season.update_json(db)

        assert result["general_description"]["image_1920_1080_url"] == "https://example.com/season_1920x1080.jpg"

    def test_get_json_data(self, db: Session, sample_season, sample_episodes):
        """Test get_json_data() method returns parsed JSON."""
        sample_season.update_json(db)
        db.refresh(sample_season)

        json_data = sample_season.get_json_data()

        assert json_data is not None
        assert json_data["id"] == str(sample_season.id)
        assert json_data["episode_count"] == 2

    def test_get_json_data_when_empty(self, db: Session, sample_season):
        """Test get_json_data() returns None when json_content is empty."""
        json_data = sample_season.get_json_data()

        assert json_data is None

    def test_episode_order_in_json(self, db: Session, sample_season, sample_episodes):
        """Test that episodes include episode_order in JSON."""
        # Note: episode_order comes from season_episodes table
        # For this test, we're verifying the field is present in JSON
        result = sample_season.update_json(db)

        for episode in result["episodes"]:
            assert "episode_order" in episode
            # Default order is 0 if not set in season_episodes table
            assert isinstance(episode["episode_order"], int)
