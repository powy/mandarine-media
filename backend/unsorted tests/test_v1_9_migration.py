#!/usr/bin/env python3
"""
Simple test to validate API v1.8 to v1.9 migration changes.
This tests the basic model and schema structure without database dependency.
"""

def test_media_description_model():
    """Test MediaDescription model has the renamed fields."""
    try:
        from app.models.media_description import MediaDescription
        
        # Check that old field names are gone and new ones exist
        columns = [col.name for col in MediaDescription.__table__.columns]
        
        print(f"MediaDescription columns: {columns}")
        
        # v1.9 field names should exist
        assert 'slug' in columns, "MediaDescription should have 'slug' field"
        assert 'tag_text_list' in columns, "MediaDescription should have 'tag_text_list' field"
        
        # v1.8 field names should not exist
        assert 'friendly_url' not in columns, "MediaDescription should not have old 'friendly_url' field"
        assert 'human_keywords_text_list' not in columns, "MediaDescription should not have old 'human_keywords_text_list' field"
        
        print("PASS MediaDescription model fields are correct for v1.9")
        return True
        
    except Exception as e:
        print(f"FAIL MediaDescription model test failed: {e}")
        return False


def test_video_file_model():
    """Test VideoFile model has the new v1.9 fields."""
    try:
        from app.models.video_file import VideoFile
        
        columns = [col.name for col in VideoFile.__table__.columns]
        
        print(f"VideoFile columns: {columns}")
        
        # v1.9 fields should exist
        assert 'environment_key' in columns, "VideoFile should have 'environment_key' field"
        assert 'protection_key' in columns, "VideoFile should have 'protection_key' field" 
        assert 'slug' in columns, "VideoFile should have 'slug' field"
        
        print("PASS VideoFile model fields are correct for v1.9")
        return True
        
    except Exception as e:
        print(f"FAIL VideoFile model test failed: {e}")
        return False


def test_content_list_model():
    """Test ContentList model has the new v1.9 fields."""
    try:
        from app.models.content_list import ContentList
        
        columns = [col.name for col in ContentList.__table__.columns]
        
        print(f"ContentList columns: {columns}")
        
        # v1.9 fields should exist
        assert 'media_type' in columns, "ContentList should have 'media_type' field"
        assert 'media_categories_id_list' in columns, "ContentList should have 'media_categories_id_list' field"
        assert 'themes_and_genres_id_list' in columns, "ContentList should have 'themes_and_genres_id_list' field"
        assert 'latest_first' in columns, "ContentList should have 'latest_first' field"
        assert 'slug' in columns, "ContentList should have 'slug' field"
        
        print("PASS ContentList model fields are correct for v1.9")
        return True
        
    except Exception as e:
        print(f"FAIL ContentList model test failed: {e}")
        return False


def test_screen_description_model():
    """Test ScreenDescription model (renamed from ScreenContent) has the new v1.9 fields."""
    try:
        from app.models.screen_description import ScreenDescription
        
        # Check table name is correct
        assert ScreenDescription.__tablename__ == "screen_descriptions", f"Table name should be 'screen_descriptions', got '{ScreenDescription.__tablename__}'"
        
        columns = [col.name for col in ScreenDescription.__table__.columns]
        
        print(f"ScreenDescription columns: {columns}")
        
        # v1.9 field should exist
        assert 'slug' in columns, "ScreenDescription should have 'slug' field"
        
        print("PASS ScreenDescription model fields are correct for v1.9")
        return True
        
    except Exception as e:
        print(f"FAIL ScreenDescription model test failed: {e}")
        return False


def test_schema_imports():
    """Test that all schemas can be imported with correct names."""
    try:
        from app.schemas.media_description import MediaDescriptionCreate, MediaDescriptionUpdate
        from app.schemas.video_file import VideoFileCreate, VideoFileUpdate
        from app.schemas.content_list import ContentListCreate, ContentListUpdate
        from app.schemas.screen_description import ScreenDescriptionCreate, ScreenDescriptionUpdate
        
        print("PASS All schema imports successful")
        return True
        
    except Exception as e:
        print(f"FAIL Schema import test failed: {e}")
        return False


def test_crud_imports():
    """Test that all CRUD operations can be imported with correct names."""
    try:
        from app.crud.media_description import media_description
        from app.crud.video_file import video_file
        from app.crud.content_list import content_list
        from app.crud.screen_description import screen_description
        
        print("PASS All CRUD imports successful")
        return True
        
    except Exception as e:
        print(f"FAIL CRUD import test failed: {e}")
        return False


if __name__ == "__main__":
    print("Testing API v1.8 to v1.9 migration changes...")
    print("=" * 50)
    
    tests = [
        test_media_description_model,
        test_video_file_model,
        test_content_list_model,
        test_screen_description_model,
        test_schema_imports,
        test_crud_imports
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        print(f"\nRunning {test.__name__}...")
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"ERROR: {test.__name__} crashed: {e}")
            failed += 1
    
    print("=" * 50)
    print(f"Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("All migration changes are working correctly!")
    else:
        print("Some tests failed - check the output above")