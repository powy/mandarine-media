import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_media_theme_data():
    """Sample media theme data for testing."""
    return {
        "name": "Test Theme"
    }


@pytest.fixture
def sample_media_theme_update_data():
    """Sample media theme update data for testing."""
    return {
        "name": "Updated Test Theme"
    }


class TestMediaThemesCRUD:
    """Test media themes CRUD operations."""

    def test_create_media_theme_success(self, client, admin_token, sample_media_theme_data):
        """Test successful media theme creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_media_theme_data["name"]
        # MediaTheme model only has name field
        assert "id" in data

    def test_create_media_theme_duplicate_name(self, client, admin_token, sample_media_theme_data):
        """Test creating media theme with duplicate name."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create first theme
        response1 = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=headers)
        assert response1.status_code == 200

        # Try to create duplicate
        response2 = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=headers)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]

    def test_create_media_theme_requires_admin(self, client, user_token, sample_media_theme_data):
        """Test that creating media theme requires admin privileges."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=headers)
        assert response.status_code == 403

    def test_create_media_theme_requires_auth(self, client, sample_media_theme_data):
        """Test that creating media theme requires authentication."""
        response = client.post("/api/v1/media-themes", json=sample_media_theme_data)
        assert response.status_code == 401

    def test_list_media_themes_success(self, client, user_token, sample_media_theme_data):
        """Test successful listing of media themes."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/media-themes", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_media_themes_requires_auth(self, client):
        """Test that listing media themes requires authentication."""
        response = client.get("/api/v1/media-themes")
        assert response.status_code == 401

    def test_get_media_theme_success(self, client, admin_token, user_token, sample_media_theme_data):
        """Test successful retrieval of media theme by ID."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Create a theme first
        create_response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=admin_headers)
        assert create_response.status_code == 200
        created_theme = create_response.json()

        # Get the theme
        get_response = client.get(f"/api/v1/media-themes/{created_theme['id']}", headers=user_headers)

        assert get_response.status_code == 200
        data = get_response.json()
        assert data["id"] == created_theme["id"]
        assert data["name"] == sample_media_theme_data["name"]

    def test_get_media_theme_not_found(self, client, user_token):
        """Test retrieval of non-existent media theme."""
        fake_id = str(uuid.uuid4())
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get(f"/api/v1/media-themes/{fake_id}", headers=headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_media_theme_requires_auth(self, client, admin_token, sample_media_theme_data):
        """Test that getting media theme requires authentication."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a theme first
        create_response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=admin_headers)
        assert create_response.status_code == 200
        created_theme = create_response.json()

        # Try to get without auth
        response = client.get(f"/api/v1/media-themes/{created_theme['id']}")
        assert response.status_code == 401

    def test_update_media_theme_success(self, client, admin_token, sample_media_theme_data, sample_media_theme_update_data):
        """Test successful update of media theme."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a theme first
        create_response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=headers)
        assert create_response.status_code == 200
        created_theme = create_response.json()

        # Update the theme
        update_response = client.put(
            f"/api/v1/media-themes/{created_theme['id']}",
            json=sample_media_theme_update_data,
            headers=headers
        )

        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == sample_media_theme_update_data["name"]
        # MediaTheme model only has name field

    def test_update_media_theme_not_found(self, client, admin_token, sample_media_theme_update_data):
        """Test updating non-existent media theme."""
        fake_id = str(uuid.uuid4())
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.put(f"/api/v1/media-themes/{fake_id}", json=sample_media_theme_update_data, headers=headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_update_media_theme_duplicate_name(self, client, admin_token):
        """Test updating media theme with duplicate name."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create two themes
        theme1_data = {"name": "Theme 1"}
        theme2_data = {"name": "Theme 2"}

        response1 = client.post("/api/v1/media-themes", json=theme1_data, headers=headers)
        response2 = client.post("/api/v1/media-themes", json=theme2_data, headers=headers)

        assert response1.status_code == 200
        assert response2.status_code == 200

        theme1 = response1.json()
        theme2 = response2.json()

        # Try to update theme2 with theme1's name
        update_response = client.put(
            f"/api/v1/media-themes/{theme2['id']}",
            json={"name": "Theme 1"},
            headers=headers
        )

        assert update_response.status_code == 400
        assert "already exists" in update_response.json()["detail"]

    def test_update_media_theme_requires_admin(self, client, admin_token, user_token, sample_media_theme_data):
        """Test that updating media theme requires admin privileges."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Create a theme as admin
        create_response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=admin_headers)
        assert create_response.status_code == 200
        created_theme = create_response.json()

        # Try to update as regular user
        response = client.put(
            f"/api/v1/media-themes/{created_theme['id']}",
            json={"name": "New Name"},
            headers=user_headers
        )
        assert response.status_code == 403

    def test_delete_media_theme_success(self, client, admin_token, sample_media_theme_data):
        """Test successful deletion of media theme."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a theme first
        create_response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=headers)
        assert create_response.status_code == 200
        created_theme = create_response.json()

        # Delete the theme
        delete_response = client.delete(f"/api/v1/media-themes/{created_theme['id']}", headers=headers)

        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["id"] == created_theme["id"]

        # Verify deletion
        get_response = client.get(f"/api/v1/media-themes/{created_theme['id']}", headers=headers)
        assert get_response.status_code == 404

    def test_delete_media_theme_not_found(self, client, admin_token):
        """Test deletion of non-existent media theme."""
        fake_id = str(uuid.uuid4())
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.delete(f"/api/v1/media-themes/{fake_id}", headers=headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_delete_media_theme_requires_admin(self, client, admin_token, user_token, sample_media_theme_data):
        """Test that deleting media theme requires admin privileges."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Create a theme as admin
        create_response = client.post("/api/v1/media-themes", json=sample_media_theme_data, headers=admin_headers)
        assert create_response.status_code == 200
        created_theme = create_response.json()

        # Try to delete as regular user
        response = client.delete(f"/api/v1/media-themes/{created_theme['id']}", headers=user_headers)
        assert response.status_code == 403

    def test_media_themes_pagination(self, client, admin_token, user_token):
        """Test pagination of media themes."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Create multiple themes
        for i in range(25):
            theme_data = {"name": f"Theme {i:02d}"}
            response = client.post("/api/v1/media-themes", json=theme_data, headers=admin_headers)
            assert response.status_code == 200

        # Test first page
        response1 = client.get("/api/v1/media-themes?skip=0&limit=10", headers=user_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        assert len(data1) == 10

        # Test second page
        response2 = client.get("/api/v1/media-themes?skip=10&limit=10", headers=user_headers)
        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2) == 10

        # Ensure different results
        data1_names = {theme["name"] for theme in data1}
        data2_names = {theme["name"] for theme in data2}
        assert data1_names.isdisjoint(data2_names)


class TestMediaThemeEdgeCases:
    """Test edge cases and error handling for MediaTheme."""

    def test_create_media_theme_invalid_data(self, client, admin_token):
        """Test creating media theme with invalid data."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Missing required name field
        invalid_data = {}
        response = client.post("/api/v1/media-themes", json=invalid_data, headers=headers)
        assert response.status_code == 422

    def test_create_media_theme_empty_name(self, client, admin_token):
        """Test creating media theme with empty name."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        invalid_data = {"name": ""}
        response = client.post("/api/v1/media-themes", json=invalid_data, headers=headers)
        assert response.status_code == 422

    def test_update_media_theme_invalid_uuid(self, client, admin_token):
        """Test updating media theme with invalid UUID."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.put("/api/v1/media-themes/invalid-uuid", json={"name": "Test"}, headers=headers)
        assert response.status_code == 422

    def test_get_media_theme_invalid_uuid(self, client, user_token):
        """Test getting media theme with invalid UUID."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/media-themes/invalid-uuid", headers=headers)
        assert response.status_code == 422

    def test_delete_media_theme_invalid_uuid(self, client, admin_token):
        """Test deleting media theme with invalid UUID."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.delete("/api/v1/media-themes/invalid-uuid", headers=headers)
        assert response.status_code == 422