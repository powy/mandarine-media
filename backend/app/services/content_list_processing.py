from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from uuid import UUID
import logging

from app.models.media_description import MediaDescription, MediaCategoryEnum
from app.models.season import Season
from app.models.content_list import ContentList, ContentTypeEnum
from app.crud.media_description import media_description as crud_media_description
from app.crud.season import season as crud_season
from app.crud.content_list import content_list as crud_content_list
from app.crud.screen_description import screen_description as crud_screen_description

logger = logging.getLogger(__name__)


class ContentListProcessingService:
    """Service for processing and updating content lists based on filtering criteria"""
    
    DEFAULT_MEDIA_TYPES = ["video", "webtoon"]
    
    def __init__(self, db: Session):
        self.db = db
    
    def update_all_dynamic_lists(self, force_update: bool = False) -> Dict[str, Any]:
        """
        Update all content lists that have filtering criteria defined.
        Also updates screen descriptions that contain the updated lists.
        Returns summary of processing operations.
        """
        results = {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [],
            "screens_updated": 0,
            "screen_errors": []
        }
        
        updated_content_list_ids = []
        
        try:
            # Get all content lists (both manual and auto-generated)
            all_lists = crud_content_list.get_multi(self.db, skip=0, limit=10000)
            for content_list in all_lists:
                try:
                    # Only process lists that have filtering criteria
                    if self._has_filtering_criteria(content_list):
                        results["processed"] += 1
                        
                        # Process the content list
                        updated = self._process_content_list(content_list, force_update)
                        
                        if updated:
                            results["updated"] += 1
                            updated_content_list_ids.append(str(content_list.id))
                        else:
                            results["skipped"] += 1
                            
                except Exception as e:
                    error_msg = f"Error processing content list '{content_list.title}': {str(e)}"
                    results["errors"].append(error_msg)
                    logger.error(error_msg)
            
            # Update screen descriptions that contain updated content lists
            if updated_content_list_ids:
                screen_results = self._update_affected_screen_descriptions(updated_content_list_ids)
                results["screens_updated"] = screen_results["updated"]
                results["screen_errors"].extend(screen_results["errors"])
            
            return results
            
        except Exception as e:
            error_msg = f"Failed to retrieve content lists: {str(e)}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
            return results
    
    def _has_filtering_criteria(self, content_list: ContentList) -> bool:
        """Check if content list has any filtering criteria defined"""
        return bool(
            content_list.media_categories_list or 
            content_list.media_themes_id_list or
            content_list.media_type
        )
    
    def _process_content_list(self, content_list: ContentList, force_update: bool = False) -> bool:
        """
        Process a single content list by applying filters, sorting, and season consolidation.
        Returns True if the list was updated, False if no changes were needed.
        """
        try:
            # Step 1: Filter media based on criteria
            filtered_media = self._filter_media_by_criteria(content_list)
            
            # Step 2: Sort the media  
            latest_first = content_list.latest_first if content_list.latest_first is not None else True
            sorted_media = self._sort_media_items(filtered_media, latest_first)
            
            # Step 3: Apply season consolidation
            consolidated_items, consolidated_types = self._consolidate_seasons(sorted_media)
            
            # Step 4: Check if update is needed
            current_items = content_list.content_items or []
            current_types = [ct for ct in (content_list.content_types or [])]
            
            # Ensure both lists are of the same type for comparison
            # Convert all items to strings to avoid type mismatches
            current_items_str = [str(item) for item in current_items]
            current_types_str = [str(ct) for ct in current_types]
            consolidated_items_str = [str(item) for item in consolidated_items]
            consolidated_types_str = [str(ct) for ct in consolidated_types]
            
            items_changed = (
                current_items_str != consolidated_items_str or
                current_types_str != consolidated_types_str
            )
            
            if items_changed or force_update:
                # Step 5: Update the content list
                self._update_content_list_items(content_list, consolidated_items, consolidated_types)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error processing content list '{content_list.title}': {str(e)}")
            raise Exception(f"Error processing content list: {str(e)}")
    
    def _filter_media_by_criteria(self, content_list: ContentList) -> List[MediaDescription]:
        """Filter media descriptions based on content list criteria"""
        # Use the enhanced CRUD method
        media_types = self._get_media_types_filter(content_list.media_type)
        
        return crud_media_description.get_filtered_media(
            self.db,
            media_types=media_types,
            categories=content_list.media_categories_list,
            theme_ids=content_list.media_themes_id_list
        )
    
    def _get_media_types_filter(self, media_type: Optional[str]) -> List[str]:
        """Get the media types to filter by"""
        if media_type:
            return [media_type]
        else:
            # Default: only video and webtoon types
            return self.DEFAULT_MEDIA_TYPES
    
    def _is_valid_category(self, category: str) -> bool:
        """Check if category string is a valid MediaCategoryEnum value"""
        try:
            return category in [cat.value for cat in MediaCategoryEnum]
        except:
            return False
    
    def _sort_media_items(self, media_items: List[MediaDescription], latest_first: bool) -> List[MediaDescription]:
        """Sort media items by creation date"""
        if latest_first:
            return sorted(media_items, key=lambda x: x.creation_date_utc, reverse=True)
        else:
            return sorted(media_items, key=lambda x: x.creation_date_utc, reverse=False)
    
    def _consolidate_seasons(self, media_items: List[MediaDescription]) -> tuple[List[str], List[str]]:
        """
        Apply season consolidation: replace first video from each season with the season entity,
        remove all other videos from the same season.
        Returns (content_items, content_types) as lists of strings.
        """
        content_items = []
        content_types = []
        processed_seasons: Set[str] = set()
        
        for media in media_items:
            # Check if this media belongs to a season
            if media.season_id:
                season_id_str = str(media.season_id)
                
                if season_id_str not in processed_seasons:
                    # First video from this season: replace with season entity
                    season = crud_season.get(self.db, id=media.season_id)
                    if season:
                        content_items.append(season_id_str)
                        content_types.append(ContentTypeEnum.season.value)
                        processed_seasons.add(season_id_str)
                # Skip other videos from the same season
            else:
                # Regular media description (not part of a season)
                content_items.append(str(media.id))
                content_types.append(ContentTypeEnum.media_description.value)
        
        return content_items, content_types
    
    def _update_content_list_items(self, content_list: ContentList, content_items: List[str], content_types: List[str]):
        """Update content list with new items and types"""
        content_list.content_items = content_items
        content_list.content_types = content_types
        
        # Mark fields as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(content_list, 'content_items')
        flag_modified(content_list, 'content_types')
        
        self.db.add(content_list)
        self.db.commit()
        self.db.refresh(content_list)
        
        # Update JSON cache
        crud_content_list.update_json_cache(self.db, content_list=content_list)
    
    def _update_affected_screen_descriptions(self, updated_content_list_ids: List[str]) -> Dict[str, Any]:
        """
        Update screen descriptions that contain any of the updated content lists.
        Returns summary of screen update operations.
        """
        screen_results = {
            "updated": 0,
            "errors": []
        }
        
        affected_screens = set()
        
        # Find all screen descriptions that contain any of the updated content lists
        for content_list_id in updated_content_list_ids:
            try:
                screens = crud_screen_description.get_screens_containing_content_list(
                    self.db, content_list_id=content_list_id
                )
                affected_screens.update(screens)
            except Exception as e:
                error_msg = f"Error finding screens for content list {content_list_id}: {str(e)}"
                screen_results["errors"].append(error_msg)
                logger.error(error_msg)
        
        # Update JSON cache for each affected screen
        for screen in affected_screens:
            try:
                crud_screen_description.update_json_cache(self.db, screen_content=screen)
                screen_results["updated"] += 1
                logger.info(f"Updated screen description JSON cache: {screen.title}")
            except Exception as e:
                error_msg = f"Error updating screen '{screen.title}': {str(e)}"
                screen_results["errors"].append(error_msg)
                logger.error(error_msg)
        
        return screen_results