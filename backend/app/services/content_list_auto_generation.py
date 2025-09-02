from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.media_description import MediaCategoryEnum
from app.models.media_theme import MediaTheme
from app.crud.media_theme import media_theme as crud_media_theme
from app.crud.content_list import content_list as crud_content_list
from app.schemas.content_list import ContentListCreate
from app.models.content_list import ThumbnailFormatEnum


class ContentListAutoGenerationService:
    """Service for auto-generating content lists based on media combinations"""
    
    MEDIA_TYPES = ["video", "webtoon"]
    DEFAULT_THUMBNAIL_FORMAT = ThumbnailFormatEnum.format_1080x1080.value
    DEFAULT_LIST_TYPE = "classic"
    DEFAULT_PERCENTAGE_WIDTH = 100
    DEFAULT_PERCENTAGE_HEIGHT = 100
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_all_auto_lists(self) -> Dict[str, Any]:
        """
        Generate auto-lists for all combinations of categories, themes, and media types.
        Returns summary of creation/update operations.
        """
        results = {
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "errors": []
        }
        
        try:
            # Get all available categories and themes
            categories = [category.value for category in MediaCategoryEnum]
            themes = crud_media_theme.get_multi(self.db, skip=0, limit=1000)  # Get all themes
            
            # Generate for each combination
            for media_type in self.MEDIA_TYPES:
                for category in categories:
                    for theme in themes:
                        try:
                            list_name = self._generate_list_name(media_type, category, theme.name)
                            result = self._create_or_update_auto_list(
                                list_name=list_name,
                                media_type=media_type,
                                category=category,
                                theme_id=str(theme.id)
                            )
                            
                            if result == "created":
                                results["created"] += 1
                            elif result == "updated":
                                results["updated"] += 1
                            else:
                                results["skipped"] += 1
                                
                        except Exception as e:
                            error_msg = f"Error processing {media_type}/{category}/{theme.name}: {str(e)}"
                            results["errors"].append(error_msg)
                            
            return results
            
        except Exception as e:
            results["errors"].append(f"Failed to get categories/themes: {str(e)}")
            return results
    
    def _generate_list_name(self, media_type: str, category: str, theme_name: str) -> str:
        """Generate standardized name for auto-lists"""
        # Clean theme name for use in list name (replace spaces and hyphens with underscores, lowercase)
        clean_theme = theme_name.lower().replace(" ", "_").replace("-", "_")
        # Clean category as well
        clean_category = category.replace("-", "_")
        return f"auto_all_{media_type}_{clean_category}_{clean_theme}"
    
    def _create_or_update_auto_list(
        self, 
        list_name: str, 
        media_type: str, 
        category: str, 
        theme_id: str
    ) -> str:
        """
        Create or update an auto-list with the given parameters.
        Returns: 'created', 'updated', or 'skipped'
        """
        # Check if list already exists
        existing_list = crud_content_list.get_by_title(self.db, title=list_name)
        
        if existing_list:
            # Update metadata fields only (preserve existing content_items)
            needs_update = (
                existing_list.media_type != media_type or
                existing_list.media_categories_list != [category] or
                existing_list.media_themes_id_list != [theme_id]
            )
            
            if needs_update:
                # Update only the metadata fields
                from app.schemas.content_list import ContentListUpdate
                update_data = ContentListUpdate(
                    media_type=media_type,
                    media_categories_list=[category],
                    media_themes_id_list=[theme_id]
                )
                crud_content_list.update(self.db, db_obj=existing_list, obj_in=update_data)
                return "updated"
            else:
                return "skipped"
        else:
            # Create new auto-list
            create_data = ContentListCreate(
                title=list_name,
                description=f"Auto-generated list for {media_type} content in {category} category with theme",
                thumbnail_format=self.DEFAULT_THUMBNAIL_FORMAT,
                is_active=True,
                display_order=999,  # Place auto-lists at end
                list_type=self.DEFAULT_LIST_TYPE,
                percentage_width=self.DEFAULT_PERCENTAGE_WIDTH,
                percentage_height=self.DEFAULT_PERCENTAGE_HEIGHT,
                content_items=[],  # Empty initially
                content_types=[],  # Empty initially
                media_type=media_type,
                media_categories_list=[category],
                media_themes_id_list=[theme_id],
                latest_first=True
            )
            
            crud_content_list.create(self.db, obj_in=create_data)
            return "created"