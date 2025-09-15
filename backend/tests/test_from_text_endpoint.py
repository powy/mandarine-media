import pytest
from uuid import uuid4
from app.models.program import Program
from app.models.media_theme import MediaTheme
from app.models.public_person import PublicPerson
from app.models.media_description import MediaDescription
from app.core.security import create_access_token


class TestFromTextEndpoint:
    """Test suite for the create_media_description_from_text endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_data_minimal = {
            "episode_title": "Test Episode",
            "media_type": "video",
            "file_number": 1001,
            "program_names": ["Test Program"],
            "theme_names": ["Action"],
            "eligible_plan_names": ["Basic"]
        }
        
        self.test_data_full = {
            "episode_title": "Test Episode Full",
            "media_type": "video",
            "file_number": 1002,
            "program_names": ["Test Program", "Test Program 2"],
            "season_numbers": [1, 2],
            "theme_names": ["Action", "Drama"],
            "public_person_names": ["Test Actor", "Test Director"],
            "picture_names": ["Test Picture"],
            "country_names": ["USA", "Canada"],
            "audience_category_names": ["General", "Teen"],
            "eligible_plan_names": ["Premium", "Family"],
            "descriptive_summary_text": "A full test episode",
            "synopsis_text": "This is a synopsis",
            "production_year": 2024,
            "is_featured": True,
            "content_status": "draft"
        }

    def test_create_from_text_minimal_success(self, client, db, test_admin_user):
        """Test successful creation with minimal data"""
        # Create auth token for admin
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=self.test_data_minimal,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["episode_title"] == "Test Episode"
        assert data["media_type"] == "video"
        assert "id" in data
        assert "file_number" in data

    def test_create_from_text_full_success(self, client, db, test_admin_user):
        """Test successful creation with full data"""
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=self.test_data_full,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["episode_title"] == "Test Episode Full"
        assert data["descriptive_summary_text"] == "A full test episode"
        assert data["synopsis_text"] == "This is a synopsis"
        assert data["production_year"] == 2024
        assert data["is_featured"] is True
        assert data["content_status"] == "draft"

    def test_create_from_text_with_token_cost(self, client, db, test_admin_user):
        """Test creation with paid_token_cost field"""
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        test_data = {
            "episode_title": "Token Cost Test Episode",
            "media_type": "video",
            "file_number": 2001,
            "paid_token_cost": 150,
            "translation_share": 0.2,
            "sacem_share": 0.1,
            "other_share": 0.05,
            "revenue_share": 0.65
        }

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=test_data,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["episode_title"] == "Token Cost Test Episode"
        assert data["paid_token_cost"] == 150
        assert data["translation_share"] == 0.2
        assert data["sacem_share"] == 0.1
        assert data["other_share"] == 0.05
        assert data["revenue_share"] == 0.65

    def test_create_from_text_duplicate_file_number(self, client, db, test_admin_user):
        """Test creation fails with duplicate file_number"""
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        # Create first description
        response1 = client.post(
            "/api/v1/media-descriptions/from-text",
            json=self.test_data_minimal,
            headers=headers
        )
        assert response1.status_code == 200
        
        # Try to create another with same file_number
        response2 = client.post(
            "/api/v1/media-descriptions/from-text",
            json=self.test_data_minimal,
            headers=headers
        )
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"].lower()

    def test_create_from_text_auto_file_number(self, client, db, test_admin_user):
        """Test automatic file number generation"""
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}
        
        test_data = self.test_data_minimal.copy()
        if "file_number" in test_data:
            del test_data["file_number"]

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=test_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "file_number" in data
        assert data["file_number"] > 0

    def test_create_from_text_missing_required_field(self, client, db, test_admin_user):
        """Test creation fails when required field is missing"""
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Missing episode_title
        test_data = {
            "media_type": "video",
            "file_number": 1003
        }

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=test_data,
            headers=headers
        )
        
        assert response.status_code == 422

    def test_create_from_text_invalid_media_type(self, client, db, test_admin_user):
        """Test creation fails with invalid media_type"""
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}
        
        test_data = self.test_data_minimal.copy()
        test_data["media_type"] = "invalid_type"

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=test_data,
            headers=headers
        )
        
        assert response.status_code == 422

    def test_create_from_text_unauthorized(self, client, db):
        """Test creation fails without authentication"""
        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=self.test_data_minimal
        )
        
        assert response.status_code == 401

    def test_create_from_text_non_admin(self, client, db, test_regular_user):
        """Test creation fails for non-admin user"""
        access_token = create_access_token(subject=test_regular_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=self.test_data_minimal,
            headers=headers
        )
        
        assert response.status_code == 403

    def test_create_from_text_existing_entities_reused(self, client, db, test_admin_user):
        """Test that existing entities are reused correctly"""
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Pre-create some entities
        existing_program = Program(id=uuid4(), program_name="Test Program")
        existing_theme = MediaTheme(id=uuid4(), name="Action")
        existing_person = PublicPerson(id=uuid4(), stage_name_roman="Test Actor")
        
        db.add_all([existing_program, existing_theme, existing_person])
        db.commit()

        # Create media description with same entity names
        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=self.test_data_minimal,
            headers=headers
        )
        
        assert response.status_code == 200
        
        # Verify entities weren't duplicated
        programs_count = db.query(Program).filter(
            Program.program_name == "Test Program"
        ).count()
        assert programs_count == 1
        
        themes_count = db.query(MediaTheme).filter(
            MediaTheme.name == "Action"
        ).count()
        assert themes_count == 1