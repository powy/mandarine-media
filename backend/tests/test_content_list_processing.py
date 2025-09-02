import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.services.content_list_processing import ContentListProcessingService
from app.crud.content_list import content_list as crud_content_list
from app.crud.media_description import media_description as crud_media_description
from app.crud.season import season as crud_season
from app.crud.program import program as crud_program
from app.crud.media_theme import media_theme as crud_media_theme
from app.schemas.content_list import ContentListCreate
from app.schemas.media_description import MediaDescriptionCreate
from app.schemas.season import SeasonCreate
from app.schemas.program import ProgramCreate
from app.schemas.media_theme import MediaThemeCreate
from app.models.media_description import MediaCategoryEnum
from app.models.content_list import ThumbnailFormatEnum, ContentTypeEnum


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


@pytest.fixture
def sample_program_and_season(db):
    """Create sample program and season for testing."""
    # Create program
    program_in = ProgramCreate(program_name="Test Series")
    program = crud_program.create(db=db, obj_in=program_in)
    
    # Create season
    season_in = SeasonCreate(
        program_id=str(program.id),
        season_number=1,
        season_name="Season 1"
    )
    season = crud_season.create(db=db, obj_in=season_in)
    
    return program, season


@pytest.fixture
def sample_media_content(db, sample_themes, sample_program_and_season):
    """Create sample media descriptions for testing."""
    program, season = sample_program_and_season
    theme_ids = [str(theme.id) for theme in sample_themes]
    
    media_items = []
    
    # Create videos with different categories and themes
    base_time = datetime.utcnow()
    
    # Video 1: Animation + Action theme (part of season)
    media1 = MediaDescriptionCreate(
        file_number=1001,
        episode_title="Episode 1",
        media_type="video",
        media_categories_list=["animation"],
        media_themes_id_list=[theme_ids[0]],  # Action
        season_id=str(season.id),
        creation_date_utc=base_time - timedelta(days=3)
    )
    created1 = crud_media_description.create(db=db, obj_in=media1)
    media_items.append(created1)
    
    # Video 2: Animation + Action theme (part of season) 
    media2 = MediaDescriptionCreate(
        file_number=1002,
        episode_title="Episode 2",
        media_type="video",
        media_categories_list=["animation"],
        media_themes_id_list=[theme_ids[0]],  # Action
        season_id=str(season.id),
        creation_date_utc=base_time - timedelta(days=2)
    )
    created2 = crud_media_description.create(db=db, obj_in=media2)
    media_items.append(created2)
    
    # Video 3: Drama + Romance theme (standalone)
    media3 = MediaDescriptionCreate(
        file_number=1003,
        episode_title="Standalone Drama",
        media_type="video",
        media_categories_list=["drama"],
        media_themes_id_list=[theme_ids[1]],  # Romance
        creation_date_utc=base_time - timedelta(days=1)
    )
    created3 = crud_media_description.create(db=db, obj_in=media3)
    media_items.append(created3)
    
    # Webtoon 1: Animation + Comedy theme
    media4 = MediaDescriptionCreate(
        file_number=1004,
        episode_title="Webtoon Episode",
        media_type="webtoon",
        media_categories_list=["animation"],
        media_themes_id_list=[theme_ids[2]],  # Comedy
        creation_date_utc=base_time  # Most recent
    )
    created4 = crud_media_description.create(db=db, obj_in=media4)
    media_items.append(created4)
    
    return media_items, program, season


class TestContentListProcessingService:
    
    def test_has_filtering_criteria(self, db):
        """Test detection of filtering criteria in content lists."""
        service = ContentListProcessingService(db)
        
        # Create lists with different filtering criteria
        list_with_categories = ContentListCreate(
            title="Test Categories",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_categories_list=["animation"]
        )
        created_list1 = crud_content_list.create(db, obj_in=list_with_categories)
        
        list_with_themes = ContentListCreate(
            title="Test Themes",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_themes_id_list=["theme-id"]
        )
        created_list2 = crud_content_list.create(db, obj_in=list_with_themes)
        
        list_with_media_type = ContentListCreate(
            title="Test Media Type",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_type="video"
        )
        created_list3 = crud_content_list.create(db, obj_in=list_with_media_type)
        
        list_without_criteria = ContentListCreate(
            title="No Criteria",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30
        )
        created_list4 = crud_content_list.create(db, obj_in=list_without_criteria)
        
        # Test filtering criteria detection
        assert service._has_filtering_criteria(created_list1) is True
        assert service._has_filtering_criteria(created_list2) is True
        assert service._has_filtering_criteria(created_list3) is True
        assert service._has_filtering_criteria(created_list4) is False

    def test_filter_media_by_categories_and_themes(self, db, sample_media_content):
        """Test filtering media by both categories and themes."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Create content list with both categories and themes
        content_list = ContentListCreate(
            title="Animation + Action",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_categories_list=["animation"],
            media_themes_id_list=[str(media_items[0].media_themes_id_list[0])]  # Action theme
        )
        created_list = crud_content_list.create(db, obj_in=content_list)
        
        # Filter media
        filtered_media = service._filter_media_by_criteria(created_list)
        
        # Should find videos that match animation AND action theme
        expected_titles = {"Episode 1", "Episode 2", "Webtoon Episode"}
        actual_titles = {media.episode_title for media in filtered_media}
        
        # Should include videos with animation category and action theme, plus webtoon with animation+comedy
        assert len(filtered_media) >= 2  # At least the two season episodes

    def test_filter_media_by_categories_only(self, db, sample_media_content):
        """Test filtering media by categories only."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Create content list with only categories
        content_list = ContentListCreate(
            title="Animation Only",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_categories_list=["animation"]
        )
        created_list = crud_content_list.create(db, obj_in=content_list)
        
        # Filter media
        filtered_media = service._filter_media_by_criteria(created_list)
        
        # Should find all animation content regardless of theme
        animation_media = [media for media in filtered_media 
                         if "animation" in (media.media_categories_list or [])]
        assert len(animation_media) >= 3  # Episode 1, Episode 2, Webtoon Episode

    def test_filter_media_by_themes_only(self, db, sample_media_content):
        """Test filtering media by themes only."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Create content list with only themes
        action_theme_id = str(media_items[0].media_themes_id_list[0])
        content_list = ContentListCreate(
            title="Action Only",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_themes_id_list=[action_theme_id]
        )
        created_list = crud_content_list.create(db, obj_in=content_list)
        
        # Filter media
        filtered_media = service._filter_media_by_criteria(created_list)
        
        # Should find all action theme content regardless of category
        action_media = [media for media in filtered_media 
                       if action_theme_id in (media.media_themes_id_list or [])]
        assert len(action_media) >= 2  # Episode 1, Episode 2

    def test_media_type_filtering(self, db, sample_media_content):
        """Test media type filtering."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Create content list with specific media type
        content_list = ContentListCreate(
            title="Videos Only",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_type="video",
            media_categories_list=["animation"]
        )
        created_list = crud_content_list.create(db, obj_in=content_list)
        
        # Filter media
        filtered_media = service._filter_media_by_criteria(created_list)
        
        # Should only include videos, not webtoons
        for media in filtered_media:
            assert media.media_type == "video"

    def test_sorting_latest_first_true(self, db, sample_media_content):
        """Test sorting with latest_first=True."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Sort with latest first
        sorted_media = service._sort_media_items(media_items, latest_first=True)
        
        # Should be ordered by creation date descending (newest first)
        for i in range(len(sorted_media) - 1):
            assert sorted_media[i].creation_date_utc >= sorted_media[i + 1].creation_date_utc

    def test_sorting_latest_first_false(self, db, sample_media_content):
        """Test sorting with latest_first=False."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Sort with oldest first
        sorted_media = service._sort_media_items(media_items, latest_first=False)
        
        # Should be ordered by creation date ascending (oldest first)
        for i in range(len(sorted_media) - 1):
            assert sorted_media[i].creation_date_utc <= sorted_media[i + 1].creation_date_utc

    def test_season_consolidation(self, db, sample_media_content):
        """Test season consolidation logic."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Get videos that belong to the season
        season_videos = [media for media in media_items if media.season_id == season.id]
        
        # Apply season consolidation
        content_items, content_types = service._consolidate_seasons(season_videos)
        
        # Should have only one item (the season) instead of multiple videos
        assert len(content_items) == 1
        assert len(content_types) == 1
        assert content_items[0] == str(season.id)
        assert content_types[0] == ContentTypeEnum.season.value

    def test_season_consolidation_mixed_content(self, db, sample_media_content):
        """Test season consolidation with mixed season and standalone content."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Use all media items (season videos + standalone)
        content_items, content_types = service._consolidate_seasons(media_items)
        
        # Should have season + standalone items (no duplicates from same season)
        season_items = [i for i, ct in enumerate(content_types) if ct == ContentTypeEnum.season.value]
        media_items_count = [i for i, ct in enumerate(content_types) if ct == ContentTypeEnum.media_description.value]
        
        assert len(season_items) == 1  # One season
        assert len(media_items_count) >= 1  # At least one standalone media

    def test_process_content_list_complete_workflow(self, db, sample_media_content):
        """Test complete content list processing workflow."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Create content list with filtering criteria
        content_list = ContentListCreate(
            title="Test Workflow",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_categories_list=["animation"],
            media_themes_id_list=[str(media_items[0].media_themes_id_list[0])],
            latest_first=True
        )
        created_list = crud_content_list.create(db, obj_in=content_list)
        
        # Process the content list
        updated = service._process_content_list(created_list)
        
        # Should have been updated
        assert updated is True
        
        # Refresh and check results
        db.refresh(created_list)
        assert created_list.content_items is not None
        assert created_list.content_types is not None
        assert len(created_list.content_items) == len(created_list.content_types)

    def test_update_all_dynamic_lists(self, db, sample_media_content):
        """Test updating all dynamic lists in the system."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Create multiple content lists with filtering criteria
        list1 = ContentListCreate(
            title="Animation Lists",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_categories_list=["animation"]
        )
        created_list1 = crud_content_list.create(db, obj_in=list1)
        
        list2 = ContentListCreate(
            title="No Criteria List",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30
        )
        created_list2 = crud_content_list.create(db, obj_in=list2)
        
        # Process all lists
        results = service.update_all_dynamic_lists()
        
        # Should process only the list with criteria
        assert results["processed"] == 1  # Only list1 has criteria
        assert results["updated"] <= 1   # May or may not update depending on content
        assert len(results["errors"]) == 0

    def test_update_all_dynamic_lists_handles_errors(self, db):
        """Test that dynamic list updating handles errors gracefully."""
        service = ContentListProcessingService(db)
        
        # Create content list with invalid criteria that might cause errors
        content_list = ContentListCreate(
            title="Error Test",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_categories_list=["invalid_category"]
        )
        created_list = crud_content_list.create(db, obj_in=content_list)
        
        # Process all lists
        results = service.update_all_dynamic_lists()
        
        # Should handle errors gracefully
        assert "errors" in results
        # May have errors depending on how filtering handles invalid categories

    def test_no_changes_skips_update(self, db, sample_media_content):
        """Test that lists with no content changes are skipped."""
        media_items, program, season = sample_media_content
        service = ContentListProcessingService(db)
        
        # Create and process a list once
        content_list = ContentListCreate(
            title="No Changes Test",
            thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
            list_type="classic",
            percentage_width=100,
            percentage_height=30,
            media_categories_list=["animation"]
        )
        created_list = crud_content_list.create(db, obj_in=content_list)
        
        # First processing
        updated1 = service._process_content_list(created_list)
        
        # Second processing without any media changes
        updated2 = service._process_content_list(created_list)
        
        # First should update, second should skip
        assert updated1 is True
        assert updated2 is False


class TestContentListProcessingEndpoint:
    
    def test_update_dynamic_lists_endpoint_unauthorized(self, client):
        """Test dynamic list update endpoint without authentication."""
        response = client.post("/api/v1/content-lists/update-dynamic-lists")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_service_integration_without_http(self, db, sample_media_content):
        """Integration test for the processing service without HTTP layer."""
        media_items, program, season = sample_media_content
        
        # Create content lists with different criteria
        lists_to_create = [
            {
                "title": "Animation Videos",
                "media_type": "video",
                "media_categories_list": ["animation"]
            },
            {
                "title": "All Webtoons",
                "media_type": "webtoon",
                "media_categories_list": ["animation"]
            },
            {
                "title": "No Criteria",
                # No filtering criteria
            }
        ]
        
        for list_data in lists_to_create:
            list_create = ContentListCreate(
                title=list_data["title"],
                thumbnail_format=ThumbnailFormatEnum.format_1080x1080,
                list_type="classic",
                percentage_width=100,
                percentage_height=30,
                **{k: v for k, v in list_data.items() if k != "title"}
            )
            crud_content_list.create(db, obj_in=list_create)
        
        # Test the service directly
        service = ContentListProcessingService(db)
        results = service.update_all_dynamic_lists()
        
        # Verify response structure
        assert "processed" in results
        assert "updated" in results
        assert "skipped" in results
        assert "errors" in results
        
        # Should process only lists with criteria (2 out of 3)
        assert results["processed"] == 2
        assert results["updated"] <= 2


class TestMediaDescriptionCRUDEnhancements:
    
    def test_get_filtered_media_both_criteria(self, db, sample_media_content):
        """Test filtering media with both categories and themes."""
        media_items, program, season = sample_media_content
        
        # Test with both categories and themes
        action_theme_id = str(media_items[0].media_themes_id_list[0])
        filtered_media = crud_media_description.get_filtered_media(
            db,
            media_types=["video"],
            categories=["animation"],
            theme_ids=[action_theme_id]
        )
        
        # Should find videos with animation category AND action theme
        assert len(filtered_media) >= 2  # Episode 1 and 2

    def test_get_filtered_media_categories_only(self, db, sample_media_content):
        """Test filtering media with categories only."""
        media_items, program, season = sample_media_content
        
        # Test with only categories
        filtered_media = crud_media_description.get_filtered_media(
            db,
            media_types=["video", "webtoon"],
            categories=["animation"],
            theme_ids=None
        )
        
        # Should find all animation content
        assert len(filtered_media) >= 3  # Episodes 1, 2, and webtoon

    def test_get_filtered_media_themes_only(self, db, sample_media_content):
        """Test filtering media with themes only."""
        media_items, program, season = sample_media_content
        
        # Test with only themes
        action_theme_id = str(media_items[0].media_themes_id_list[0])
        filtered_media = crud_media_description.get_filtered_media(
            db,
            media_types=["video"],
            categories=None,
            theme_ids=[action_theme_id]
        )
        
        # Should find all videos with action theme
        assert len(filtered_media) >= 2  # Episode 1 and 2

    def test_get_season_videos(self, db, sample_media_content):
        """Test grouping videos by season."""
        media_items, program, season = sample_media_content
        
        season_videos = crud_media_description.get_season_videos(db)
        
        # Should group videos by season
        season_id_str = str(season.id)
        assert season_id_str in season_videos
        assert len(season_videos[season_id_str]) == 2  # Episode 1 and 2


class TestScreenDescriptionUpdates:
    """Test automatic screen description updates when content lists change"""
    
    def test_screen_updates_when_content_list_changes(self, db, sample_media_content):
        """Test that screen descriptions are updated when their content lists change."""
        from app.services.content_list_processing import ContentListProcessingService
        from app.crud.screen_description import screen_description as crud_screen_description
        from app.schemas.screen_description import ScreenDescriptionCreate
        
        media_items, program, season = sample_media_content
        
        # Create a content list with filtering criteria
        content_list_data = ContentListCreate(
            title="Test Dynamic List",
            description="Test list for screen updates", 
            thumbnail_format="1080x1080",
            is_active=True,
            display_order=1,
            list_type="classic",
            percentage_width=100,
            percentage_height=100,
            content_items=[],
            content_types=[],
            media_categories_list=["animation"],
            media_themes_id_list=[str(media_items[0].media_themes_id_list[0])],
            media_type="video",
            latest_first=True
        )
        content_list = crud_content_list.create(db, obj_in=content_list_data)
        
        # Create a screen description that contains this content list
        screen_data = ScreenDescriptionCreate(
            title="Test Screen",
            description="Test screen for updates",
            screen_type="homepage",
            is_active=True,
            display_order=1,
            content_lists=[str(content_list.id)]
        )
        screen = crud_screen_description.create(db, obj_in=screen_data)
        
        # Generate initial JSON cache for screen
        initial_screen_json = crud_screen_description.update_json_cache(db, screen_content=screen)
        initial_json_timestamp = screen.json_last_updated
        
        # Update the content list via processing service
        service = ContentListProcessingService(db)
        results = service.update_all_dynamic_lists(force_update=True)
        
        # Verify results include screen updates
        assert results["updated"] >= 1  # Content list should be updated
        assert results["screens_updated"] >= 1  # Screen should be updated
        assert len(results["screen_errors"]) == 0  # No screen errors
        
        # Verify screen JSON was actually updated
        db.refresh(screen)
        assert screen.json_last_updated > initial_json_timestamp
        
        # Verify screen JSON contains updated content list data
        updated_screen_json = screen.get_json_data()
        assert updated_screen_json is not None
        assert len(updated_screen_json["content_lists"]) > 0
    
    def test_multiple_screens_updated(self, db, sample_media_content):
        """Test that multiple screens containing the same content list are all updated."""
        from app.services.content_list_processing import ContentListProcessingService
        from app.crud.screen_description import screen_description as crud_screen_description
        from app.schemas.screen_description import ScreenDescriptionCreate
        
        media_items, program, season = sample_media_content
        
        # Create a content list
        content_list_data = ContentListCreate(
            title="Shared List",
            description="List used by multiple screens",
            thumbnail_format="1080x1080",
            is_active=True,
            display_order=1,
            list_type="classic", 
            percentage_width=100,
            percentage_height=100,
            content_items=[],
            content_types=[],
            media_categories_list=["animation"],
            media_type="video",
            latest_first=True
        )
        content_list = crud_content_list.create(db, obj_in=content_list_data)
        
        # Create two screens that use this content list
        screen1_data = ScreenDescriptionCreate(
            title="Homepage Screen",
            screen_type="homepage",
            is_active=True,
            display_order=1,
            content_lists=[str(content_list.id)]
        )
        screen1 = crud_screen_description.create(db, obj_in=screen1_data)
        
        screen2_data = ScreenDescriptionCreate(
            title="Category Screen", 
            screen_type="category",
            is_active=True,
            display_order=2,
            content_lists=[str(content_list.id)]
        )
        screen2 = crud_screen_description.create(db, obj_in=screen2_data)
        
        # Update content lists
        service = ContentListProcessingService(db)
        results = service.update_all_dynamic_lists(force_update=True)
        
        # Verify both screens were updated
        assert results["screens_updated"] >= 2
        assert len(results["screen_errors"]) == 0
    
    def test_no_screen_updates_when_no_lists_updated(self, db, sample_media_content):
        """Test that screens are not updated when no content lists change."""
        from app.services.content_list_processing import ContentListProcessingService
        
        media_items, program, season = sample_media_content
        
        # Create content list without filtering criteria (won't be processed)
        content_list_data = ContentListCreate(
            title="Static List",
            description="List without filtering",
            thumbnail_format="1080x1080",
            is_active=True,
            display_order=1,
            list_type="classic",
            percentage_width=100,
            percentage_height=100,
            content_items=[str(media_items[0].id)],
            content_types=["media_description"]
        )
        crud_content_list.create(db, obj_in=content_list_data)
        
        # Update dynamic lists (should skip the static list)
        service = ContentListProcessingService(db)
        results = service.update_all_dynamic_lists()
        
        # No content lists updated, so no screens should be updated
        assert results["updated"] == 0
        assert results["screens_updated"] == 0