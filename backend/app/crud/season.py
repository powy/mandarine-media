from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.season import Season
from app.schemas.season import SeasonCreate, SeasonUpdate
import logging

logger = logging.getLogger(__name__)


class CRUDSeason(CRUDBase[Season, SeasonCreate, SeasonUpdate]):
    def get_by_program(self, db: Session, *, program_id: UUID) -> List[Season]:
        return db.query(Season).filter(Season.program_id == program_id).order_by(Season.season_number).all()

    def get_by_program_and_number(self, db: Session, *, program_id: UUID, season_number: int) -> Optional[Season]:
        return db.query(Season).filter(Season.program_id == program_id, Season.season_number == season_number).first()

    def get(self, db: Session, id: UUID) -> Optional[Season]:
        """
        Get Season with eager-loaded relationships for JSON generation.

        Override parent method to add necessary joins.
        Uses media_descriptions (FK-based) relationship to load episodes.
        """
        from app.models.media_description import MediaDescription

        return (
            db.query(Season)
            # Load general_media_description with its images
            .options(
                joinedload(Season.general_media_description)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(Season.general_media_description)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(Season.general_media_description)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(Season.general_media_description)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(Season.general_media_description)
                .joinedload(MediaDescription.image_1080_1920)
            )
            # Load episodes (media_descriptions FK relationship) with their images
            .options(
                joinedload(Season.media_descriptions)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(Season.media_descriptions)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(Season.media_descriptions)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(Season.media_descriptions)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(Season.media_descriptions)
                .joinedload(MediaDescription.image_1080_1920)
            )
            .filter(Season.id == id)
            .first()
        )

    def refresh_json_cache(self, db: Session, *, season_id: UUID) -> Season:
        """
        Refresh the JSON cache for a season.

        Args:
            db: Database session
            season_id: UUID of the season

        Returns:
            Updated Season instance

        Raises:
            ValueError: If season not found
        """
        season = self.get(db, id=season_id)
        if not season:
            raise ValueError(f"Season {season_id} not found")

        season.update_json(db)
        return season

    def get_json_cache(self, db: Session, *, season_id: UUID, refresh: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get the cached JSON for a season.

        Args:
            db: Database session
            season_id: UUID of the season
            refresh: If True, regenerate JSON before returning

        Returns:
            Dictionary with season JSON data or None if not found
        """
        season = self.get(db, id=season_id)
        if not season:
            return None

        if refresh or not season.json_content:
            season.update_json(db)

        if season.json_content:
            import json
            return json.loads(season.json_content)

        return None

    def refresh_all_json_caches(self, db: Session) -> Dict[str, Any]:
        """
        Refresh JSON cache for all seasons.

        Returns:
            Dictionary with refresh statistics:
            - refreshed_count: Number of seasons successfully refreshed
            - failed_count: Number of seasons that failed to refresh
            - total_count: Total number of seasons processed
            - errors: List of error messages
        """
        from app.models.media_description import MediaDescription

        # Get all seasons with eager-loaded relationships for efficiency
        seasons = (
            db.query(Season)
            .options(joinedload(Season.general_media_description))
            .options(joinedload(Season.episodes))
            .all()
        )

        refreshed_count = 0
        failed_count = 0
        errors = []

        for season in seasons:
            try:
                season.update_json(db)
                refreshed_count += 1
            except Exception as e:
                failed_count += 1
                error_msg = f"Season {season.season_number} (ID: {season.id}): {str(e)}"
                errors.append(error_msg)
                logger.error(f"Failed to refresh season JSON: {error_msg}")

        # Commit all changes at once
        db.commit()

        return {
            "refreshed_count": refreshed_count,
            "failed_count": failed_count,
            "total_count": len(seasons),
            "errors": errors
        }


season = CRUDSeason(Season)