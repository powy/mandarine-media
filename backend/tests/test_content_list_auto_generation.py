import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from sqlalchemy.orm import Session

from app.services.content_list_auto_generation import ContentListAutoGenerationService
from app.crud.content_list import content_list as crud_content_list
from app.crud.media_theme import media_theme as crud_media_theme
from app.schemas.content_list import ContentListCreate
from app.schemas.media_theme import MediaThemeCreate
from app.models.media_description import MediaCategoryEnum
from app.models.content_list import ThumbnailFormatEnum
from app.core.security import create_access_token


@pytest.fixture
def sample_themes(db):
    """Create sample media themes for testing."""
    themes = []
    theme_names = ["Action", "Romance", "Comedy"]
    
    for name in theme_names:
        theme_in = MediaThemeCreate(name=name)
        theme = crud_media_theme.create(db=db, obj_in=theme_in)
        themes.append(theme)
    
    return themes


class TestContentListAutoGenerationService:
    def test_generate_list_name(self, db):
        """Test auto-list name generation."""
        service = ContentListAutoGenerationService(db)
        
        # Test basic name generation
        name = service._generate_list_name("video", "animation", "Action Adventure")
        assert name == "auto_all_video_animation_action_adventure"
        
        # Test with hyphens  
        name = service._generate_list_name("webtoon", "short-drama", "Sci-Fi")
        assert name == "auto_all_webtoon_short_drama_sci_fi"

    def test_create_new_auto_list(self, db, sample_themes):
        """Test creating a new auto-list."""
        service = ContentListAutoGenerationService(db)
        
        # Test creating new list
        result = service._create_or_update_auto_list(
            list_name="auto_all_video_animation_action",
            media_type="video",
            category="animation",
            theme_id=str(sample_themes[0].id)
        )
        
        assert result == "created"
        
        # Verify the list was created with correct metadata
        created_list = crud_content_list.get_by_title(db, title="auto_all_video_animation_action")
        assert created_list is not None
        assert created_list.media_type == "video"
        assert created_list.media_categories_list == ["animation"]
        assert created_list.media_themes_id_list == [str(sample_themes[0].id)]
        assert created_list.content_items == []
        assert created_list.content_types == []

    def test_update_existing_auto_list(self, db, sample_themes):
        """Test updating an existing auto-list metadata."""
        service = ContentListAutoGenerationService(db)
        
        # Create initial list with different metadata
        initial_data = ContentListCreate(
            title="auto_all_video_animation_action",
            description="Test list",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_type="webtoon",  # Different type
            media_categories_list=["drama"],  # Different category
            media_themes_id_list=["different-theme-id"]  # Different theme
        )
        crud_content_list.create(db, obj_in=initial_data)
        
        # Update with correct metadata
        result = service._create_or_update_auto_list(
            list_name="auto_all_video_animation_action",
            media_type="video",
            category="animation",
            theme_id=str(sample_themes[0].id)
        )
        
        assert result == "updated"
        
        # Verify metadata was updated
        updated_list = crud_content_list.get_by_title(db, title="auto_all_video_animation_action")
        assert updated_list.media_type == "video"
        assert updated_list.media_categories_list == ["animation"]
        assert updated_list.media_themes_id_list == [str(sample_themes[0].id)]

    def test_skip_unchanged_auto_list(self, db, sample_themes):
        """Test skipping auto-list when metadata hasn't changed."""
        service = ContentListAutoGenerationService(db)
        
        # Create list with correct metadata
        initial_data = ContentListCreate(
            title="auto_all_video_animation_action",
            description="Test list",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_type="video",
            media_categories_list=["animation"],
            media_themes_id_list=[str(sample_themes[0].id)]
        )
        crud_content_list.create(db, obj_in=initial_data)
        
        # Try to "update" with same metadata
        result = service._create_or_update_auto_list(
            list_name="auto_all_video_animation_action",
            media_type="video",
            category="animation",
            theme_id=str(sample_themes[0].id)
        )
        
        assert result == "skipped"

    def test_generate_all_auto_lists(self, db, sample_themes):
        """Test generating all auto-lists for all combinations."""
        service = ContentListAutoGenerationService(db)
        
        results = service.generate_all_auto_lists()
        
        # Should have results for categories × themes × media_types
        categories_count = len(MediaCategoryEnum)
        themes_count = len(sample_themes)
        media_types_count = len(service.MEDIA_TYPES)
        expected_total = categories_count * themes_count * media_types_count
        
        assert results["created"] + results["updated"] + results["skipped"] == expected_total
        assert results["created"] > 0  # Should create new lists
        assert len(results["errors"]) == 0  # No errors expected

    def test_generate_all_auto_lists_handles_errors(self, db):
        """Test that auto-generation handles errors gracefully."""
        service = ContentListAutoGenerationService(db)
        
        # Mock crud_media_theme.get_multi to raise an exception
        with patch('app.services.content_list_auto_generation.crud_media_theme.get_multi') as mock_get_themes:
            mock_get_themes.side_effect = Exception("Database error")
            
            results = service.generate_all_auto_lists()
            
            assert results["created"] == 0
            assert results["updated"] == 0
            assert len(results["errors"]) > 0
            assert "Failed to get categories/themes" in results["errors"][0]


class TestContentListCRUDNewMethods:
    def test_get_by_slug(self, db):
        """Test getting content list by slug."""
        # Create a content list with a slug
        content_list_data = ContentListCreate(
            title="Test List",
            description="Test",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            slug="test-list-slug"
        )
        created_list = crud_content_list.create(db, obj_in=content_list_data)
        
        # Test retrieval by slug
        retrieved_list = crud_content_list.get_by_slug(db, slug="test-list-slug")
        assert retrieved_list is not None
        assert retrieved_list.id == created_list.id
        assert retrieved_list.slug == "test-list-slug"

    def test_get_by_slug_not_found(self, db):
        """Test getting content list by non-existent slug."""
        result = crud_content_list.get_by_slug(db, slug="non-existent-slug")
        assert result is None

    def test_create_auto_list_with_slug_generation(self, db):
        """Test creating auto-list with automatic slug generation."""
        content_list_data = ContentListCreate(
            title="Auto Generated List Name",
            description="Test",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30
        )
        
        created_list = crud_content_list.create_auto_list(db, obj_in=content_list_data)
        
        assert created_list.slug == "auto_generated_list_name"
        assert created_list.title == "Auto Generated List Name"

    def test_create_auto_list_preserves_existing_slug(self, db):
        """Test creating auto-list preserves provided slug."""
        content_list_data = ContentListCreate(
            title="Auto Generated List",
            description="Test",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            slug="custom-slug"
        )
        
        created_list = crud_content_list.create_auto_list(db, obj_in=content_list_data)
        
        assert created_list.slug == "custom-slug"


class TestAutoGenerationEndpoint:
    def test_auto_generate_endpoint_unauthorized(self, client):
        """Test auto-generation endpoint without authentication."""
        response = client.post("/api/v1/content-lists/auto-generate")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.skip(reason="Auth setup needed for full endpoint tests")
    def test_auto_generate_endpoint_success(self, client):
        """Test auto-generation endpoint with admin user."""
        # Note: Full endpoint testing requires proper auth setup
        # This test is skipped but shows the expected structure
        pass

    def test_auto_generate_service_integration(self, db, sample_themes):
        """Integration test for the service without HTTP layer."""
        # Test the service directly (without HTTP auth complications)
        service = ContentListAutoGenerationService(db)
        
        results = service.generate_all_auto_lists()
        
        # Verify response structure
        assert "created" in results
        assert "updated" in results
        assert "skipped" in results
        assert "errors" in results
        
        # Should create lists for all combinations
        categories_count = len(MediaCategoryEnum)
        themes_count = len(sample_themes)
        media_types_count = 2  # video, webtoon
        expected_total = categories_count * themes_count * media_types_count
        
        total_operations = results["created"] + results["updated"] + results["skipped"]
        assert total_operations == expected_total
        assert results["created"] > 0

    def test_created_lists_have_correct_structure(self, db, sample_themes):
        """Test that created auto-lists have the correct structure and metadata."""
        service = ContentListAutoGenerationService(db)
        
        # Generate all lists
        results = service.generate_all_auto_lists()
        assert results["created"] > 0
        
        # Check a few created lists
        test_list = crud_content_list.get_by_title(db, title="auto_all_video_animation_action")
        if test_list:
            assert test_list.media_type == "video"
            assert test_list.media_categories_list == ["animation"]
            assert test_list.content_items == []  # Should be empty initially
            assert test_list.content_types == []  # Should be empty initially
            assert test_list.is_active is True
            assert test_list.thumbnail_format == "1080x1080"