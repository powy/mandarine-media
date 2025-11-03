import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.season import Season
from app.models.media_description import MediaDescription


@pytest.fixture
def sample_program(db: Session):
    """Create a test Program."""
    program = Program(
        program_name="Test Program API"
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
        season_name="Season 1 API"
    )
    db.add(season)
    db.commit()
    db.refresh(season)
    return season


@pytest.fixture
def sample_season_with_json(db: Session, sample_season):
    """Create a season with JSON cache."""
    sample_season.update_json(db)
    db.refresh(sample_season)
    return sample_season


@pytest.fixture
def sample_episodes(db: Session, sample_program, sample_season):
    """Create test episodes."""
    ep1 = MediaDescription(
        file_number=5001,
        episode_title="API Episode 1",
        media_type="video",
        friendly_url="/watch/api-ep1",
        slug="api-ep1",
        media_categories_list=["drama"],
        descriptive_summary_text="API test episode 1",
        content_status="published",
        program_id=sample_program.id,
        season_id=sample_season.id,
        episode_number=1
    )
    ep2 = MediaDescription(
        file_number=5002,
        episode_title="API Episode 2",
        media_type="video",
        friendly_url="/watch/api-ep2",
        slug="api-ep2",
        media_categories_list=["drama"],
        descriptive_summary_text="API test episode 2",
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


class TestGetSeasonJsonEndpoint:
    """Test GET /seasons/{season_id}/json endpoint."""

    def test_get_season_json_success(
        self, client: TestClient, db: Session,
        sample_season_with_json, admin_token
    ):
        """Test successfully retrieving season JSON cache."""
        response = client.get(
            f"/api/v1/seasons/{sample_season_with_json.id}/json",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_season_with_json.id)
        assert data["season_number"] == 1
        assert "episodes" in data

    def test_get_season_json_with_refresh(
        self, client: TestClient, db: Session,
        sample_season, sample_episodes, admin_token
    ):
        """Test retrieving season JSON with refresh query param."""
        # Initially no JSON cache
        assert sample_season.json_content is None

        response = client.get(
            f"/api/v1/seasons/{sample_season.id}/json?refresh=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_season.id)
        assert data["episode_count"] == 2

    def test_get_season_json_not_found(
        self, client: TestClient, admin_token
    ):
        """Test 404 when season doesn't exist."""
        import uuid
        fake_id = uuid.uuid4()

        response = client.get(
            f"/api/v1/seasons/{fake_id}/json",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 404

    def test_get_season_json_public_access(
        self, client: TestClient, sample_season_with_json
    ):
        """Test endpoint allows public access (no auth required)."""
        response = client.get(
            f"/api/v1/seasons/{sample_season_with_json.id}/json"
        )

        # JSON endpoints are public for performance/caching
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_season_with_json.id)


class TestRefreshSeasonJsonEndpoint:
    """Test POST /seasons/{season_id}/refresh-cache endpoint."""

    def test_refresh_season_json_success(
        self, client: TestClient, db: Session,
        sample_season, sample_episodes, admin_token
    ):
        """Test successfully refreshing season JSON cache."""
        response = client.post(
            f"/api/v1/seasons/{sample_season.id}/refresh-cache",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_season.id)

        # Verify JSON was generated
        db.refresh(sample_season)
        assert sample_season.json_content is not None

    def test_refresh_season_json_not_found(
        self, client: TestClient, admin_token
    ):
        """Test 404 when season doesn't exist."""
        import uuid
        fake_id = uuid.uuid4()

        response = client.post(
            f"/api/v1/seasons/{fake_id}/refresh-cache",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 404

    def test_refresh_season_json_requires_admin(
        self, client: TestClient, sample_season, user_token
    ):
        """Test endpoint requires admin privileges."""
        response = client.post(
            f"/api/v1/seasons/{sample_season.id}/refresh-cache",
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 403


class TestRefreshAllSeasonJsonsEndpoint:
    """Test POST /seasons/refresh-all-caches endpoint."""

    def test_refresh_all_seasons_success(
        self, client: TestClient, db: Session,
        sample_program, admin_token
    ):
        """Test bulk refresh of all seasons."""
        # Create multiple seasons
        season1 = Season(
            program_id=sample_program.id,
            season_number=1,
            season_name="Bulk Season 1"
        )
        season2 = Season(
            program_id=sample_program.id,
            season_number=2,
            season_name="Bulk Season 2"
        )
        db.add(season1)
        db.add(season2)
        db.commit()

        response = client.post(
            "/api/v1/seasons/refresh-all-caches",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] >= 2
        assert data["refreshed_count"] >= 2
        assert "failed_count" in data
        assert "errors" in data

    def test_refresh_all_seasons_requires_admin(
        self, client: TestClient, user_token
    ):
        """Test endpoint requires admin privileges."""
        response = client.post(
            "/api/v1/seasons/refresh-all-caches",
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 403
