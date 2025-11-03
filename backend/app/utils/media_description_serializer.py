"""
Media Description JSON Serialization Utility

This module provides common serialization logic for MediaDescription objects,
used by both MediaShowcase and Season models to generate JSON cache.
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from uuid import UUID


def serialize_media_description_to_json(
    media_desc,  # MediaDescription instance
    db_session: Session,
    thumbnail_format: Optional[str] = None,
    include_display_order: bool = False,
    association_id: Optional[UUID] = None
) -> Dict[str, Any]:
    """
    Serialize a MediaDescription to JSON with resolved image URLs and relationships.

    This function creates a JSON-friendly representation of a MediaDescription with:
    - Core fields (title, media_type, slug, etc.)
    - Resolved program_id and season_id based on media_type
    - All 5 image format URLs resolved from Picture relationships
    - Optional thumbnail_url for a specific format
    - Optional display_order from association table

    Args:
        media_desc: The MediaDescription instance to serialize
        db_session: Database session for queries
        thumbnail_format: If provided, includes 'thumbnail_url' field (e.g., "1920x1080")
        include_display_order: Whether to include display_order field
        association_id: ID of parent (showcase/season) for display_order lookup

    Returns:
        Dictionary with serialized data ready for JSON encoding
    """
    # Step 1: Resolve program_id and season_id
    program_id_val, season_id_val = _resolve_program_season_ids(media_desc, db_session)

    # Step 2: Get all image format URLs
    format_urls = _get_all_image_format_urls(media_desc)

    # Step 3: Build base item data
    item_data = {
        "id": str(media_desc.id),
        "title": media_desc.episode_title,
        "media_type": media_desc.media_type,
        "friendly_url": media_desc.friendly_url,
        "slug": media_desc.slug,
        "media_categories_list": media_desc.media_categories_list,
        "descriptive_summary_text": media_desc.descriptive_summary_text,
        "is_featured": media_desc.is_featured,
        "program_id": program_id_val,
        "season_id": season_id_val,
        "episode_number": media_desc.episode_number,
        # Add all 5 format URLs
        "image_1920_1080_url": format_urls["image_1920_1080_url"],
        "image_1920_720_url": format_urls["image_1920_720_url"],
        "image_1080_1080_url": format_urls["image_1080_1080_url"],
        "image_810_1080_url": format_urls["image_810_1080_url"],
        "image_1080_1920_url": format_urls["image_1080_1920_url"]
    }

    # Step 4: Add optional thumbnail_url
    if thumbnail_format:
        item_data["thumbnail_url"] = _get_thumbnail_url(media_desc, thumbnail_format)

    # Note: display_order is not added here because it's context-specific
    # (different for showcase vs season). The caller should add it if needed.

    return item_data


def _resolve_program_season_ids(media_desc, db_session: Session) -> tuple[Optional[str], Optional[str]]:
    """
    Resolve program_id and season_id based on media_type.

    Logic:
    - If media_type == "season": Find Season where general_media_description_id == media_desc.id
    - If media_type == "program": Find Program where general_media_description_id == media_desc.id
    - Otherwise: Use direct FK fields (media_desc.program_id, media_desc.season_id)

    Returns:
        Tuple of (program_id_str, season_id_str) or (None, None)
    """
    if media_desc.media_type == "season":
        from app.models.season import Season
        season = db_session.query(Season).filter(
            Season.general_media_description_id == media_desc.id
        ).first()

        program_id_val = str(season.program_id) if season and season.program_id else None
        season_id_val = str(season.id) if season else None
        return program_id_val, season_id_val

    elif media_desc.media_type == "program":
        from app.models.program import Program
        program = db_session.query(Program).filter(
            Program.general_media_description_id == media_desc.id
        ).first()

        program_id_val = str(program.id) if program else None
        season_id_val = None  # Programs don't have a season
        return program_id_val, season_id_val

    else:
        # Regular episode or other content type - use standard FK fields
        program_id_val = str(media_desc.program_id) if media_desc.program_id else None
        season_id_val = str(media_desc.season_id) if media_desc.season_id else None
        return program_id_val, season_id_val


def _get_all_image_format_urls(media_desc) -> Dict[str, Optional[str]]:
    """
    Get all 5 thumbnail format URLs for a media description.

    Returns dictionary with keys:
    - image_1920_1080_url
    - image_1920_720_url
    - image_1080_1080_url
    - image_810_1080_url
    - image_1080_1920_url

    Each value is either the image URL string or None if not set.
    """
    format_fields = {
        "image_1920_1080_url": 'image_1920_1080',
        "image_1920_720_url": 'image_1920_720',
        "image_1080_1080_url": 'image_1080_1080',
        "image_810_1080_url": 'image_810_1080',
        "image_1080_1920_url": 'image_1080_1920'
    }

    result = {}
    for url_field, picture_attr in format_fields.items():
        picture = getattr(media_desc, picture_attr, None)
        if picture and hasattr(picture, 'image_url') and picture.image_url:
            result[url_field] = picture.image_url
        else:
            result[url_field] = None

    return result


def _get_thumbnail_url(media_desc, format_type: str) -> Optional[str]:
    """
    Get the appropriate thumbnail URL for a specific format.

    Args:
        media_desc: MediaDescription instance
        format_type: Format string (e.g., "1920x1080", "1920x720", etc.)

    Returns:
        Image URL string or None if not available
    """
    format_to_picture = {
        "1920x1080": getattr(media_desc, 'image_1920_1080', None),
        "1920x720": getattr(media_desc, 'image_1920_720', None),
        "1080x1080": getattr(media_desc, 'image_1080_1080', None),
        "810x1080": getattr(media_desc, 'image_810_1080', None),
        "1080x1920": getattr(media_desc, 'image_1080_1920', None)
    }

    picture = format_to_picture.get(format_type)
    if picture and hasattr(picture, 'image_url') and picture.image_url:
        return picture.image_url
    return None
