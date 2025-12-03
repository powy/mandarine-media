from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base
from app.models.common import GUID, JSONArray
from app.models.associations import (
    media_description_origin_countries, media_description_available_countries,
    media_description_original_languages, media_description_available_subtitle_languages,
    media_description_available_audio_languages, media_description_audience_categories,
    media_description_eligible_plans, media_description_trailers, media_description_excerpts,
    media_description_media_themes, media_description_additional_images, season_episodes,
    media_showcase_media_descriptions
)
import enum


class MediaTypeEnum(enum.Enum):
    excerpt = "excerpt"
    trailer = "trailer"
    video = "video"
    webtoon = "webtoon"
    season = "season"
    program = "program"


class ContentStatusEnum(enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"
    scheduled = "scheduled"


class MediaCategoryEnum(enum.Enum):
    movie = "movie"
    drama = "drama"
    short_drama = "short-drama"
    short_film = "short-film"
    musical = "musical"
    animation = "animation"
    documentary = "documentary"
    tvshow = "tvshow"
    web_drama = "web-drama"
    other = "other"


class MediaDescription(Base):
    __tablename__ = "media_description"

    # Required Fields
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    file_number = Column(Integer, unique=True, nullable=False, index=True)
    episode_title = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # Will use enum validation in schemas
    
    # Optional Fields
    expected_filename = Column(String, nullable=True)
    main_video_file_id = Column(GUID(), ForeignKey("video_file.id"), nullable=True)
    program_id = Column(GUID(), ForeignKey("programs.id"), nullable=True)
    season_id = Column(GUID(), ForeignKey("seasons.id"), nullable=True)
    episode_number = Column(Integer, nullable=True)
    media_categories_list = Column(JSONArray(), nullable=True)  # ARRAY of enum 'category'
    descriptive_summary_text = Column(Text, nullable=True)
    synopsis_text = Column(Text, nullable=True)
    contract_start_date_utc = Column(DateTime(timezone=True), nullable=True)
    contract_end_date_utc = Column(DateTime(timezone=True), nullable=True)
    production_year = Column(Integer, nullable=True)
    original_broadcast_date_utc = Column(DateTime(timezone=True), nullable=True)
    is_featured = Column(Boolean, default=False, nullable=True)
    last_updated_utc = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    content_status = Column(String, default="published", nullable=True)  # Will use enum validation in schemas

    # NEW v1.10-D field - Diagnostics
    diagnostics = Column(String, nullable=False, default="pending")  # Verification diagnostics status

    seo_title = Column(String, nullable=True)
    seo_description = Column(Text, nullable=True)
    seo_keywords_text_list = Column(JSONArray(), nullable=True)
    hashtags_text_list = Column(JSONArray(), nullable=True)
    tags = Column(JSONArray(), nullable=True)  # General purpose tags (distinct from hashtags)
    external_identifier_text = Column(String, nullable=True)  # Renamed from external_id
    rights_holder = Column(String, nullable=True)
    
    friendly_url = Column(String, nullable=True)
    
    
    # NEW v1.4 fields - Business fields (renamed and cleaned up)
    copyright_owner_text = Column(String, nullable=True)  # Renamed from copyright_owner_id
    
    # NEW v1.4 fields - Metadata fields (v1.9 renamed)
    slug = Column(String, nullable=True, unique=True)  # Renamed from friendly_url in v1.9
    human_keywords_text_list = Column(JSONArray(), nullable=True)
    
    # NEW v1.4 fields - Image fields
    image_1920_1080_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_1920_720_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_1080_1080_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_810_1080_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    image_1080_1920_id = Column(GUID(), ForeignKey("pictures.id"), nullable=True)
    
    
    # NEW v1.4 fields - Revenue fields (Admin only)
    translation_share = Column(Float, nullable=True)
    sacem_share = Column(Float, nullable=True)
    other_share = Column(Float, nullable=True)
    revenue_share = Column(Float, nullable=True)
    paid_token_cost = Column(Integer, nullable=True)
    
    
    
    # Relationships
    main_video_file = relationship("VideoFile", backref="media_descriptions")
    program = relationship("Program", foreign_keys=[program_id], back_populates="media_descriptions")
    season = relationship("Season", foreign_keys=[season_id], back_populates="media_descriptions")
    video_file_reports = relationship("VideoFileReport", back_populates="media_description")

    # Image relationships for thumbnail formats
    image_1920_1080 = relationship("Picture", foreign_keys=[image_1920_1080_id])
    image_1920_720 = relationship("Picture", foreign_keys=[image_1920_720_id])
    image_1080_1080 = relationship("Picture", foreign_keys=[image_1080_1080_id])
    image_810_1080 = relationship("Picture", foreign_keys=[image_810_1080_id])
    image_1080_1920 = relationship("Picture", foreign_keys=[image_1080_1920_id])
    
    # New unified people relationship
    people_roles = relationship("MediaDescriptionPerson", back_populates="media_description", cascade="all, delete-orphan")
    
    origin_countries = relationship("Country", secondary=media_description_origin_countries, back_populates="origin_media")
    available_countries = relationship("Country", secondary=media_description_available_countries, back_populates="available_media")
    
    original_languages = relationship("Language", secondary=media_description_original_languages, back_populates="original_language_media")
    available_subtitle_languages = relationship("Language", secondary=media_description_available_subtitle_languages, back_populates="subtitle_language_media")
    available_audio_languages = relationship("Language", secondary=media_description_available_audio_languages, back_populates="audio_language_media")

    audience_categories = relationship("AudienceCategory", secondary=media_description_audience_categories, back_populates="media")
    
    
    eligible_plans = relationship("SubscriptionPlan", secondary=media_description_eligible_plans, back_populates="eligible_media")
    
    trailers = relationship("VideoFile", secondary=media_description_trailers, back_populates="trailer_for")
    excerpts = relationship("VideoFile", secondary=media_description_excerpts, back_populates="excerpt_for")
    
    media_themes = relationship("MediaTheme", secondary=media_description_media_themes, back_populates="media_descriptions")
    additional_images = relationship("Picture", secondary=media_description_additional_images, back_populates="additional_for_media")
    seasons_episodes = relationship("Season", secondary=season_episodes, back_populates="episodes")
    
    # MediaShowcase relationships
    media_showcases = relationship("MediaShowcase", secondary=media_showcase_media_descriptions, back_populates="media_descriptions")

    # Helper properties for accessing people by role with ordering (backward compatibility)
    @property
    def actors_ordered(self):
        """Get actors ordered by position"""
        return sorted([pr.public_person for pr in self.people_roles if pr.role == 'actor'],
                     key=lambda x: next(pr.position for pr in self.people_roles
                                      if pr.public_person == x and pr.role == 'actor'))

    @property
    def directors_ordered(self):
        """Get directors ordered by position"""
        return sorted([pr.public_person for pr in self.people_roles if pr.role == 'director'],
                     key=lambda x: next(pr.position for pr in self.people_roles
                                      if pr.public_person == x and pr.role == 'director'))

    @property
    def producers_ordered(self):
        """Get producers ordered by position"""
        return sorted([pr.public_person for pr in self.people_roles if pr.role == 'producer'],
                     key=lambda x: next(pr.position for pr in self.people_roles
                                      if pr.public_person == x and pr.role == 'producer'))

    @property
    def authors_ordered(self):
        """Get authors ordered by position"""
        return sorted([pr.public_person for pr in self.people_roles if pr.role == 'author'],
                     key=lambda x: next(pr.position for pr in self.people_roles
                                      if pr.public_person == x and pr.role == 'author'))

    # Backward compatibility properties (unordered)
    @property
    def actors(self):
        """Get actors (for backward compatibility)"""
        return [pr.public_person for pr in self.people_roles if pr.role == 'actor']

    @property
    def directors(self):
        """Get directors (for backward compatibility)"""
        return [pr.public_person for pr in self.people_roles if pr.role == 'director']

    @property
    def producers(self):
        """Get producers (for backward compatibility)"""
        return [pr.public_person for pr in self.people_roles if pr.role == 'producer']

    @property
    def authors(self):
        """Get authors (for backward compatibility)"""
        return [pr.public_person for pr in self.people_roles if pr.role == 'author']

    async def diagnostic(self, db):
        """
        Perform diagnostic verification of media description.

        Validates:
        - All linked VideoFile diagnostics are ready
        - Essential fields are populated (episode_title, synopsis, descriptive_summary, original_broadcast_date)
        - Type-specific validations (season, program, video)
        - Image fields are set (4 required image formats)

        Args:
            db: SQLAlchemy database session

        Returns:
            str: "ready" or comma-separated error messages

        Side Effects:
            Updates self.diagnostics and commits to database
        """
        import logging
        logger = logging.getLogger(__name__)
        errors = []

        # === Check A: VideoFile Diagnostics ===
        # Get all linked video files
        video_files_to_check = []

        # Main video file
        if self.main_video_file:
            video_files_to_check.append(('Main Video', self.main_video_file))

        # Trailers
        for idx, trailer in enumerate(self.trailers, start=1):
            video_files_to_check.append((f'Trailer {idx}', trailer))

        # Excerpts
        for idx, excerpt in enumerate(self.excerpts, start=1):
            video_files_to_check.append((f'Excerpt {idx}', excerpt))

        # Check each video file's diagnostics
        for label, video_file in video_files_to_check:
            if video_file.diagnostics != "ready":
                # If not ready, trigger its diagnostic if needed
                if video_file.diagnostics == "pending":
                    try:
                        from app.core.config import settings
                        from app.services.storage.mux import MuxStorageBackend

                        upload_config = settings.get_upload_config()
                        if 'mux' in upload_config.get('backends', {}):
                            mux_service = MuxStorageBackend(upload_config['backends']['mux'])
                            await video_file.diagnostic(db=db, mux_service=mux_service)
                    except Exception as e:
                        logger.warning(f"Could not run diagnostic on {label} (ID: {video_file.id}): {e}")

                # Add error if still not ready
                if video_file.diagnostics != "ready":
                    errors.append(f"{label} - Video File {video_file.id} - Diagnostics: {video_file.diagnostics}")

        # === Check B: Essential Fields ===
        # episode_title is required field, always set
        if not self.episode_title or not self.episode_title.strip():
            errors.append("Episode title is empty")

        if not self.synopsis_text or not self.synopsis_text.strip():
            errors.append("Synopsis text is missing")

        if not self.descriptive_summary_text or not self.descriptive_summary_text.strip():
            errors.append("Descriptive summary text is missing")

        if not self.original_broadcast_date_utc:
            errors.append("Original broadcast date is missing")

        # === Check C: Type-Specific Validations ===

        if self.media_type == "season":
            # Season should NOT have season_id set (not part of another season)
            if self.season_id:
                errors.append("Season type should not have season_id set")

            # Season should be referenced by Season.general_media_description_id
            from app.models.season import Season
            season_ref = db.query(Season).filter(Season.general_media_description_id == self.id).first()
            if not season_ref:
                errors.append("Season type is not referenced by any Season entity")
            else:
                # Check if episode_title matches Season.season_name
                if season_ref.season_name and self.episode_title != season_ref.season_name:
                    errors.append(f"Episode title '{self.episode_title}' does not match Season name '{season_ref.season_name}'")

            # Season should not have main_video_file_id set
            if self.main_video_file_id:
                errors.append("Season type should not have main_video_file_id set")

        elif self.media_type == "program":
            # Program should NOT have program_id set (not part of another program)
            if self.program_id:
                errors.append("Program type should not have program_id set")

            # Program should be referenced by Program.general_media_description_id
            from app.models.program import Program
            program_ref = db.query(Program).filter(Program.general_media_description_id == self.id).first()
            if not program_ref:
                errors.append("Program type is not referenced by any Program entity")
            else:
                # Check if episode_title matches Program.program_name
                if self.episode_title != program_ref.program_name:
                    errors.append(f"Episode title '{self.episode_title}' does not match Program name '{program_ref.program_name}'")

            # Program should not have main_video_file_id set
            if self.main_video_file_id:
                errors.append("Program type should not have main_video_file_id set")

        elif self.media_type == "video":
            # Video type must have main_video_file_id set
            if not self.main_video_file_id:
                errors.append("Video type must have main_video_file_id set")

        elif self.media_type in ["excerpt", "trailer", "webtoon"]:
            # These types are considered invalid per requirements
            errors.append(f"Invalid media_type: {self.media_type}")

        # === Check D: Picture Validation ===
        # Check required image formats
        required_images = [
            ('image_1920_1080_id', 'Image 1920x1080'),
            ('image_1920_720_id', 'Image 1920x720'),
            ('image_1080_1080_id', 'Image 1080x1080'),
            ('image_810_1080_id', 'Image 810x1080'),
        ]

        for field_name, label in required_images:
            if not getattr(self, field_name):
                errors.append(f"{label} is missing")

        # Set diagnostics and commit
        if errors:
            self.diagnostics = ", ".join(errors)
        else:
            self.diagnostics = "ready"

        db.commit()
        logger.info(f"Diagnostic complete for media description {self.id}: {self.diagnostics}")
        return self.diagnostics