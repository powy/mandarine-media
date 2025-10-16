"""
Integration test for showcase JSON generation through screen descriptions.
This test verifies that program_id, season_id, and thumbnail_url are correctly
populated when JSON is generated via the screen description flow.
"""
import pytest
import json
from sqlalchemy.orm import Session

from app.models.media_showcase import MediaShowcase
from app.models.media_description import MediaDescription
from app.models.program import Program
from app.models.season import Season
from app.models.picture import Picture
from app.models.screen_description import ScreenDescription
from app.schemas.media_showcase import ThumbnailFormatEnum, ListTypeEnum
from app.crud.media_showcase import media_showcase as crud_media_showcase


class TestShowcaseScreenJSONIntegration:
    """Test that showcase JSON generation works correctly when accessed through screen descriptions."""

    def test_screen_json_includes_program_season_thumbnail(self, db: Session):
        """
        Test the complete flow: Screen -> Showcase -> MediaDescription with program, season, and images.
        This simulates the production scenario where screens fetch showcases which then generate JSON.
        """
        # Create a program
        program = Program(program_name="Integration Test Program")
        db.add(program)
        db.flush()

        # Create a season
        season = Season(
            program_id=program.id,
            season_number=1,
            season_name="Season 1"
        )
        db.add(season)
        db.flush()

        # Create pictures for different formats
        picture_1920_1080 = Picture(
            image_url="https://cdn.example.com/image-1920x1080.jpg",
            file_name="image-1920x1080.jpg",
            file_size_bytes=2048,
            width=1920,
            height=1080
        )
        picture_1920_720 = Picture(
            image_url="https://cdn.example.com/image-1920x720.jpg",
            file_name="image-1920x720.jpg",
            file_size_bytes=1536,
            width=1920,
            height=720
        )
        db.add(picture_1920_1080)
        db.add(picture_1920_720)
        db.flush()

        # Create media descriptions with full relationships
        media_desc_1 = MediaDescription(
            file_number=88001,
            episode_title="Episode 1 - Full Data",
            media_type="video",
            program_id=program.id,
            season_id=season.id,
            episode_number=1,
            friendly_url="/watch/episode-1",
            slug="episode-1-full",
            media_categories_list=["drama", "action"],
            descriptive_summary_text="First episode with complete data",
            is_featured=True,
            content_status="published",
            image_1920_1080_id=picture_1920_1080.id,
            image_1920_720_id=picture_1920_720.id
        )

        media_desc_2 = MediaDescription(
            file_number=88002,
            episode_title="Episode 2 - Partial Data",
            media_type="video",
            program_id=program.id,
            season_id=season.id,
            episode_number=2,
            friendly_url="/watch/episode-2",
            slug="episode-2-partial",
            media_categories_list=["drama"],
            descriptive_summary_text="Second episode",
            is_featured=False,
            content_status="published",
            # Only one image format
            image_1920_1080_id=picture_1920_1080.id
        )

        db.add(media_desc_1)
        db.add(media_desc_2)
        db.commit()

        # Create showcase using CRUD to properly handle priorities
        from app.crud.media_showcase import media_showcase as crud_media_showcase
        from app.schemas.media_showcase import MediaShowcaseCreate

        showcase_data = MediaShowcaseCreate(
            title="Integration Test Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080,
            list_type=ListTypeEnum.carousel,
            percentage_width=100,
            percentage_height=80,
            slug="integration-test-showcase",
            media_description_ids=[media_desc_1.id, media_desc_2.id]
        )
        showcase = crud_media_showcase.create(db, obj_in=showcase_data)

        # Create screen description
        screen = ScreenDescription(
            title="Integration Test Screen",
            description="Screen for testing JSON generation",
            screen_type="homepage",
            is_active=True,
            display_order=1,
            media_showcases=[str(showcase.id)],
            slug="integration-test-screen"
        )
        db.add(screen)
        db.commit()

        # ===== THE CRITICAL TEST: Fetch showcase via CRUD (as screen_description.update_json does) =====
        # This simulates exactly what happens in production
        fetched_showcase = crud_media_showcase.get(db, id=showcase.id)

        # Generate JSON from the fetched showcase
        json_data = fetched_showcase.update_json(db)

        # ===== VERIFY THE FIX =====
        assert json_data is not None, "JSON generation failed"
        assert "items" in json_data
        assert len(json_data["items"]) == 2, f"Expected 2 items, got {len(json_data['items'])}"

        # Create a map by ID for easier checking regardless of order
        items_by_id = {item["id"]: item for item in json_data["items"]}

        # Check first media description (full data)
        assert str(media_desc_1.id) in items_by_id
        item1 = items_by_id[str(media_desc_1.id)]
        assert item1["title"] == "Episode 1 - Full Data"
        assert item1["program_id"] == str(program.id), f"Expected program_id {str(program.id)}, got {item1['program_id']}"
        assert item1["season_id"] == str(season.id), f"Expected season_id {str(season.id)}, got {item1['season_id']}"
        assert item1["episode_number"] == 1
        assert item1["thumbnail_url"] == picture_1920_1080.image_url, f"Expected thumbnail {picture_1920_1080.image_url}, got {item1['thumbnail_url']}"

        # Check second media description (partial data)
        assert str(media_desc_2.id) in items_by_id
        item2 = items_by_id[str(media_desc_2.id)]
        assert item2["title"] == "Episode 2 - Partial Data"
        assert item2["program_id"] == str(program.id), f"Expected program_id {str(program.id)}, got {item2['program_id']}"
        assert item2["season_id"] == str(season.id), f"Expected season_id {str(season.id)}, got {item2['season_id']}"
        assert item2["episode_number"] == 2
        assert item2["thumbnail_url"] == picture_1920_1080.image_url

    def test_screen_update_json_complete_flow(self, db: Session):
        """
        Test the complete screen.update_json() flow to ensure it works end-to-end.
        """
        # Setup similar to above but simplified
        program = Program(program_name="Screen Flow Test Program")
        db.add(program)
        db.flush()

        season = Season(program_id=program.id, season_number=2, season_name="Season 2")
        db.add(season)
        db.flush()

        picture = Picture(
            image_url="https://cdn.example.com/screen-test.jpg",
            file_name="screen-test.jpg",
            file_size_bytes=1024,
            width=1920,
            height=1080
        )
        db.add(picture)
        db.flush()

        media_desc = MediaDescription(
            file_number=88003,
            episode_title="Screen Flow Episode",
            media_type="video",
            program_id=program.id,
            season_id=season.id,
            episode_number=5,
            friendly_url="/watch/screen-flow",
            slug="screen-flow-episode",
            media_categories_list=["comedy"],
            is_featured=True,
            content_status="published",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.flush()

        showcase = MediaShowcase(
            title="Screen Flow Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            slug="screen-flow-showcase"
        )
        db.add(showcase)
        db.flush()

        showcase.media_descriptions.append(media_desc)
        db.commit()

        # Create screen with the showcase
        screen = ScreenDescription(
            title="Screen Flow Test",
            screen_type="category",
            is_active=True,
            display_order=2,
            media_showcases=[str(showcase.id)]
        )
        db.add(screen)
        db.commit()

        # NOW THE REAL TEST: Call screen.update_json() which internally fetches and processes showcases
        screen_json = screen.update_json(db)

        # Verify screen JSON structure
        assert screen_json is not None
        assert "media_showcases" in screen_json
        assert len(screen_json["media_showcases"]) == 1

        # Verify the nested showcase data
        showcase_data = screen_json["media_showcases"][0]
        assert showcase_data["id"] == str(showcase.id)
        assert showcase_data["title"] == "Screen Flow Showcase"

        # Verify items within the showcase
        assert "items" in showcase_data
        assert len(showcase_data["items"]) == 1

        item = showcase_data["items"][0]
        # THE CRITICAL ASSERTIONS - These would fail before the fix
        assert item["program_id"] == str(program.id), "program_id missing in screen JSON!"
        assert item["season_id"] == str(season.id), "season_id missing in screen JSON!"
        assert item["thumbnail_url"] == picture.image_url, "thumbnail_url missing in screen JSON!"
        assert item["episode_number"] == 5

    def test_different_thumbnail_formats(self, db: Session):
        """Test that different thumbnail formats are correctly resolved."""
        program = Program(program_name="Thumbnail Format Test")
        db.add(program)
        db.flush()

        # Create pictures for all formats
        pictures = {}
        formats = {
            "1920x1080": (1920, 1080),
            "1920x720": (1920, 720),
            "1080x1080": (1080, 1080),
            "810x1080": (810, 1080),
            "1080x1920": (1080, 1920)
        }

        for format_name, (width, height) in formats.items():
            pic = Picture(
                image_url=f"https://cdn.example.com/test-{format_name}.jpg",
                file_name=f"test-{format_name}.jpg",
                file_size_bytes=1024,
                width=width,
                height=height
            )
            db.add(pic)
            db.flush()
            pictures[format_name] = pic

        # Create media description with all image formats
        media_desc = MediaDescription(
            file_number=88004,
            episode_title="All Formats Episode",
            media_type="video",
            program_id=program.id,
            image_1920_1080_id=pictures["1920x1080"].id,
            image_1920_720_id=pictures["1920x720"].id,
            image_1080_1080_id=pictures["1080x1080"].id,
            image_810_1080_id=pictures["810x1080"].id,
            image_1080_1920_id=pictures["1080x1920"].id,
            content_status="published"
        )
        db.add(media_desc)
        db.flush()

        # Test each format in a separate showcase
        for format_name in formats.keys():
            showcase = MediaShowcase(
                title=f"Showcase {format_name}",
                thumbnail_format=format_name,
                list_type=ListTypeEnum.classic.value,
                percentage_width=100,
                percentage_height=80,
                slug=f"showcase-{format_name}"
            )
            db.add(showcase)
            db.flush()

            showcase.media_descriptions.append(media_desc)
            db.commit()

            # Fetch via CRUD and generate JSON
            fetched = crud_media_showcase.get(db, id=showcase.id)
            json_data = fetched.update_json(db)

            # Verify correct thumbnail URL
            assert len(json_data["items"]) == 1
            item = json_data["items"][0]
            expected_url = pictures[format_name].image_url
            assert item["thumbnail_url"] == expected_url, \
                f"Format {format_name}: expected {expected_url}, got {item['thumbnail_url']}"

    def test_showcase_filters_non_published_media(self, db: Session):
        """Test that only published media descriptions appear in showcase JSON."""
        program = Program(program_name="Content Status Test")
        db.add(program)
        db.flush()

        # Create media descriptions with different statuses
        published_media = MediaDescription(
            file_number=88100,
            episode_title="Published Episode",
            media_type="video",
            program_id=program.id,
            content_status="published",
        )

        draft_media = MediaDescription(
            file_number=88101,
            episode_title="Draft Episode",
            media_type="video",
            program_id=program.id,
            content_status="draft",
        )

        archived_media = MediaDescription(
            file_number=88102,
            episode_title="Archived Episode",
            media_type="video",
            program_id=program.id,
            content_status="archived",
        )

        scheduled_media = MediaDescription(
            file_number=88103,
            episode_title="Scheduled Episode",
            media_type="video",
            program_id=program.id,
            content_status="scheduled",
        )

        db.add(published_media)
        db.add(draft_media)
        db.add(archived_media)
        db.add(scheduled_media)
        db.commit()

        # Create showcase with all media descriptions
        from app.schemas.media_showcase import MediaShowcaseCreate

        showcase_data = MediaShowcaseCreate(
            title="Status Filter Test Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080,
            list_type=ListTypeEnum.classic,
            percentage_width=100,
            percentage_height=80,
            slug="status-filter-test",
            media_description_ids=[
                published_media.id,
                draft_media.id,
                archived_media.id,
                scheduled_media.id
            ]
        )
        showcase = crud_media_showcase.create(db, obj_in=showcase_data)

        # Generate JSON
        json_data = showcase.update_json(db)

        # Verify only published media appears
        assert json_data is not None, "JSON generation failed"
        assert "items" in json_data
        assert len(json_data["items"]) == 1, f"Expected only 1 published item, got {len(json_data['items'])}"

        # Verify it's the published one
        item = json_data["items"][0]
        assert item["title"] == "Published Episode"
        assert item["id"] == str(published_media.id)

        # Verify draft, archived, and scheduled are excluded
        titles = [item["title"] for item in json_data["items"]]
        assert "Draft Episode" not in titles
        assert "Archived Episode" not in titles
        assert "Scheduled Episode" not in titles
