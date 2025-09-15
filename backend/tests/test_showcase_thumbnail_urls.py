import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.media_showcase import MediaShowcase
from app.models.media_description import MediaDescription
from app.models.picture import Picture
from app.schemas.media_showcase import ThumbnailFormatEnum, ListTypeEnum


@pytest.fixture
def sample_picture(db: Session):
    """Create a test Picture with a direct image URL."""
    picture = Picture(
        image_url="https://cdn.example.com/test-image.jpg",
        file_name="test-image.jpg",
        file_size_bytes=1024,
        width=1920,
        height=1080,
        alt_text="Test image",
        description="A test image for unit testing"
    )
    db.add(picture)
    db.commit()
    db.refresh(picture)
    return picture


@pytest.fixture
def media_description_with_image(db: Session, sample_picture):
    """Create a MediaDescription with an image attached."""
    media_desc = MediaDescription(
        file_number=1002,
        episode_title="Test Movie with Image",
        media_type="video",
        friendly_url="/watch/test-movie-with-image",
        slug="test-movie-with-image",
        media_categories_list=["movie", "drama"],
        descriptive_summary_text="A test movie with image",
        is_featured=True,
        production_year=2024,
        content_status="published",
        image_1920_1080_id=sample_picture.id  # Assign the image to 1920x1080 format
    )
    db.add(media_desc)
    db.commit()
    db.refresh(media_desc)
    return media_desc


@pytest.fixture
def media_description_without_image(db: Session):
    """Create a MediaDescription without any images."""
    media_desc = MediaDescription(
        file_number=1003,
        episode_title="Test Movie without Image",
        media_type="video",
        friendly_url="/watch/test-movie-no-image",
        slug="test-movie-no-image",
        media_categories_list=["movie", "drama"],
        descriptive_summary_text="A test movie without image",
        is_featured=False,
        production_year=2024,
        content_status="published"
    )
    db.add(media_desc)
    db.commit()
    db.refresh(media_desc)
    return media_desc


class TestShowcaseThumbnailUrls:
    """Test MediaShowcase thumbnail URL generation functionality."""

    def test_thumbnail_url_with_image_present(self, db: Session, media_description_with_image, sample_picture):
        """Test that direct image URLs are returned when images are present."""
        showcase = MediaShowcase(
            title="Test Showcase with Images",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.carousel.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )

        # Test the thumbnail URL generation
        thumbnail_url = showcase._get_thumbnail_url(media_description_with_image, "1920x1080")

        # Should return the direct image URL, not an API endpoint
        assert thumbnail_url == sample_picture.image_url
        assert thumbnail_url == "https://cdn.example.com/test-image.jpg"
        assert not thumbnail_url.startswith("/api/v1/pictures/")

    def test_thumbnail_url_without_image(self, db: Session, media_description_without_image):
        """Test that None is returned when no image is present."""
        showcase = MediaShowcase(
            title="Test Showcase without Images",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.carousel.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )

        # Test the thumbnail URL generation
        thumbnail_url = showcase._get_thumbnail_url(media_description_without_image, "1920x1080")

        # Should return None since no image is associated
        assert thumbnail_url is None

    def test_thumbnail_url_wrong_format(self, db: Session, media_description_with_image):
        """Test that None is returned when requesting a format that doesn't exist."""
        showcase = MediaShowcase(
            title="Test Showcase Format Mismatch",
            thumbnail_format=ThumbnailFormatEnum.format_1920x720.value,
            list_type=ListTypeEnum.carousel.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )

        # Test requesting 1920x720 format when only 1920x1080 is available
        thumbnail_url = showcase._get_thumbnail_url(media_description_with_image, "1920x720")

        # Should return None since this format doesn't have an image
        assert thumbnail_url is None

    def test_json_generation_with_direct_urls(self, db: Session, media_description_with_image, sample_picture):
        """Test that JSON generation includes direct image URLs."""
        showcase = MediaShowcase(
            title="Test Showcase JSON Generation",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.carousel.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        # Add the media description to the showcase
        showcase.media_descriptions.append(media_description_with_image)
        db.commit()
        db.refresh(showcase)

        # Generate JSON
        json_data = showcase.update_json(db)

        # Verify the JSON contains direct image URLs
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]
        assert item["thumbnail_url"] == sample_picture.image_url
        assert item["thumbnail_url"] == "https://cdn.example.com/test-image.jpg"
        assert not item["thumbnail_url"].startswith("/api/v1/pictures/")

    def test_json_generation_without_images(self, db: Session, media_description_without_image):
        """Test that JSON generation handles missing images gracefully."""
        showcase = MediaShowcase(
            title="Test Showcase JSON No Images",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.carousel.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        # Add the media description to the showcase
        showcase.media_descriptions.append(media_description_without_image)
        db.commit()
        db.refresh(showcase)

        # Generate JSON
        json_data = showcase.update_json(db)

        # Verify the JSON handles missing images
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]
        assert item["thumbnail_url"] is None

    def test_multiple_formats_mixed_availability(self, db: Session, sample_picture):
        """Test behavior with multiple formats where some are available and others aren't."""
        # Create pictures for different formats
        picture_720 = Picture(
            image_url="https://cdn.example.com/test-image-720.jpg",
            file_name="test-image-720.jpg",
            width=1920,
            height=720
        )
        db.add(picture_720)
        db.commit()
        db.refresh(picture_720)

        # Create media description with mixed image availability
        media_desc = MediaDescription(
            file_number=1004,
            episode_title="Test Movie Mixed Images",
            media_type="video",
            friendly_url="/watch/test-movie-mixed",
            slug="test-movie-mixed",
            media_categories_list=["movie"],
            descriptive_summary_text="A test movie with mixed images",
            is_featured=True,
            production_year=2024,
            content_status="published",
            image_1920_1080_id=sample_picture.id,  # Has 1920x1080
            image_1920_720_id=picture_720.id,      # Has 1920x720
            # Missing: 1080x1080, 810x1080, 1080x1920
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        showcase = MediaShowcase(
            title="Test Mixed Formats",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )

        # Test each format
        assert showcase._get_thumbnail_url(media_desc, "1920x1080") == sample_picture.image_url
        assert showcase._get_thumbnail_url(media_desc, "1920x720") == picture_720.image_url
        assert showcase._get_thumbnail_url(media_desc, "1080x1080") is None
        assert showcase._get_thumbnail_url(media_desc, "810x1080") is None
        assert showcase._get_thumbnail_url(media_desc, "1080x1920") is None

    def test_all_thumbnail_formats(self, db: Session):
        """Test that all defined thumbnail formats are supported."""
        formats = ["1920x1080", "1920x720", "1080x1080", "810x1080", "1080x1920"]

        showcase = MediaShowcase(
            title="Test All Formats",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )

        media_desc = MediaDescription(
            file_number=1005,
            episode_title="Test All Formats Movie",
            media_type="video",
            content_status="published"
        )

        # Test all formats return None when no images are set
        for format_name in formats:
            assert showcase._get_thumbnail_url(media_desc, format_name) is None