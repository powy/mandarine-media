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

    def test_hero_showcase_uses_large_images(self, db: Session):
        """Test that hero showcases prioritize large images."""
        # Create picture with all three variants
        picture = Picture(
            image_url="https://cdn.example.com/original.jpg",
            large_image_url="https://cdn.example.com/large.jpg",
            small_image_url="https://cdn.example.com/small.jpg",
            file_name="test-hero-image.jpg",
            width=1920,
            height=1080
        )
        db.add(picture)
        db.commit()
        db.refresh(picture)

        # Create media description
        media_desc = MediaDescription(
            file_number=2001,
            episode_title="Hero Showcase Test",
            media_type="video",
            friendly_url="/watch/hero-test",
            slug="hero-test",
            media_categories_list=["movie"],
            descriptive_summary_text="Test for hero showcase",
            is_featured=True,
            production_year=2024,
            content_status="published",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Create hero showcase
        hero_showcase = MediaShowcase(
            title="Hero Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.hero.value,  # Hero type
            percentage_width=100,
            percentage_height=100,
            is_active=True,
            priority_in_screen=1
        )
        db.add(hero_showcase)
        db.commit()
        db.refresh(hero_showcase)

        # Add media description to showcase
        hero_showcase.media_descriptions.append(media_desc)
        db.commit()
        db.refresh(hero_showcase)

        # Generate JSON
        json_data = hero_showcase.update_json(db)

        # Verify the JSON uses large image (not small)
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]
        assert item["thumbnail_url"] == "https://cdn.example.com/large.jpg"

    def test_non_hero_showcase_uses_small_images(self, db: Session):
        """Test that non-hero showcases prioritize small images."""
        # Create picture with all three variants
        picture = Picture(
            image_url="https://cdn.example.com/original.jpg",
            large_image_url="https://cdn.example.com/large.jpg",
            small_image_url="https://cdn.example.com/small.jpg",
            file_name="test-classic-image.jpg",
            width=1920,
            height=1080
        )
        db.add(picture)
        db.commit()
        db.refresh(picture)

        # Create media description
        media_desc = MediaDescription(
            file_number=2002,
            episode_title="Classic Showcase Test",
            media_type="video",
            friendly_url="/watch/classic-test",
            slug="classic-test",
            media_categories_list=["movie"],
            descriptive_summary_text="Test for classic showcase",
            is_featured=True,
            production_year=2024,
            content_status="published",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Create classic showcase
        classic_showcase = MediaShowcase(
            title="Classic Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.classic.value,  # Classic type
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )
        db.add(classic_showcase)
        db.commit()
        db.refresh(classic_showcase)

        # Add media description to showcase
        classic_showcase.media_descriptions.append(media_desc)
        db.commit()
        db.refresh(classic_showcase)

        # Generate JSON
        json_data = classic_showcase.update_json(db)

        # Verify the JSON uses small image (not large)
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]
        assert item["thumbnail_url"] == "https://cdn.example.com/small.jpg"

    def test_hero_showcase_fallback_to_original(self, db: Session):
        """Test that hero showcases fallback to original when large is not available."""
        # Create picture with only original and small (no large)
        picture = Picture(
            image_url="https://cdn.example.com/original.jpg",
            large_image_url=None,
            small_image_url="https://cdn.example.com/small.jpg",
            file_name="test-hero-fallback.jpg",
            width=1920,
            height=1080
        )
        db.add(picture)
        db.commit()
        db.refresh(picture)

        # Create media description
        media_desc = MediaDescription(
            file_number=2003,
            episode_title="Hero Fallback Test",
            media_type="video",
            friendly_url="/watch/hero-fallback",
            slug="hero-fallback",
            media_categories_list=["movie"],
            descriptive_summary_text="Test hero fallback",
            is_featured=True,
            production_year=2024,
            content_status="published",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Create hero showcase
        hero_showcase = MediaShowcase(
            title="Hero Fallback Showcase",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.hero.value,
            percentage_width=100,
            percentage_height=100,
            is_active=True,
            priority_in_screen=1
        )
        db.add(hero_showcase)
        db.commit()
        db.refresh(hero_showcase)

        # Add media description to showcase
        hero_showcase.media_descriptions.append(media_desc)
        db.commit()
        db.refresh(hero_showcase)

        # Generate JSON
        json_data = hero_showcase.update_json(db)

        # Verify the JSON uses original (skip small, large not available)
        assert len(json_data["items"]) == 1
        item = json_data["items"][0]
        assert item["thumbnail_url"] == "https://cdn.example.com/original.jpg"

    def test_non_hero_showcase_cascades_through_all_sizes(self, db: Session):
        """Test that non-hero showcases cascade from small → large → original."""
        # Test 1: Only large and original available (no small)
        picture1 = Picture(
            image_url="https://cdn.example.com/original1.jpg",
            large_image_url="https://cdn.example.com/large1.jpg",
            small_image_url=None,
            file_name="test-cascade1.jpg",
            width=1920,
            height=1080
        )
        db.add(picture1)
        db.commit()
        db.refresh(picture1)

        media_desc1 = MediaDescription(
            file_number=2004,
            episode_title="Cascade Test 1",
            media_type="video",
            friendly_url="/watch/cascade1",
            slug="cascade1",
            content_status="published",
            image_1920_1080_id=picture1.id
        )
        db.add(media_desc1)
        db.commit()
        db.refresh(media_desc1)

        showcase1 = MediaShowcase(
            title="Cascade Showcase 1",
            thumbnail_format=ThumbnailFormatEnum.format_1920x1080.value,
            list_type=ListTypeEnum.carousel.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=1
        )
        db.add(showcase1)
        db.commit()
        db.refresh(showcase1)
        showcase1.media_descriptions.append(media_desc1)
        db.commit()

        json_data1 = showcase1.update_json(db)
        assert json_data1["items"][0]["thumbnail_url"] == "https://cdn.example.com/large1.jpg"

        # Test 2: Only original available (no small or large)
        picture2 = Picture(
            image_url="https://cdn.example.com/original2.jpg",
            large_image_url=None,
            small_image_url=None,
            file_name="test-cascade2.jpg",
            width=1920,
            height=720
        )
        db.add(picture2)
        db.commit()
        db.refresh(picture2)

        media_desc2 = MediaDescription(
            file_number=2005,
            episode_title="Cascade Test 2",
            media_type="video",
            friendly_url="/watch/cascade2",
            slug="cascade2",
            content_status="published",
            image_1920_720_id=picture2.id
        )
        db.add(media_desc2)
        db.commit()
        db.refresh(media_desc2)

        showcase2 = MediaShowcase(
            title="Cascade Showcase 2",
            thumbnail_format=ThumbnailFormatEnum.format_1920x720.value,
            list_type=ListTypeEnum.carousel.value,
            percentage_width=100,
            percentage_height=80,
            is_active=True,
            priority_in_screen=2
        )
        db.add(showcase2)
        db.commit()
        db.refresh(showcase2)
        showcase2.media_descriptions.append(media_desc2)
        db.commit()

        json_data2 = showcase2.update_json(db)
        assert json_data2["items"][0]["thumbnail_url"] == "https://cdn.example.com/original2.jpg"