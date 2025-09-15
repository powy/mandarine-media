#!/usr/bin/env python3
"""
Check the specific media description record in the database
"""

import pytest
from sqlalchemy.orm import Session
from uuid import UUID

def test_check_media_record(db: Session):
    """Check the specific media description in database"""

    from app.models.media_description import MediaDescription

    media_id = UUID('10e8da91-fa3a-42f9-8066-0f7a1b5bf448')
    media = db.query(MediaDescription).filter(MediaDescription.id == media_id).first()

    if media:
        print(f'\n=== MEDIA DESCRIPTION RECORD ANALYSIS ===')
        print(f'ID: {media.id}')
        print(f'Episode Title: {media.episode_title}')
        print(f'File Number: {media.file_number}')

        print(f'\n--- TAGS FIELD ---')
        print(f'Tags (raw): {repr(media.tags)}')
        print(f'Tags type: {type(media.tags)}')
        if media.tags:
            print(f'Tags length: {len(media.tags)}')
            print(f'Tags content: {media.tags}')
        else:
            print('Tags field is None or empty')

        print(f'\n--- HUMAN KEYWORDS FIELD ---')
        print(f'Human Keywords (raw): {repr(media.human_keywords_text_list)}')
        print(f'Human Keywords type: {type(media.human_keywords_text_list)}')
        if media.human_keywords_text_list:
            print(f'Human Keywords length: {len(media.human_keywords_text_list)}')
            print(f'Human Keywords content: {media.human_keywords_text_list}')
        else:
            print('Human Keywords field is None or empty')

        print(f'\n--- OTHER RELATED FIELDS ---')
        print(f'SEO Keywords: {repr(media.seo_keywords_text_list)}')
        print(f'Hashtags: {repr(media.hashtags_text_list)}')

        # Check if there's a schema difference
        print(f'\n--- FIELD COMPARISON ---')
        print(f'Are tags and human_keywords the same? {media.tags == media.human_keywords_text_list}')

        return {
            'found': True,
            'tags': media.tags,
            'human_keywords': media.human_keywords_text_list,
            'tags_empty': not media.tags,
            'human_keywords_empty': not media.human_keywords_text_list
        }
    else:
        print(f'\n❌ Media description with ID {media_id} not found in database')
        return {'found': False}

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])