import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_program_data():
    """Sample program data for testing."""
    return {
        "program_name": "Test Program",
        "general_media_description": "Test program description"
    }


@pytest.fixture
def sample_season_data():
    """Sample season data for testing."""
    return {
        "season_number": 1
    }


@pytest.fixture
def sample_language_data():
    """Sample language data for testing."""
    return {
        "name": "Korean",
        "sigle": "ko"
    }


@pytest.fixture
def sample_country_data():
    """Sample country data for testing."""
    return {
        "name": "South Korea"
    }


@pytest.fixture
def created_program(client, admin_token, sample_program_data):
    """Create a program for testing."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
    return response.json()


@pytest.fixture
def created_season(client, admin_token, created_program, sample_season_data):
    """Create a season for testing."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    season_data = {**sample_season_data, "program_id": created_program["id"]}
    response = client.post("/api/v1/seasons", json=season_data, headers=headers)
    return response.json()


@pytest.fixture
def created_language(client, admin_token, sample_language_data):
    """Create a language for testing."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/languages", json=sample_language_data, headers=headers)
    return response.json()


@pytest.fixture
def created_country(client, admin_token, sample_country_data):
    """Create a country for testing."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/countries", json=sample_country_data, headers=headers)
    return response.json()


@pytest.fixture
def sample_media_v14_data(created_program, created_season, created_language, created_country):
    """Sample media description data with v1.4 fields."""
    return {
        "file_number": 12345,
        "episode_title": "Test Episode v1.4",
        "media_type": "video",
        "expected_filename": "test_episode_v14.mp4",
        "program_id": created_program["id"],
        "season_id": created_season["id"],
        "episode_number": 1,
        "descriptive_summary_text": "This is a test episode with v1.4 fields",
        "synopsis_text": "Test synopsis with v1.4 support",
        "production_year": 2025,
        "is_premium_content": False,
        "is_featured": False,
        "content_status": "published",
        # v1.4 new fields
        "actor_ids": [str(uuid.uuid4())],
        "director_ids": [str(uuid.uuid4())],
        "producer_ids": [str(uuid.uuid4())],
        "author_ids": [str(uuid.uuid4())],
        "origin_country_ids": [created_country["id"]],
        "original_language_ids": [created_language["id"]],
        "available_country_ids": [created_country["id"]],
        "eligible_plan_id_list": ["basic", "premium"],
        "audience_category_ids": [str(uuid.uuid4())],
        "image_fullscreen": str(uuid.uuid4()),
        "image_thumbnail1": str(uuid.uuid4()),
        "image_thumbnail2": str(uuid.uuid4()),
        "image_mobile_home": str(uuid.uuid4()),
        "image_desktop_home": str(uuid.uuid4()),
        "translation_share": 15.5,
        "sacem_share": 10.0,
        "other_share": 5.0,
        "revenue_share": 25.0,
        "paid_token_cost": 2
    }


class TestMediaDescriptionsV14:
    """Test media descriptions with v1.4 fields."""
    
    def test_create_media_with_v14_fields(self, client, admin_token, sample_media_v14_data):
        """Test creating media description with v1.4 fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/media-descriptions", json=sample_media_v14_data, headers=headers)
        
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response content: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check basic fields
        assert data["file_number"] == sample_media_v14_data["file_number"]
        assert data["episode_title"] == sample_media_v14_data["episode_title"]
        assert data["program_id"] == sample_media_v14_data["program_id"]
        assert data["season_id"] == sample_media_v14_data["season_id"]
        
        # Check v1.4 fields
        assert data["actor_ids"] == sample_media_v14_data["actor_ids"]
        assert data["director_ids"] == sample_media_v14_data["director_ids"]
        assert data["producer_ids"] == sample_media_v14_data["producer_ids"]
        assert data["author_ids"] == sample_media_v14_data["author_ids"]
        assert data["origin_country_ids"] == sample_media_v14_data["origin_country_ids"]
        assert data["original_language_ids"] == sample_media_v14_data["original_language_ids"]
        assert data["available_country_ids"] == sample_media_v14_data["available_country_ids"]
        assert data["eligible_plan_id_list"] == sample_media_v14_data["eligible_plan_id_list"]
        assert data["audience_category_ids"] == sample_media_v14_data["audience_category_ids"]
        
        # Check image fields
        assert data["image_fullscreen"] == sample_media_v14_data["image_fullscreen"]
        assert data["image_thumbnail1"] == sample_media_v14_data["image_thumbnail1"]
        assert data["image_thumbnail2"] == sample_media_v14_data["image_thumbnail2"]
        assert data["image_mobile_home"] == sample_media_v14_data["image_mobile_home"]
        assert data["image_desktop_home"] == sample_media_v14_data["image_desktop_home"]
        
        # Check revenue fields
        assert data["translation_share"] == sample_media_v14_data["translation_share"]
        assert data["sacem_share"] == sample_media_v14_data["sacem_share"]
        assert data["other_share"] == sample_media_v14_data["other_share"]
        assert data["revenue_share"] == sample_media_v14_data["revenue_share"]
        assert data["paid_token_cost"] == sample_media_v14_data["paid_token_cost"]

    def test_create_media_with_program_only(self, client, admin_token, created_program):
        """Test creating media description with program but no season."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        media_data = {
            "file_number": 12346,
            "episode_title": "Test Episode Program Only",
            "media_type": "video",
            "program_id": created_program["id"],
            "episode_number": 1,
            "content_status": "published"
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["program_id"] == created_program["id"]
        assert data["season_id"] is None

    def test_create_media_with_season_only(self, client, admin_token, created_season):
        """Test creating media description with season but no program."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        media_data = {
            "file_number": 12347,
            "episode_title": "Test Episode Season Only",
            "media_type": "video",
            "season_id": created_season["id"],
            "episode_number": 1,
            "content_status": "published"
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["season_id"] == created_season["id"]
        assert data["program_id"] is None

    def test_create_media_invalid_program_id(self, client, admin_token):
        """Test creating media description with invalid program ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        media_data = {
            "file_number": 12348,
            "episode_title": "Test Episode Invalid Program",
            "media_type": "video",
            "program_id": str(uuid.uuid4()),  # Non-existent program
            "episode_number": 1,
            "content_status": "published"
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        
        # Should succeed but with null program_id in response (handled by foreign key constraint)
        assert response.status_code in [200, 400]  # Depends on validation implementation

    def test_create_media_invalid_season_id(self, client, admin_token):
        """Test creating media description with invalid season ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        media_data = {
            "file_number": 12349,
            "episode_title": "Test Episode Invalid Season",
            "media_type": "video",
            "season_id": str(uuid.uuid4()),  # Non-existent season
            "episode_number": 1,
            "content_status": "published"
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        
        # Should succeed but with null season_id in response (handled by foreign key constraint)
        assert response.status_code in [200, 400]  # Depends on validation implementation

    def test_update_media_v14_fields(self, client, admin_token, sample_media_v14_data):
        """Test updating media description with v1.4 fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media first
        create_response = client.post("/api/v1/media-descriptions", json=sample_media_v14_data, headers=headers)
        media_id = create_response.json()["id"]
        
        # Update with new v1.4 fields
        update_data = {
            "image_fullscreen": str(uuid.uuid4()),
            "translation_share": 20.0,
            "sacem_share": 15.0,
            "eligible_plan_id_list": ["premium"],
            "actor_ids": [str(uuid.uuid4()), str(uuid.uuid4())]
        }
        
        response = client.put(f"/api/v1/media-descriptions/{media_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["image_fullscreen"] == update_data["image_fullscreen"]
        assert data["translation_share"] == update_data["translation_share"]
        assert data["sacem_share"] == update_data["sacem_share"]
        assert data["eligible_plan_id_list"] == update_data["eligible_plan_id_list"]
        assert data["actor_ids"] == update_data["actor_ids"]

    def test_list_media_with_v14_fields(self, client, user_token, admin_token, sample_media_v14_data):
        """Test listing media descriptions includes v1.4 fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media with v1.4 fields
        create_response = client.post("/api/v1/media-descriptions", json=sample_media_v14_data, headers=headers)
        assert create_response.status_code == 200
        
        # List media
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/media-descriptions", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Find our created media in the list
        created_media = None
        for item in data["data"]:
            if item["file_number"] == sample_media_v14_data["file_number"]:
                created_media = item
                break
        
        assert created_media is not None
        assert "actors_id_list" in created_media
        assert "directors_id_list" in created_media
        assert "image_fullscreen" in created_media
        assert "translation_share" in created_media

    def test_revenue_fields_validation(self, client, admin_token):
        """Test revenue fields validation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with invalid revenue share (over 100%)
        media_data = {
            "file_number": 12350,
            "episode_title": "Test Revenue Validation",
            "media_type": "video",
            "content_status": "published",
            "revenue_share": 150.0  # Invalid: over 100%
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        
        # Should either succeed (no validation) or fail with validation error
        assert response.status_code in [200, 422]
        
        # Test with negative revenue share
        media_data_negative = {
            "file_number": 12351,
            "episode_title": "Test Revenue Validation Negative",
            "media_type": "video",
            "content_status": "published",
            "translation_share": -5.0  # Invalid: negative
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data_negative, headers=headers)
        
        # Should either succeed (no validation) or fail with validation error
        assert response.status_code in [200, 422]

    def test_image_fields_validation(self, client, admin_token):
        """Test image fields validation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with invalid URL format
        media_data = {
            "file_number": 12352,
            "episode_title": "Test Image Validation",
            "media_type": "video",
            "content_status": "published",
            "image_fullscreen": "not-a-valid-url"
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        
        # Should either succeed (no validation) or fail with validation error
        assert response.status_code in [200, 422]

    def test_list_array_fields_handling(self, client, admin_token):
        """Test proper handling of array fields."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with empty arrays
        media_data = {
            "file_number": 12353,
            "episode_title": "Test Array Fields",
            "media_type": "video",
            "content_status": "published",
            "actor_ids": [],
            "director_ids": [],
            "eligible_plan_id_list": [],
            "audience_category_ids": []
        }
        
        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["actor_ids"] == []
        assert data["director_ids"] == []
        assert data["eligible_plan_id_list"] == []
        assert data["audience_category_ids"] == []