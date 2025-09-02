from typing import List, Optional, Tuple
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
from app.schemas.media_description import MediaDescriptionCreate, MediaDescriptionUpdate


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
                joinedload(MediaDescription.actors),
                joinedload(MediaDescription.directors),
                joinedload(MediaDescription.producers),
                joinedload(MediaDescription.authors),
                joinedload(MediaDescription.origin_countries),
                joinedload(MediaDescription.available_countries),
                joinedload(MediaDescription.original_languages),
                joinedload(MediaDescription.audience_categories),
                joinedload(MediaDescription.eligible_plan_id_list),
                joinedload(MediaDescription.trailers),
                joinedload(MediaDescription.excerpts),
            )
            .filter(MediaDescription.id == id)
            .first()
        )

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
        query = db.query(self.model)

        if media_type:
            query = query.filter(MediaDescription.media_type == media_type)

        if status:
            query = query.filter(MediaDescription.content_status == status)

        if is_featured is not None:
            query = query.filter(MediaDescription.is_featured == is_featured)

        # Filter by themes

        # Filter by origin countries
        if country_ids:
            query = query.join(MediaDescription.origin_countries).filter(
                Country.id.in_(country_ids)
            )

        # Filter by original languages
        if language_ids:
            query = query.join(MediaDescription.original_languages).filter(
                Language.id.in_(language_ids)
            )

        return query.offset(skip).limit(limit).all()

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
            "origin_country_ids",
            "available_country_ids",
            "original_language_ids",
            "audience_category_ids",
            "eligible_plan_id_list",
            "trailer_ids",
            "excerpt_ids",
        ]:
            if field in obj_data:
                value = obj_data.pop(field)
                if value:  # Only store non-empty values for relationship processing
                    relationship_data[field] = value

        # Create the base object
        obj_data["id"] = str(uuid4())
        db_obj = self.model(**obj_data)

        # Set up relationships
        if relationship_data:
            self._set_relationships(db, db_obj, relationship_data)

        db.add(db_obj)
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
            "origin_country_ids",
            "available_country_ids",
            "original_language_ids",
            "audience_category_ids",
            "eligible_plan_id_list",
            "trailer_ids",
            "excerpt_ids",
        ]:
            if field in obj_data:
                relationship_data[field] = obj_data.pop(field)

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

        # Actors
        if "actor_ids" in relationship_data:
            actors = (
                db.query(PublicPerson)
                .filter(PublicPerson.id.in_(relationship_data["actor_ids"]))
                .all()
            )
            db_obj.actors = actors

        # Directors
        if "director_ids" in relationship_data:
            directors = (
                db.query(PublicPerson)
                .filter(PublicPerson.id.in_(relationship_data["director_ids"]))
                .all()
            )
            db_obj.directors = directors

        # Producers
        if "producer_ids" in relationship_data:
            producers = (
                db.query(PublicPerson)
                .filter(PublicPerson.id.in_(relationship_data["producer_ids"]))
                .all()
            )
            db_obj.producers = producers

        # Authors
        if "author_ids" in relationship_data:
            authors = (
                db.query(PublicPerson)
                .filter(PublicPerson.id.in_(relationship_data["author_ids"]))
                .all()
            )
            db_obj.authors = authors

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
        if "eligible_plan_id_list" in relationship_data:
            plans = (
                db.query(SubscriptionPlan)
                .filter(
                    SubscriptionPlan.id.in_(relationship_data["eligible_plan_id_list"])
                )
                .all()
            )
            db_obj.eligible_plan_id_list = plans

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

    def get_by_theme(self, db: Session, *, theme_id: str) -> List[MediaDescription]:
        """Get all media descriptions with a specific theme"""
        return (
            db.query(MediaDescription)
            .join(MediaDescription.themes)
            .filter(Theme.id == theme_id)
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
        query = db.query(self.model)

        if media_type:
            query = query.filter(MediaDescription.media_type == media_type)

        if status:
            query = query.filter(MediaDescription.content_status == status)

        if is_featured is not None:
            query = query.filter(MediaDescription.is_featured == is_featured)

        # Filter by themes

        # Filter by origin countries
        if country_ids:
            query = query.join(MediaDescription.origin_countries).filter(
                Country.id.in_(country_ids)
            )

        # Filter by original languages
        if language_ids:
            query = query.join(MediaDescription.original_languages).filter(
                Language.id.in_(language_ids)
            )

        return query.count()


media_description = CRUDMediaDescription(MediaDescription)
