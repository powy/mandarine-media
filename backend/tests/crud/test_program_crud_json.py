import pytest
import json
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.season import Season
from app.crud.program import program as crud_program


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
def sample_program_with_json(db: Session, sample_program):
    """Create a program with JSON cache already generated."""
    sample_program.update_json(db)
    db.refresh(sample_program)
    return sample_program


@pytest.fixture
def sample_seasons(db: Session, sample_program):
    """Create test seasons."""
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
    db.refresh(season1)
    db.refresh(season2)
    return [season1, season2]


class TestProgramCrudRefreshJsonCache:
    """Test crud_program.refresh_json_cache() method."""

    def test_refresh_json_cache_success(self, db: Session, sample_program, sample_seasons):
        """Test successfully refreshing a program's JSON cache."""
        result = crud_program.refresh_json_cache(db, program_id=sample_program.id)

        assert result is not None
        assert result.id == sample_program.id
        assert result.json_content is not None
        assert result.json_last_updated is not None

        # Verify JSON content
        parsed = json.loads(result.json_content)
        assert parsed["id"] == str(sample_program.id)
        assert parsed["season_count"] == 2

    def test_refresh_json_cache_not_found(self, db: Session):
        """Test refresh raises ValueError when program not found."""
        import uuid
        fake_id = uuid.uuid4()

        with pytest.raises(ValueError, match="Program .* not found"):
            crud_program.refresh_json_cache(db, program_id=fake_id)


class TestProgramCrudGetJsonCache:
    """Test crud_program.get_json_cache() method."""

    def test_get_json_cache_existing(self, db: Session, sample_program_with_json):
        """Test retrieving existing JSON cache."""
        result = crud_program.get_json_cache(db, program_id=sample_program_with_json.id)

        assert result is not None
        assert result["id"] == str(sample_program_with_json.id)

    def test_get_json_cache_with_refresh(
        self, db: Session, sample_program, sample_seasons
    ):
        """Test get_json_cache with refresh=True generates new cache."""
        # Initially no JSON
        assert sample_program.json_content is None

        result = crud_program.get_json_cache(
            db, program_id=sample_program.id, refresh=True
        )

        assert result is not None
        assert result["id"] == str(sample_program.id)
        assert result["season_count"] == 2

    def test_get_json_cache_empty_auto_generates(self, db: Session, sample_program):
        """Test get_json_cache auto-generates JSON when cache is empty."""
        # Verify json_content is None initially
        assert sample_program.json_content is None

        result = crud_program.get_json_cache(db, program_id=sample_program.id, refresh=False)

        # Method auto-generates JSON when cache is empty (lazy generation)
        assert result is not None
        assert result["id"] == str(sample_program.id)


class TestProgramCrudRefreshAllJsonCaches:
    """Test crud_program.refresh_all_json_caches() method."""

    def test_refresh_all_success(self, db: Session):
        """Test bulk refresh of all programs."""
        # Create multiple programs
        program1 = Program(program_name="Program 1")
        program2 = Program(program_name="Program 2")
        db.add(program1)
        db.add(program2)
        db.commit()
        db.refresh(program1)
        db.refresh(program2)

        result = crud_program.refresh_all_json_caches(db)

        assert result["total_count"] >= 2
        assert result["refreshed_count"] >= 2
        assert result["failed_count"] == 0
        assert len(result["errors"]) == 0

        # Verify both programs have JSON
        db.refresh(program1)
        db.refresh(program2)
        assert program1.json_content is not None
        assert program2.json_content is not None

    def test_refresh_all_empty_database(self, db: Session):
        """Test bulk refresh when no programs exist."""
        # Delete all programs first
        db.query(Program).delete()
        db.commit()

        result = crud_program.refresh_all_json_caches(db)

        assert result["total_count"] == 0
        assert result["refreshed_count"] == 0
        assert result["failed_count"] == 0

    def test_refresh_all_handles_errors_gracefully(self, db: Session, sample_program, monkeypatch):
        """Test bulk refresh continues even if one program fails."""
        # This test verifies error handling by mocking a failure
        # In real scenarios, errors might occur due to data issues

        def mock_update_json_fail(self, db_session):
            raise Exception("Simulated error")

        # Temporarily replace update_json with failing version
        original_update_json = Program.update_json
        monkeypatch.setattr(Program, "update_json", mock_update_json_fail)

        result = crud_program.refresh_all_json_caches(db)

        # Restore original method
        monkeypatch.setattr(Program, "update_json", original_update_json)

        assert result["total_count"] >= 1
        assert result["failed_count"] >= 1
        assert len(result["errors"]) >= 1
