"""
Tests for special media_type handling in showcase JSON generation.

When a MediaDescription has media_type="season" or media_type="program",
it represents the season/program itself (not an episode), and requires
special reverse-lookup logic to find the correct season_id/program_id.
"""
import pytest
from sqlalchemy.orm import Session

from app.models.media_showcase import MediaShowcase
from app.models.media_description import MediaDescription
from app.models.program import Program
from app.models.season import Season
from app.models.picture import Picture
from app.schemas.media_showcase import ThumbnailFormatEnum, ListTypeEnum
from app.crud.media_showcase import media_showcase as crud_media_showcase


class TestShowcaseSpecialMediaTypes:
    """Test handling of season and program media_types in showcase JSON."""

    def test_season_media_type_json_generation(self, db: Session):
        """
        Test that a MediaDescription with media_type='season' correctly
        resolves season_id and program_id via reverse lookup.
        """
        # Create a program
        program = Program(program_name="Test Program for Season Type")
        db.add(program)
        db.flush()

        # Create a MediaDescription that IS the season's description
        season_media_desc = MediaDescription(
            file_number=90001,
            episode_title="Season 1 Overview",
            media_type="season",  # This is the key - it's a SEASON description
            friendly_url="/season/1",
            slug="season-1-overview",
            media_categories_list=["drama"],
            descriptive_summary_text="Overview of the first season",
            is_featured=True,
            content_status="published"
        )
        db.add(season_media_desc)
        db.flush()

        # Create the Season that references this MediaDescription
        season = Season(
            program_id=program.id,
            season_number=1,
            season_name="Season 1",
            general_media_description_id=season_media_desc.id  # The reverse link!
        )
        db.add(season)
        db.commit()

        # Create showcase with this season description
        showcase = MediaShowcase(
            title="Season Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            slug="season-showcase"
        )
        db.add(showcase)
        db.flush()

        showcase.media_descriptions.append(season_media_desc)
        db.commit()

        # Fetch via CRUD and generate JSON
        fetched = crud_media_showcase.get(db, id=showcase.id)
        json_data = fetched.update_json(db)

        # Verify the JSON
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]

        # The critical assertions - season_id and program_id should be from the Season object
        assert item["media_type"] == "season"
        assert item["season_id"] == str(season.id), f"Expected season_id {str(season.id)}, got {item['season_id']}"
        assert item["program_id"] == str(program.id), f"Expected program_id {str(program.id)}, got {item['program_id']}"
        assert item["episode_number"] is None  # Seasons don't have episode numbers

    def test_program_media_type_json_generation(self, db: Session):
        """
        Test that a MediaDescription with media_type='program' correctly
        resolves program_id via reverse lookup.
        """
        # Create a MediaDescription that IS the program's description
        program_media_desc = MediaDescription(
            file_number=90002,
            episode_title="Program Overview",
            media_type="program",  # This is the key - it's a PROGRAM description
            friendly_url="/program/overview",
            slug="program-overview",
            media_categories_list=["documentary"],
            descriptive_summary_text="Overview of the program",
            is_featured=True,
            content_status="published"
        )
        db.add(program_media_desc)
        db.flush()

        # Create the Program that references this MediaDescription
        program = Program(
            program_name="Test Program for Program Type",
            general_media_description_id=program_media_desc.id  # The reverse link!
        )
        db.add(program)
        db.commit()

        # Create showcase with this program description
        showcase = MediaShowcase(
            title="Program Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            slug="program-showcase"
        )
        db.add(showcase)
        db.flush()

        showcase.media_descriptions.append(program_media_desc)
        db.commit()

        # Fetch via CRUD and generate JSON
        fetched = crud_media_showcase.get(db, id=showcase.id)
        json_data = fetched.update_json(db)

        # Verify the JSON
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]

        # The critical assertions - program_id should be from the Program object
        assert item["media_type"] == "program"
        assert item["program_id"] == str(program.id), f"Expected program_id {str(program.id)}, got {item['program_id']}"
        assert item["season_id"] is None  # Programs don't have seasons
        assert item["episode_number"] is None  # Programs don't have episode numbers

    def test_mixed_showcase_episodes_seasons_programs(self, db: Session):
        """
        Test a showcase containing a mix of regular episodes, season descriptions,
        and program descriptions - ensuring each gets the correct ID resolution.
        """
        # Create program
        program = Program(program_name="Mixed Content Program")
        db.add(program)
        db.flush()

        # Create program description (media_type="program")
        program_desc = MediaDescription(
            file_number=90003,
            episode_title="Program Description",
            media_type="program",
            slug="program-desc-mixed",
            content_status="published"
        )
        db.add(program_desc)
        db.flush()

        # Link program to its description
        program.general_media_description_id = program_desc.id
        db.flush()

        # Create season
        season = Season(
            program_id=program.id,
            season_number=1,
            season_name="Season 1"
        )
        db.add(season)
        db.flush()

        # Create season description (media_type="season")
        season_desc = MediaDescription(
            file_number=90004,
            episode_title="Season 1 Description",
            media_type="season",
            slug="season-desc-mixed",
            content_status="published"
        )
        db.add(season_desc)
        db.flush()

        # Link season to its description
        season.general_media_description_id = season_desc.id
        db.flush()

        # Create regular episode (media_type="video")
        episode = MediaDescription(
            file_number=90005,
            episode_title="Episode 1",
            media_type="video",
            program_id=program.id,
            season_id=season.id,
            episode_number=1,
            slug="episode-1-mixed",
            content_status="published"
        )
        db.add(episode)
        db.commit()

        # Create showcase with all three types
        from app.schemas.media_showcase import MediaShowcaseCreate

        showcase_data = MediaShowcaseCreate(
            title="Mixed Type Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080,
            list_type=ListTypeEnum.carousel,
            percentage_width=100,
            percentage_height=80,
            slug="mixed-type-showcase",
            media_description_ids=[program_desc.id, season_desc.id, episode.id]
        )
        showcase = crud_media_showcase.create(db, obj_in=showcase_data)

        # Generate JSON
        json_data = showcase.update_json(db)

        # Verify we have all three items
        assert len(json_data["items"]) == 3

        # Create lookup by media_type for easier verification
        items_by_type = {item["media_type"]: item for item in json_data["items"]}

        # Verify program type
        program_item = items_by_type["program"]
        assert program_item["program_id"] == str(program.id)
        assert program_item["season_id"] is None
        assert program_item["episode_number"] is None

        # Verify season type
        season_item = items_by_type["season"]
        assert season_item["season_id"] == str(season.id)
        assert season_item["program_id"] == str(program.id)
        assert season_item["episode_number"] is None

        # Verify regular episode (video type)
        episode_item = items_by_type["video"]
        assert episode_item["program_id"] == str(program.id)
        assert episode_item["season_id"] == str(season.id)
        assert episode_item["episode_number"] == 1

    def test_season_without_program(self, db: Session):
        """Test a season description where the season doesn't have a program."""
        # Create season description
        season_desc = MediaDescription(
            file_number=90006,
            episode_title="Orphan Season",
            media_type="season",
            slug="orphan-season",
            content_status="published"
        )
        db.add(season_desc)
        db.flush()

        # Create season WITHOUT a program
        season = Season(
            program_id=None,
            season_number=1,
            season_name="Orphan Season",
            general_media_description_id=season_desc.id
        )
        db.add(season)
        db.commit()

        # Create showcase
        showcase = MediaShowcase(
            title="Orphan Season Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            slug="orphan-season-showcase"
        )
        db.add(showcase)
        db.flush()

        showcase.media_descriptions.append(season_desc)
        db.commit()

        # Generate JSON
        fetched = crud_media_showcase.get(db, id=showcase.id)
        json_data = fetched.update_json(db)

        assert len(json_data["items"]) == 1
        item = json_data["items"][0]

        assert item["media_type"] == "season"
        assert item["season_id"] == str(season.id)
        assert item["program_id"] is None  # No program associated

    def test_orphaned_season_media_type(self, db: Session):
        """
        Test a MediaDescription with media_type="season" but no Season
        pointing back to it (edge case/orphaned data).
        """
        # Create season description WITHOUT a Season pointing to it
        orphan_season_desc = MediaDescription(
            file_number=90007,
            episode_title="Orphaned Season Description",
            media_type="season",
            slug="orphaned-season-desc",
            content_status="published"
        )
        db.add(orphan_season_desc)
        db.commit()

        # Create showcase
        showcase = MediaShowcase(
            title="Orphaned Season Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            slug="orphaned-season-showcase"
        )
        db.add(showcase)
        db.flush()

        showcase.media_descriptions.append(orphan_season_desc)
        db.commit()

        # Generate JSON
        fetched = crud_media_showcase.get(db, id=showcase.id)
        json_data = fetched.update_json(db)

        assert len(json_data["items"]) == 1
        item = json_data["items"][0]

        # Should handle gracefully - no season found means None values
        assert item["media_type"] == "season"
        assert item["season_id"] is None
        assert item["program_id"] is None

    def test_orphaned_program_media_type(self, db: Session):
        """
        Test a MediaDescription with media_type="program" but no Program
        pointing back to it (edge case/orphaned data).
        """
        # Create program description WITHOUT a Program pointing to it
        orphan_program_desc = MediaDescription(
            file_number=90008,
            episode_title="Orphaned Program Description",
            media_type="program",
            slug="orphaned-program-desc",
            content_status="published"
        )
        db.add(orphan_program_desc)
        db.commit()

        # Create showcase
        showcase = MediaShowcase(
            title="Orphaned Program Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            slug="orphaned-program-showcase"
        )
        db.add(showcase)
        db.flush()

        showcase.media_descriptions.append(orphan_program_desc)
        db.commit()

        # Generate JSON
        fetched = crud_media_showcase.get(db, id=showcase.id)
        json_data = fetched.update_json(db)

        assert len(json_data["items"]) == 1
        item = json_data["items"][0]

        # Should handle gracefully - no program found means None values
        assert item["media_type"] == "program"
        assert item["program_id"] is None
        assert item["season_id"] is None
