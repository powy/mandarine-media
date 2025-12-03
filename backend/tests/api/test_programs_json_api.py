import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.season import Season


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
def sample_program_with_json(db: Session, sample_program):
    """Create a program with JSON cache."""
    sample_program.update_json(db)
    db.refresh(sample_program)
    return sample_program


@pytest.fixture
def sample_seasons(db: Session, sample_program):
    """Create test seasons."""
    season1 = Season(
        program_id=sample_program.id,
        season_number=1,
        season_name="API Season 1"
    )
    season2 = Season(
        program_id=sample_program.id,
        season_number=2,
        season_name="API Season 2"
    )
    db.add(season1)
    db.add(season2)
    db.commit()
    db.refresh(season1)
    db.refresh(season2)
    return [season1, season2]


class TestGetProgramJsonEndpoint:
    """Test GET /programs/{program_id}/json endpoint."""

    def test_get_program_json_success(
        self, client: TestClient, db: Session,
        sample_program_with_json, admin_token
    ):
        """Test successfully retrieving program JSON cache."""
        response = client.get(
            f"/api/v1/programs/{sample_program_with_json.id}/json",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_program_with_json.id)
        assert data["program_name"] == "Test Program API"
        assert "seasons" in data

    def test_get_program_json_with_refresh(
        self, client: TestClient, db: Session,
        sample_program, sample_seasons, admin_token
    ):
        """Test retrieving program JSON with refresh query param."""
        # Initially no JSON cache
        assert sample_program.json_content is None

        response = client.get(
            f"/api/v1/programs/{sample_program.id}/json?refresh=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_program.id)
        assert data["season_count"] == 2

    def test_get_program_json_not_found(
        self, client: TestClient, admin_token
    ):
        """Test 404 when program doesn't exist."""
        import uuid
        fake_id = uuid.uuid4()

        response = client.get(
            f"/api/v1/programs/{fake_id}/json",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 404

    def test_get_program_json_public_access(
        self, client: TestClient, sample_program_with_json
    ):
        """Test endpoint allows public access (no auth required)."""
        response = client.get(
            f"/api/v1/programs/{sample_program_with_json.id}/json"
        )

        # JSON endpoints are public for performance/caching
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_program_with_json.id)


class TestRefreshProgramJsonEndpoint:
    """Test POST /programs/{program_id}/refresh-cache endpoint."""

    def test_refresh_program_json_success(
        self, client: TestClient, db: Session,
        sample_program, sample_seasons, admin_token
    ):
        """Test successfully refreshing program JSON cache."""
        response = client.post(
            f"/api/v1/programs/{sample_program.id}/refresh-cache",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_program.id)

        # Verify JSON was generated
        db.refresh(sample_program)
        assert sample_program.json_content is not None

    def test_refresh_program_json_not_found(
        self, client: TestClient, admin_token
    ):
        """Test 404 when program doesn't exist."""
        import uuid
        fake_id = uuid.uuid4()

        response = client.post(
            f"/api/v1/programs/{fake_id}/refresh-cache",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 404

    def test_refresh_program_json_requires_admin(
        self, client: TestClient, sample_program, user_token
    ):
        """Test endpoint requires admin privileges."""
        response = client.post(
            f"/api/v1/programs/{sample_program.id}/refresh-cache",
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 403


class TestRefreshAllProgramJsonsEndpoint:
    """Test POST /programs/refresh-all-caches endpoint."""

    def test_refresh_all_programs_success(
        self, client: TestClient, db: Session, admin_token
    ):
        """Test bulk refresh of all programs."""
        # Create multiple programs
        program1 = Program(program_name="Bulk Program 1")
        program2 = Program(program_name="Bulk Program 2")
        db.add(program1)
        db.add(program2)
        db.commit()

        response = client.post(
            "/api/v1/programs/refresh-all-caches",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] >= 2
        assert data["refreshed_count"] >= 2
        assert "failed_count" in data
        assert "errors" in data

    def test_refresh_all_programs_requires_admin(
        self, client: TestClient, user_token
    ):
        """Test endpoint requires admin privileges."""
        response = client.post(
            "/api/v1/programs/refresh-all-caches",
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 403
