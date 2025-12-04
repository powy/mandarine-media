"""
Tests for Media Description Serialization with Picture URL Variants

This test file verifies that the media description serialization properly
extracts all Picture URL variants (original, large, small) for all 5 formats,
and that the cascading thumbnail_url logic works correctly.
"""

import pytest
from app.utils.media_description_serializer import serialize_media_description_to_json
from app.models.media_description import MediaDescription
from app.models.picture import Picture
from sqlalchemy.orm import Session


class TestMediaDescriptionSerialization:
    """Test suite for media description JSON serialization with Picture variants"""

    def test_all_15_url_fields_present(self, db: Session):
        """Verify that all 15 URL variant fields are included in serialization"""
        # Create test pictures with all 3 URL variants
        picture_1920_1080 = Picture(
            image_url="https://example.com/1920x1080.jpg",
            large_image_url="https://example.com/1920x1080_large.jpg",
            small_image_url="https://example.com/1920x1080_small.jpg"
        )
        picture_1920_720 = Picture(
            image_url="https://example.com/1920x720.jpg",
            large_image_url="https://example.com/1920x720_large.jpg",
            small_image_url="https://example.com/1920x720_small.jpg"
        )
        picture_1080_1080 = Picture(
            image_url="https://example.com/1080x1080.jpg",
            large_image_url="https://example.com/1080x1080_large.jpg",
            small_image_url="https://example.com/1080x1080_small.jpg"
        )
        picture_810_1080 = Picture(
            image_url="https://example.com/810x1080.jpg",
            large_image_url="https://example.com/810x1080_large.jpg",
            small_image_url="https://example.com/810x1080_small.jpg"
        )
        picture_1080_1920 = Picture(
            image_url="https://example.com/1080x1920.jpg",
            large_image_url="https://example.com/1080x1920_large.jpg",
            small_image_url="https://example.com/1080x1920_small.jpg"
        )

        # Add pictures to database
        db.add_all([picture_1920_1080, picture_1920_720, picture_1080_1080,
                    picture_810_1080, picture_1080_1920])
        db.commit()

        # Create test media description
        media_desc = MediaDescription(
            file_number=99999,
            episode_title="Test Media",
            media_type="video",
            image_1920_1080_id=picture_1920_1080.id,
            image_1920_720_id=picture_1920_720.id,
            image_1080_1080_id=picture_1080_1080.id,
            image_810_1080_id=picture_810_1080.id,
            image_1080_1920_id=picture_1080_1920.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Serialize
        result = serialize_media_description_to_json(media_desc, db_session=db)

        # Verify all 15 URL fields are present
        expected_fields = [
            # 1920x1080 format
            "image_1920_1080_url", "image_1920_1080_large_url", "image_1920_1080_small_url",
            # 1920x720 format
            "image_1920_720_url", "image_1920_720_large_url", "image_1920_720_small_url",
            # 1080x1080 format
            "image_1080_1080_url", "image_1080_1080_large_url", "image_1080_1080_small_url",
            # 810x1080 format
            "image_810_1080_url", "image_810_1080_large_url", "image_810_1080_small_url",
            # 1080x1920 format
            "image_1080_1920_url", "image_1080_1920_large_url", "image_1080_1920_small_url"
        ]

        for field in expected_fields:
            assert field in result, f"Missing field: {field}"
            # Verify the field has a value (not None)
            assert result[field] is not None, f"Field {field} should not be None"

    def test_thumbnail_url_cascading_small_first(self, db: Session):
        """Test that thumbnail_url uses small→large→original cascade when is_large=False"""
        # Create picture with small variant
        picture = Picture(
            image_url="https://example.com/original.jpg",
            large_image_url="https://example.com/large.jpg",
            small_image_url="https://example.com/small.jpg"
        )
        db.add(picture)
        db.commit()

        # Create media description
        media_desc = MediaDescription(
            file_number=99998,
            episode_title="Test Small Cascade",
            media_type="video",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Serialize with is_large=False (default for non-hero showcases)
        result = serialize_media_description_to_json(
            media_desc,
            db_session=db,
            thumbnail_format="1920x1080",
            is_large=False
        )

        # Should prioritize small image
        assert result["thumbnail_url"] == "https://example.com/small.jpg"

    def test_thumbnail_url_cascading_large_first(self, db: Session):
        """Test that thumbnail_url uses large→original cascade when is_large=True"""
        # Create picture with large variant
        picture = Picture(
            image_url="https://example.com/original.jpg",
            large_image_url="https://example.com/large.jpg",
            small_image_url="https://example.com/small.jpg"
        )
        db.add(picture)
        db.commit()

        # Create media description
        media_desc = MediaDescription(
            file_number=99997,
            episode_title="Test Large Cascade",
            media_type="video",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Serialize with is_large=True (for hero showcases)
        result = serialize_media_description_to_json(
            media_desc,
            db_session=db,
            thumbnail_format="1920x1080",
            is_large=True
        )

        # Should prioritize large image
        assert result["thumbnail_url"] == "https://example.com/large.jpg"

    def test_thumbnail_url_fallback_to_original(self, db: Session):
        """Test that thumbnail_url falls back to original when variants are missing"""
        # Create picture with ONLY original URL
        picture = Picture(
            image_url="https://example.com/original.jpg",
            large_image_url=None,
            small_image_url=None
        )
        db.add(picture)
        db.commit()

        # Create media description
        media_desc = MediaDescription(
            file_number=99996,
            episode_title="Test Fallback",
            media_type="video",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Serialize with is_large=False
        result = serialize_media_description_to_json(
            media_desc,
            db_session=db,
            thumbnail_format="1920x1080",
            is_large=False
        )

        # Should fall back to original
        assert result["thumbnail_url"] == "https://example.com/original.jpg"

    def test_missing_picture_returns_none(self, db: Session):
        """Test that missing pictures result in None for URL fields"""
        # Create media description WITHOUT pictures
        media_desc = MediaDescription(
            file_number=99995,
            episode_title="Test No Pictures",
            media_type="video"
        )
        db.add(media_desc)
        db.commit()

        # Serialize
        result = serialize_media_description_to_json(media_desc, db_session=db)

        # All URL fields should be None
        assert result["image_1920_1080_url"] is None
        assert result["image_1920_1080_large_url"] is None
        assert result["image_1920_1080_small_url"] is None

    def test_partial_picture_variants(self, db: Session):
        """Test serialization when only some variants are populated"""
        # Create picture with original and large, but NO small
        picture = Picture(
            image_url="https://example.com/original.jpg",
            large_image_url="https://example.com/large.jpg",
            small_image_url=None
        )
        db.add(picture)
        db.commit()

        # Create media description
        media_desc = MediaDescription(
            file_number=99994,
            episode_title="Test Partial Variants",
            media_type="video",
            image_1920_1080_id=picture.id
        )
        db.add(media_desc)
        db.commit()
        db.refresh(media_desc)

        # Serialize
        result = serialize_media_description_to_json(media_desc, db_session=db)

        # Original and large should be present
        assert result["image_1920_1080_url"] == "https://example.com/original.jpg"
        assert result["image_1920_1080_large_url"] == "https://example.com/large.jpg"
        # Small should be None
        assert result["image_1920_1080_small_url"] is None

        # Thumbnail should cascade to large (since small is missing)
        result_with_thumbnail = serialize_media_description_to_json(
            media_desc,
            db_session=db,
            thumbnail_format="1920x1080",
            is_large=False
        )
        assert result_with_thumbnail["thumbnail_url"] == "https://example.com/large.jpg"
