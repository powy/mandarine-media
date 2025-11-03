import pytest
import json
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.season import Season
from app.models.media_description import MediaDescription
from app.crud.season import season as crud_season


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
def sample_season_with_json(db: Session, sample_season):
    """Create a season with JSON cache already generated."""
    sample_season.update_json(db)
    db.refresh(sample_season)
    return sample_season


@pytest.fixture
def sample_episodes(db: Session, sample_program, sample_season):
    """Create test episodes."""
    ep1 = MediaDescription(
        file_number=4001,
        episode_title="Episode 1",
        media_type="video",
        friendly_url="/watch/ep1",
        slug="ep1-test",
        media_categories_list=["drama"],
        descriptive_summary_text="Episode 1",
        content_status="published",
        program_id=sample_program.id,
        season_id=sample_season.id,
        episode_number=1
    )
    ep2 = MediaDescription(
        file_number=4002,
        episode_title="Episode 2",
        media_type="video",
        friendly_url="/watch/ep2",
        slug="ep2-test",
        media_categories_list=["drama"],
        descriptive_summary_text="Episode 2",
        content_status="published",
        program_id=sample_program.id,
        season_id=sample_season.id,
        episode_number=2
    )
    db.add(ep1)
    db.add(ep2)
    db.commit()
    db.refresh(ep1)
    db.refresh(ep2)

    # Episodes are linked via season_id FK - no need for association table
    return [ep1, ep2]


class TestSeasonCrudRefreshJsonCache:
    """Test crud_season.refresh_json_cache() method."""

    def test_refresh_json_cache_success(self, db: Session, sample_season, sample_episodes):
        """Test successfully refreshing a season's JSON cache."""
        result = crud_season.refresh_json_cache(db, season_id=sample_season.id)

        assert result is not None
        assert result.id == sample_season.id
        assert result.json_content is not None
        assert result.json_last_updated is not None

        # Verify JSON content
        parsed = json.loads(result.json_content)
        assert parsed["id"] == str(sample_season.id)
        assert parsed["episode_count"] == 2

    def test_refresh_json_cache_not_found(self, db: Session):
        """Test refresh raises ValueError when season not found."""
        import uuid
        fake_id = uuid.uuid4()

        with pytest.raises(ValueError, match="Season .* not found"):
            crud_season.refresh_json_cache(db, season_id=fake_id)


class TestSeasonCrudGetJsonCache:
    """Test crud_season.get_json_cache() method."""

    def test_get_json_cache_existing(self, db: Session, sample_season_with_json):
        """Test retrieving existing JSON cache."""
        result = crud_season.get_json_cache(db, season_id=sample_season_with_json.id)

        assert result is not None
        assert result["id"] == str(sample_season_with_json.id)

    def test_get_json_cache_with_refresh(
        self, db: Session, sample_season, sample_episodes
    ):
        """Test get_json_cache with refresh=True generates new cache."""
        # Initially no JSON
        assert sample_season.json_content is None

        result = crud_season.get_json_cache(
            db, season_id=sample_season.id, refresh=True
        )

        assert result is not None
        assert result["id"] == str(sample_season.id)
        assert result["episode_count"] == 2

    def test_get_json_cache_empty_auto_generates(self, db: Session, sample_season):
        """Test get_json_cache auto-generates JSON when cache is empty."""
        # Verify json_content is None initially
        assert sample_season.json_content is None

        result = crud_season.get_json_cache(db, season_id=sample_season.id, refresh=False)

        # Method auto-generates JSON when cache is empty (lazy generation)
        assert result is not None
        assert result["id"] == str(sample_season.id)


class TestSeasonCrudRefreshAllJsonCaches:
    """Test crud_season.refresh_all_json_caches() method."""

    def test_refresh_all_success(self, db: Session, sample_program):
        """Test bulk refresh of all seasons."""
        # Create multiple seasons
        season1 = Season(
            program_id=sample_program.id,
            season_number=1,
            season_name="Season 1"
        )
        season2 = Season(
            program_id=sample_program.id,
            season_number=2,
            season_name="Season 2"
        )
        db.add(season1)
        db.add(season2)
        db.commit()

        result = crud_season.refresh_all_json_caches(db)

        assert result["total_count"] == 2
        assert result["refreshed_count"] == 2
        assert result["failed_count"] == 0
        assert len(result["errors"]) == 0

        # Verify both seasons have JSON
        db.refresh(season1)
        db.refresh(season2)
        assert season1.json_content is not None
        assert season2.json_content is not None

    def test_refresh_all_empty_database(self, db: Session):
        """Test bulk refresh when no seasons exist."""
        # Delete all seasons first
        db.query(Season).delete()
        db.commit()

        result = crud_season.refresh_all_json_caches(db)

        assert result["total_count"] == 0
        assert result["refreshed_count"] == 0
        assert result["failed_count"] == 0

    def test_refresh_all_handles_errors_gracefully(self, db: Session, sample_season, monkeypatch):
        """Test bulk refresh continues even if one season fails."""
        # This test verifies error handling by mocking a failure
        # In real scenarios, errors might occur due to data issues

        def mock_update_json_fail(self, db_session):
            raise Exception("Simulated error")

        # Temporarily replace update_json with failing version
        original_update_json = Season.update_json
        monkeypatch.setattr(Season, "update_json", mock_update_json_fail)

        result = crud_season.refresh_all_json_caches(db)

        # Restore original method
        monkeypatch.setattr(Season, "update_json", original_update_json)

        assert result["total_count"] >= 1
        assert result["failed_count"] >= 1
        assert len(result["errors"]) >= 1
