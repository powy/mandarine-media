import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app import crud
from app.schemas.media_description import MediaDescriptionCreate, MediaDescriptionUpdate
from app.models.language import Language
from app.models.media_description import MediaDescription

client = TestClient(app)


@pytest.fixture
def sample_languages(db: Session):
    """Create sample languages for testing."""
    languages_data = [
        {"name": "English", "sigle": "en"},
        {"name": "French", "sigle": "fr"},
        {"name": "Korean", "sigle": "ko"},
        {"name": "Spanish", "sigle": "es"},
    ]

    languages = []
    for lang_data in languages_data:
        language = Language(id=str(uuid.uuid4()), **lang_data)
        db.add(language)
        languages.append(language)

    db.commit()
    return languages


@pytest.fixture
def sample_media_with_languages_data(sample_languages):
    """Sample media description data with language associations."""
    return {
        "file_number": 12345,
        "episode_title": "Multi-Language Test Episode",
        "media_type": "video",
        "descriptive_summary_text": "Test episode with multiple language support",
        "original_language_ids": [str(sample_languages[2].id)],  # Korean
        "available_subtitle_language_ids": [str(sample_languages[0].id), str(sample_languages[1].id)],  # English, French
        "available_audio_language_ids": [str(sample_languages[2].id), str(sample_languages[0].id)],  # Korean, English
    }


class TestMediaDescriptionLanguages:
    """Test language associations for MediaDescription."""

    def test_create_media_with_languages(self, db: Session, sample_languages, sample_media_with_languages_data):
        """Test creating media description with language associations."""
        media_in = MediaDescriptionCreate(**sample_media_with_languages_data)
        media = crud.media_description.create(db=db, obj_in=media_in)

        # Verify the media was created
        assert media.file_number == 12345
        assert media.episode_title == "Multi-Language Test Episode"

        # Verify original languages
        assert len(media.original_languages) == 1
        assert media.original_languages[0].sigle == "ko"

        # Verify subtitle languages
        assert len(media.available_subtitle_languages) == 2
        subtitle_sigles = {lang.sigle for lang in media.available_subtitle_languages}
        assert subtitle_sigles == {"en", "fr"}

        # Verify audio languages
        assert len(media.available_audio_languages) == 2
        audio_sigles = {lang.sigle for lang in media.available_audio_languages}
        assert audio_sigles == {"ko", "en"}

    def test_update_media_languages(self, db: Session, sample_languages, sample_media_with_languages_data):
        """Test updating language associations."""
        # Create initial media
        media_in = MediaDescriptionCreate(**sample_media_with_languages_data)
        media = crud.media_description.create(db=db, obj_in=media_in)

        # Update with new languages
        update_data = MediaDescriptionUpdate(
            available_subtitle_language_ids=[str(sample_languages[3].id)],  # Spanish only
            available_audio_language_ids=[str(sample_languages[1].id), str(sample_languages[3].id)],  # French, Spanish
        )

        updated_media = crud.media_description.update(db=db, db_obj=media, obj_in=update_data)

        # Verify updated subtitle languages
        assert len(updated_media.available_subtitle_languages) == 1
        assert updated_media.available_subtitle_languages[0].sigle == "es"

        # Verify updated audio languages
        assert len(updated_media.available_audio_languages) == 2
        audio_sigles = {lang.sigle for lang in updated_media.available_audio_languages}
        assert audio_sigles == {"fr", "es"}

        # Verify original languages remained unchanged
        assert len(updated_media.original_languages) == 1
        assert updated_media.original_languages[0].sigle == "ko"

    def test_get_media_with_language_relationships(self, db: Session, sample_languages, sample_media_with_languages_data):
        """Test retrieving media with all language relationships loaded."""
        media_in = MediaDescriptionCreate(**sample_media_with_languages_data)
        created_media = crud.media_description.create(db=db, obj_in=media_in)

        # Retrieve with relationships
        media = crud.media_description.get_with_relationships(db=db, id=created_media.id)

        assert media is not None
        assert len(media.original_languages) == 1
        assert len(media.available_subtitle_languages) == 2
        assert len(media.available_audio_languages) == 2

    def test_create_media_without_languages(self, db: Session):
        """Test creating media description without language associations."""
        media_data = {
            "file_number": 54321,
            "episode_title": "No Languages Test",
            "media_type": "video",
        }

        media_in = MediaDescriptionCreate(**media_data)
        media = crud.media_description.create(db=db, obj_in=media_in)

        assert media.file_number == 54321
        assert len(media.original_languages) == 0
        assert len(media.available_subtitle_languages) == 0
        assert len(media.available_audio_languages) == 0

    def test_clear_language_associations(self, db: Session, sample_languages, sample_media_with_languages_data):
        """Test clearing language associations by passing empty lists."""
        # Create media with languages
        media_in = MediaDescriptionCreate(**sample_media_with_languages_data)
        media = crud.media_description.create(db=db, obj_in=media_in)

        # Clear all language associations
        update_data = MediaDescriptionUpdate(
            original_language_ids=[],
            available_subtitle_language_ids=[],
            available_audio_language_ids=[],
        )

        updated_media = crud.media_description.update(db=db, db_obj=media, obj_in=update_data)

        assert len(updated_media.original_languages) == 0
        assert len(updated_media.available_subtitle_languages) == 0
        assert len(updated_media.available_audio_languages) == 0

    def test_invalid_language_ids(self, db: Session):
        """Test handling of invalid language IDs."""
        media_data = {
            "file_number": 99999,
            "episode_title": "Invalid Languages Test",
            "media_type": "video",
            "original_language_ids": [str(uuid.uuid4())],  # Non-existent language ID
        }

        media_in = MediaDescriptionCreate(**media_data)
        media = crud.media_description.create(db=db, obj_in=media_in)

        # Should create successfully but with no language associations
        assert len(media.original_languages) == 0

    def test_duplicate_language_associations(self, db: Session, sample_languages):
        """Test handling of duplicate language IDs in associations."""
        media_data = {
            "file_number": 88888,
            "episode_title": "Duplicate Languages Test",
            "media_type": "video",
            # Same language ID in multiple lists
            "original_language_ids": [str(sample_languages[0].id)],
            "available_subtitle_language_ids": [str(sample_languages[0].id), str(sample_languages[0].id)],  # Duplicate
            "available_audio_language_ids": [str(sample_languages[0].id)],
        }

        media_in = MediaDescriptionCreate(**media_data)
        media = crud.media_description.create(db=db, obj_in=media_in)

        # Should handle duplicates gracefully
        assert len(media.original_languages) == 1
        assert len(media.available_subtitle_languages) == 1  # Duplicates removed
        assert len(media.available_audio_languages) == 1
        assert media.original_languages[0].sigle == "en"
        assert media.available_subtitle_languages[0].sigle == "en"
        assert media.available_audio_languages[0].sigle == "en"


class TestMediaDescriptionLanguagesAPI:
    """Test language associations via API endpoints."""

    def test_api_create_media_with_languages(self, sample_languages):
        """Test creating media with languages via API."""
        media_data = {
            "file_number": 77777,
            "episode_title": "API Languages Test",
            "media_type": "video",
            "original_language_ids": [str(sample_languages[0].id)],
            "available_subtitle_language_ids": [str(sample_languages[1].id), str(sample_languages[2].id)],
            "available_audio_language_ids": [str(sample_languages[0].id), str(sample_languages[3].id)],
        }

        # This test would require authentication setup and proper API client
        # For now, this serves as a placeholder for API testing structure
        pass

    def test_api_response_includes_languages(self, sample_languages):
        """Test that API responses include language data in correct format."""
        # This test would verify that the API returns language data
        # in the expected LanguageSimple format
        pass


# Integration test to verify schema validation
def test_language_schema_validation():
    """Test that language field validation works correctly."""
    from pydantic import ValidationError

    # Test valid language IDs format
    valid_data = {
        "file_number": 12345,
        "episode_title": "Schema Test",
        "media_type": "video",
        "original_language_ids": [str(uuid.uuid4())],
        "available_subtitle_language_ids": [str(uuid.uuid4()), str(uuid.uuid4())],
        "available_audio_language_ids": [str(uuid.uuid4())],
    }

    media_in = MediaDescriptionCreate(**valid_data)
    assert media_in.original_language_ids is not None
    assert len(media_in.available_subtitle_language_ids) == 2
    assert len(media_in.available_audio_language_ids) == 1

    # Test invalid format (should not raise ValidationError for string UUIDs)
    invalid_data = {
        "file_number": 12346,
        "episode_title": "Schema Test 2",
        "media_type": "video",
        "original_language_ids": ["not-a-uuid"],
    }

    # This should still work as we're using string UUIDs
    media_in_invalid = MediaDescriptionCreate(**invalid_data)
    assert media_in_invalid.original_language_ids == ["not-a-uuid"]