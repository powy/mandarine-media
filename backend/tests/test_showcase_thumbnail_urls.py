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

    def test_all_format_urls_in_json(self, db: Session):
        """Test that all 5 format URLs are included in the JSON output."""
        # Create pictures for different formats
        picture_1920_1080 = Picture(
            image_url="https://cdn.example.com/img-1920x1080.jpg",
            file_name="img-1920x1080.jpg",
            width=1920,
            height=1080
        )
        picture_1920_720 = Picture(
            image_url="https://cdn.example.com/img-1920x720.jpg",
            file_name="img-1920x720.jpg",
            width=1920,
            height=720
        )
        picture_1080_1080 = Picture(
            image_url="https://cdn.example.com/img-1080x1080.jpg",
            file_name="img-1080x1080.jpg",
            width=1080,
            height=1080
        )
        db.add_all([picture_1920_1080, picture_1920_720, picture_1080_1080])
        db.commit()
        db.refresh(picture_1920_1080)
        db.refresh(picture_1920_720)
        db.refresh(picture_1080_1080)

        # Create media description with some formats populated, others not
        media_desc = MediaDescription(
            file_number=1006,
            episode_title="Test All Format URLs",
            media_type="video",
            friendly_url="/watch/test-all-formats",
            slug="test-all-formats",
            media_categories_list=["movie"],
            descriptive_summary_text="Test media with multiple format URLs",
            is_featured=True,
            production_year=2024,
            content_status="published",
            image_1920_1080_id=picture_1920_1080.id,
            image_1920_720_id=picture_1920_720.id,
            image_1080_1080_id=picture_1080_1080.id,
            # image_810_1080_id and image_1080_1920_id are intentionally left None
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Create showcase
        showcase = MediaShowcase(
            title="Test All Format URLs Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )
        db.add(showcase)
        db.commit()
        db.refresh(showcase)

        # Add media description to showcase
        showcase.media_descriptions.append(media_desc)
        db.commit()
        db.refresh(showcase)

        # Generate JSON
        json_data = showcase.update_json(db)

        # Verify the JSON contains all 5 format URL fields
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]

        # Check that thumbnail_url still works (based on showcase format)
        assert item["thumbnail_url"] == picture_1920_1080.image_url

        # Check that all 5 format URL fields are present
        assert "image_1920_1080_url" in item
        assert "image_1920_720_url" in item
        assert "image_1080_1080_url" in item
        assert "image_810_1080_url" in item
        assert "image_1080_1920_url" in item

        # Verify values for populated formats
        assert item["image_1920_1080_url"] == "https://cdn.example.com/img-1920x1080.jpg"
        assert item["image_1920_720_url"] == "https://cdn.example.com/img-1920x720.jpg"
        assert item["image_1080_1080_url"] == "https://cdn.example.com/img-1080x1080.jpg"

        # Verify None for unpopulated formats
        assert item["image_810_1080_url"] is None
        assert item["image_1080_1920_url"] is None

    def test_get_all_format_urls_helper(self, db: Session):
        """Test the _get_all_format_urls helper method directly."""
        # Create pictures for all 5 formats
        pictures = {}
        formats = {
            "1920x1080": (1920, 1080),
            "1920x720": (1920, 720),
            "1080x1080": (1080, 1080),
            "810x1080": (810, 1080),
            "1080x1920": (1080, 1920)
        }

        for format_name, (width, height) in formats.items():
            picture = Picture(
                image_url=f"https://cdn.example.com/img-{format_name}.jpg",
                file_name=f"img-{format_name}.jpg",
                width=width,
                height=height
            )
            db.add(picture)
            pictures[format_name] = picture

        db.commit()
        for pic in pictures.values():
            db.refresh(pic)

        # Create media description with all formats
        media_desc = MediaDescription(
            file_number=1007,
            episode_title="Test All Formats Helper",
            media_type="video",
            content_status="published",
            image_1920_1080_id=pictures["1920x1080"].id,
            image_1920_720_id=pictures["1920x720"].id,
            image_1080_1080_id=pictures["1080x1080"].id,
            image_810_1080_id=pictures["810x1080"].id,
            image_1080_1920_id=pictures["1080x1920"].id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Create showcase and test helper method
        showcase = MediaShowcase(
            title="Test Helper Method",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )

        # Test the helper method
        format_urls = showcase._get_all_format_urls(media_desc)

        # Verify all URLs are present
        assert format_urls["image_1920_1080_url"] == "https://cdn.example.com/img-1920x1080.jpg"
        assert format_urls["image_1920_720_url"] == "https://cdn.example.com/img-1920x720.jpg"
        assert format_urls["image_1080_1080_url"] == "https://cdn.example.com/img-1080x1080.jpg"
        assert format_urls["image_810_1080_url"] == "https://cdn.example.com/img-810x1080.jpg"
        assert format_urls["image_1080_1920_url"] == "https://cdn.example.com/img-1080x1920.jpg"