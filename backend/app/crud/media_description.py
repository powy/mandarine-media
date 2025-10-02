from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc
from uuid import UUID, uuid4

from app.crud.base import CRUDBase
from app.models.media_description import MediaDescription
from app.models.description_report import DescriptionReport
from app.models.video_file import VideoFile
from app.models.public_person import PublicPerson
from app.models.country import Country
from app.models.language import Language
from app.models.audience_category import AudienceCategory
from app.models.subscription_plan import SubscriptionPlan
from app.models.media_theme import MediaTheme
from app.models.picture import Picture
from app.models.media_description_person import MediaDescriptionPerson
from app.schemas.media_description import MediaDescriptionCreate, MediaDescriptionUpdate
from app.schemas.media_description_person import PersonRoleCreate
from app.crud.media_description_person import media_description_person


class CRUDMediaDescription(
    CRUDBase[MediaDescription, MediaDescriptionCreate, MediaDescriptionUpdate]
):
    def get_by_file_number(
        self, db: Session, *, file_number: int
    ) -> Optional[MediaDescription]:
        return (
            db.query(MediaDescription)
            .filter(MediaDescription.file_number == file_number)
            .first()
        )

    def get_by_video_file_id(
        self, db: Session, *, video_file_id: UUID
    ) -> List[MediaDescription]:
        """Get media descriptions that are linked to a specific video file"""
        return (
            db.query(MediaDescription)
            .filter(MediaDescription.main_video_file_id == video_file_id)
            .all()
        )

    def get_with_relationships(
        self, db: Session, *, id: str
    ) -> Optional[MediaDescription]:
        """Get media description with all relationships loaded"""
        return (
            db.query(MediaDescription)
            .options(
                joinedload(MediaDescription.people_roles),
                joinedload(MediaDescription.origin_countries),
                joinedload(MediaDescription.available_countries),
                joinedload(MediaDescription.original_languages),
                joinedload(MediaDescription.available_subtitle_languages),
                joinedload(MediaDescription.available_audio_languages),
                joinedload(MediaDescription.audience_categories),
                joinedload(MediaDescription.eligible_plans),
                joinedload(MediaDescription.trailers),
                joinedload(MediaDescription.excerpts),
                joinedload(MediaDescription.media_themes),
                joinedload(MediaDescription.additional_images),
            )
            .filter(MediaDescription.id == id)
            .first()
        )

    def build_filter_query(
        self,
        db: Session,
        *,
        media_type: Optional[str] = None,
        status: Optional[str] = None,
        is_featured: Optional[bool] = None,
        season_id: Optional[UUID] = None,
        country_ids: Optional[List[str]] = None,
        language_ids: Optional[List[str]] = None,
    ):
        query = db.query(self.model)

        if media_type:
            query = query.filter(MediaDescription.media_type == media_type)

        if status:
            query = query.filter(MediaDescription.content_status == status)

        if is_featured is not None:
            query = query.filter(MediaDescription.is_featured == is_featured)

        if season_id is not None:
            query = query.filter(MediaDescription.season_id == season_id)

        if country_ids:
            query = query.join(MediaDescription.origin_countries).filter(
                Country.id.in_(country_ids)
            )

        if language_ids:
            query = query.join(MediaDescription.original_languages).filter(
                Language.id.in_(language_ids)
            )

        return query

    def get_multi_with_filters(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        media_type: Optional[str] = None,
        status: Optional[str] = None,
        is_featured: Optional[bool] = None,
        country_ids: Optional[List[str]] = None,
        language_ids: Optional[List[str]] = None
    ) -> List[MediaDescription]:
        query = self.build_filter_query(
            db,
            media_type=media_type,
            status=status,
            is_featured=is_featured,
            country_ids=country_ids,
            language_ids=language_ids,
        )

        return query.offset(skip).limit(limit).all()

    def get_by_slug(self, db: Session, *, slug: str) -> Optional[MediaDescription]:
        """Get media description by slug"""
        return db.query(self.model).filter(self.model.slug == slug).first()

    def ensure_unique_slug(self, db: Session, *, base_slug: str) -> str:
        """Ensure slug is unique by appending numbers if necessary"""
        if not self.get_by_slug(db, slug=base_slug):
            return base_slug

        counter = 2
        while True:
            candidate = f"{base_slug}_{counter}"
            if not self.get_by_slug(db, slug=candidate):
                return candidate
            counter += 1

    def create(
        self, db: Session, *, obj_in: MediaDescriptionCreate
    ) -> MediaDescription:
        """Create media description with relationships"""
        # Extract relationship data without modifying the original object
        relationship_data = {}
        # FIXED: Use Pydantic v2 API instead of v1
        obj_data = obj_in.model_dump()

        for field in [
            "actor_ids",
            "director_ids",
            "producer_ids",
            "author_ids",
            "people_roles",  # Add the new unified people field
            "origin_country_ids",
            "available_country_ids",
            "original_language_ids",
            "available_subtitle_language_ids",
            "available_audio_language_ids",
            "audience_category_ids",
            "eligible_plan_ids",
            "trailer_ids",
            "excerpt_ids",
            "media_theme_ids",
            "additional_image_ids",
        ]:
            if field in obj_data:
                value = obj_data.pop(field)
                if value:  # Only store non-empty values for relationship processing
                    relationship_data[field] = value

        # Handle slug: auto-generate from title if not provided or empty
        if not obj_data.get("slug"):
            from app.utils.text_normalization import slugify
            obj_data["slug"] = slugify(obj_data.get("episode_title", ""))

        # Ensure slug uniqueness for all slugs (both provided and auto-generated)
        obj_data["slug"] = self.ensure_unique_slug(db=db, base_slug=obj_data["slug"])

        # Create the base object
        obj_data["id"] = str(uuid4())
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.flush()  # Flush to persist the object and get an ID, but don't commit yet

        # Set up relationships after the object is persisted
        if relationship_data:
            self._set_relationships(db, db_obj, relationship_data)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: MediaDescription, obj_in: MediaDescriptionUpdate
    ) -> MediaDescription:
        """Update media description with relationships"""
        # Extract relationship data
        relationship_data = {}
        # FIXED: Use Pydantic v2 API instead of v1
        obj_data = obj_in.model_dump(exclude_unset=True)

        for field in [
            "actor_ids",
            "director_ids",
            "producer_ids",
            "author_ids",
            "people_roles",  # Add the new unified people field
            "origin_country_ids",
            "available_country_ids",
            "original_language_ids",
            "available_subtitle_language_ids",
            "available_audio_language_ids",
            "audience_category_ids",
            "eligible_plan_ids",
            "trailer_ids",
            "excerpt_ids",
            "media_theme_ids",
            "additional_image_ids",
        ]:
            if field in obj_data:
                relationship_data[field] = obj_data.pop(field)

        # Handle slug updates: ensure uniqueness if being updated
        if "slug" in obj_data and obj_data["slug"]:
            # Check if the slug is different from current one
            if obj_data["slug"] != db_obj.slug:
                obj_data["slug"] = self.ensure_unique_slug(db=db, base_slug=obj_data["slug"])

        # Update base fields
        for field, value in obj_data.items():
            setattr(db_obj, field, value)

        # Update relationships if provided
        if relationship_data:
            self._set_relationships(db, db_obj, relationship_data)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def _set_relationships(
        self, db: Session, db_obj: MediaDescription, relationship_data: dict
    ):
        """Helper method to set up many-to-many relationships"""

        # Handle people relationships: convert individual role fields to unified people_roles
        # Check if we have individual role fields to convert or direct people_roles
        people_roles_to_create = []

        # Collect individual role fields and convert to people_roles format
        role_mappings = {
            "actor_ids": "actor",
            "director_ids": "director",
            "producer_ids": "producer",
            "author_ids": "author"
        }

        for field_name, role_name in role_mappings.items():
            if field_name in relationship_data and relationship_data[field_name]:
                # Validate that the person IDs exist
                person_ids = relationship_data[field_name]
                existing_persons = (
                    db.query(PublicPerson)
                    .filter(PublicPerson.id.in_(person_ids))
                    .all()
                )

                # Create people_roles entries with position based on order
                # Fix: Start from position 10 to avoid auto-position conflict (position 0 gets auto-assigned)
                for position, person in enumerate(existing_persons):
                    people_roles_to_create.append({
                        "public_person_id": str(person.id),
                        "role": role_name,
                        "position": (position + 1) * 10  # 10, 20, 30, 40... for ordering (avoid 0)
                    })

        # Handle direct people_roles input (takes precedence over individual role fields)
        if "people_roles" in relationship_data:
            # Validate that the person IDs exist in people_roles
            validated_roles = []
            person_ids = [role["public_person_id"] for role in relationship_data["people_roles"]]
            existing_persons = (
                db.query(PublicPerson)
                .filter(PublicPerson.id.in_(person_ids))
                .all()
            )
            existing_person_ids = {str(person.id) for person in existing_persons}

            # Only include roles for existing persons
            for role in relationship_data["people_roles"]:
                # Convert role person_id to string for comparison
                role_person_id = str(role["public_person_id"])
                if role_person_id in existing_person_ids:
                    validated_roles.append(role)
            people_roles_to_create = validated_roles

        # Create people relationships if we have any roles to process
        if people_roles_to_create:
            # Clear existing people relationships
            db.query(MediaDescriptionPerson).filter(
                MediaDescriptionPerson.media_description_id == db_obj.id
            ).delete()

            # Create new relationships using the bulk create method
            people_roles = [
                PersonRoleCreate(**role_data) for role_data in people_roles_to_create
            ]
            media_description_person.bulk_create_for_media(
                db=db,
                media_description_id=db_obj.id,
                people_roles=people_roles
            )

        # Origin Countries
        if "origin_country_ids" in relationship_data:
            countries = (
                db.query(Country)
                .filter(Country.id.in_(relationship_data["origin_country_ids"]))
                .all()
            )
            db_obj.origin_countries = countries

        # Available Countries
        if "available_country_ids" in relationship_data:
            countries = (
                db.query(Country)
                .filter(Country.id.in_(relationship_data["available_country_ids"]))
                .all()
            )
            db_obj.available_countries = countries

        # Original Languages
        if "original_language_ids" in relationship_data:
            languages = (
                db.query(Language)
                .filter(Language.id.in_(relationship_data["original_language_ids"]))
                .all()
            )
            db_obj.original_languages = languages

        # Available Subtitle Languages
        if "available_subtitle_language_ids" in relationship_data:
            languages = (
                db.query(Language)
                .filter(Language.id.in_(relationship_data["available_subtitle_language_ids"]))
                .all()
            )
            db_obj.available_subtitle_languages = languages

        # Available Audio Languages
        if "available_audio_language_ids" in relationship_data:
            languages = (
                db.query(Language)
                .filter(Language.id.in_(relationship_data["available_audio_language_ids"]))
                .all()
            )
            db_obj.available_audio_languages = languages

        # Audience Categories
        if "audience_category_ids" in relationship_data:
            categories = (
                db.query(AudienceCategory)
                .filter(
                    AudienceCategory.id.in_(relationship_data["audience_category_ids"])
                )
                .all()
            )
            db_obj.audience_categories = categories

        # Eligible Plans
        if "eligible_plan_ids" in relationship_data:
            plans = (
                db.query(SubscriptionPlan)
                .filter(
                    SubscriptionPlan.id.in_(relationship_data["eligible_plan_ids"])
                )
                .all()
            )
            db_obj.eligible_plans = plans

        # Trailers
        if "trailer_ids" in relationship_data:
            trailers = (
                db.query(VideoFile)
                .filter(VideoFile.id.in_(relationship_data["trailer_ids"]))
                .all()
            )
            db_obj.trailers = trailers

        # Excerpts
        if "excerpt_ids" in relationship_data:
            excerpts = (
                db.query(VideoFile)
                .filter(VideoFile.id.in_(relationship_data["excerpt_ids"]))
                .all()
            )
            db_obj.excerpts = excerpts

        # Media Themes
        if "media_theme_ids" in relationship_data:
            themes = (
                db.query(MediaTheme)
                .filter(MediaTheme.id.in_(relationship_data["media_theme_ids"]))
                .all()
            )
            db_obj.media_themes = themes

        # Additional Images
        if "additional_image_ids" in relationship_data:
            images = (
                db.query(Picture)
                .filter(Picture.id.in_(relationship_data["additional_image_ids"]))
                .all()
            )
            db_obj.additional_images = images

    def get_by_theme(self, db: Session, *, theme_id: str) -> List[MediaDescription]:
        """Get all media descriptions with a specific theme"""
        return (
            db.query(MediaDescription)
            .join(MediaDescription.media_themes)
            .filter(MediaTheme.id == theme_id)
            .all()
        )

    def get_by_person(
        self, db: Session, *, person_id: str, role: str = None
    ) -> List[MediaDescription]:
        """Get all media descriptions associated with a specific person"""
        if role == "actor":
            return (
                db.query(MediaDescription)
                .join(MediaDescription.actors)
                .filter(PublicPerson.id == person_id)
                .all()
            )
        elif role == "director":
            return (
                db.query(MediaDescription)
                .join(MediaDescription.directors)
                .filter(PublicPerson.id == person_id)
                .all()
            )
        elif role == "producer":
            return (
                db.query(MediaDescription)
                .join(MediaDescription.producers)
                .filter(PublicPerson.id == person_id)
                .all()
            )
        elif role == "author":
            return (
                db.query(MediaDescription)
                .join(MediaDescription.authors)
                .filter(PublicPerson.id == person_id)
                .all()
            )
        else:
            # Get all roles
            results = []
            results.extend(self.get_by_person(db, person_id=person_id, role="actor"))
            results.extend(self.get_by_person(db, person_id=person_id, role="director"))
            results.extend(self.get_by_person(db, person_id=person_id, role="producer"))
            results.extend(self.get_by_person(db, person_id=person_id, role="author"))
            return list(set(results))  # Remove duplicates

    def get_by_country(
        self, db: Session, *, country_id: str, origin: bool = True
    ) -> List[MediaDescription]:
        """Get all media descriptions from or available in a specific country"""
        if origin:
            return (
                db.query(MediaDescription)
                .join(MediaDescription.origin_countries)
                .filter(Country.id == country_id)
                .all()
            )
        else:
            return (
                db.query(MediaDescription)
                .join(MediaDescription.available_countries)
                .filter(Country.id == country_id)
                .all()
            )

    def count_total(self, db: Session) -> int:
        """Count total number of media descriptions"""
        return db.query(MediaDescription).count()

    def count_with_filters(
        self,
        db: Session,
        *,
        media_type: Optional[str] = None,
        status: Optional[str] = None,
        is_featured: Optional[bool] = None,
        country_ids: Optional[List[str]] = None,
        language_ids: Optional[List[str]] = None
    ) -> int:
        """Count media descriptions with filters"""
        query = self.build_filter_query(
            db,
            media_type=media_type,
            status=status,
            is_featured=is_featured,
            country_ids=country_ids,
            language_ids=language_ids,
        )

        return query.count()

    def get_filtered_media(
        self,
        db: Session,
        *,
        media_types: Optional[List[str]] = None,
        categories: Optional[List[str]] = None,
        theme_ids: Optional[List[str]] = None
    ) -> List[MediaDescription]:
        """
        Get media descriptions filtered by categories and/or themes with media type.
        Implements the business logic for content list filtering.
        Uses SQLite-compatible JSON operations.
        """
        query = db.query(MediaDescription)
        
        # Apply media type filter
        if media_types:
            query = query.filter(MediaDescription.media_type.in_(media_types))
        
        # For SQLite compatibility, we need to use a different approach
        # Get all potential matches and filter in Python
        all_media = query.all()
        
        # Filter based on business rules
        filtered_media = []
        for media in all_media:
            media_categories = media.media_categories_list or []
            media_themes = media.media_themes_id_list or []
            
            if categories and theme_ids:
                # Both fields: match AT LEAST ONE category AND AT LEAST ONE theme
                has_category = any(cat in media_categories for cat in categories)
                has_theme = any(theme in media_themes for theme in theme_ids)
                
                # Handle case where media has no themes assigned:
                # If media matches categories but has no themes, include it
                # This allows content lists to work even when media theme assignment is incomplete
                if has_category and (has_theme or not media_themes):
                    filtered_media.append(media)
            elif categories:
                # Only categories: match any of the specified categories
                has_category = any(cat in media_categories for cat in categories)
                if has_category:
                    filtered_media.append(media)
            elif theme_ids:
                # Only themes: match any of the specified themes
                has_theme = any(theme in media_themes for theme in theme_ids)
                if has_theme:
                    filtered_media.append(media)
            elif not categories and not theme_ids:
                # No category/theme filters, include all (filtered by media_type already)
                filtered_media.append(media)
        
        return filtered_media

    def get_season_videos(self, db: Session) -> Dict[str, List[MediaDescription]]:
        """
        Get all videos grouped by their season_id.
        Returns a dictionary where keys are season IDs and values are lists of videos.
        """
        videos_with_seasons = (
            db.query(MediaDescription)
            .filter(MediaDescription.season_id.isnot(None))
            .filter(MediaDescription.media_type == "video")
            .all()
        )

        season_videos = {}
        for video in videos_with_seasons:
            season_id = str(video.season_id)
            if season_id not in season_videos:
                season_videos[season_id] = []
            season_videos[season_id].append(video)

        return season_videos

    def remove(self, db: Session, *, id: UUID) -> MediaDescription:
        """
        Remove media description with eager loading to avoid DetachedInstanceError.

        This method overrides the base remove method to ensure all relationships
        are loaded before deletion to prevent lazy loading issues when serializing
        the response.
        """
        # First, get the object with all relationships eagerly loaded
        obj = (
            db.query(self.model)
            .options(
                # Load people relationships with their public_person data
                joinedload(MediaDescription.people_roles).joinedload(MediaDescriptionPerson.public_person),
                # Load all other relationships that might be accessed in the schema
                joinedload(MediaDescription.origin_countries),
                joinedload(MediaDescription.available_countries),
                joinedload(MediaDescription.original_languages),
                joinedload(MediaDescription.available_subtitle_languages),
                joinedload(MediaDescription.available_audio_languages),
                joinedload(MediaDescription.audience_categories),
                joinedload(MediaDescription.eligible_plans),
                joinedload(MediaDescription.trailers),
                joinedload(MediaDescription.excerpts),
                joinedload(MediaDescription.media_themes),
                joinedload(MediaDescription.additional_images),
                # Load main relationships
                joinedload(MediaDescription.main_video_file),
                joinedload(MediaDescription.program),
                joinedload(MediaDescription.season),
            )
            .filter(self.model.id == id)
            .first()
        )

        if obj:
            # Delete the object
            db.delete(obj)
            db.commit()

        return obj


media_description = CRUDMediaDescription(MediaDescription)
