from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.program import Program
from app.schemas.program import ProgramCreate, ProgramUpdate
import logging

logger = logging.getLogger(__name__)


class CRUDProgram(CRUDBase[Program, ProgramCreate, ProgramUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Program]:
        return db.query(Program).filter(Program.program_name == name).first()

    def get(self, db: Session, id: UUID) -> Optional[Program]:
        """
        Get Program with eager-loaded relationships for JSON generation.

        Override parent method to add necessary joins.
        """
        from app.models.media_description import MediaDescription
        from app.models.season import Season

        return (
            db.query(Program)
            # Load general_media_description with its images
            .options(
                joinedload(Program.general_media_description)
                .joinedload(MediaDescription.image_1920_1080)
            )
            .options(
                joinedload(Program.general_media_description)
                .joinedload(MediaDescription.image_1920_720)
            )
            .options(
                joinedload(Program.general_media_description)
                .joinedload(MediaDescription.image_1080_1080)
            )
            .options(
                joinedload(Program.general_media_description)
                .joinedload(MediaDescription.image_810_1080)
            )
            .options(
                joinedload(Program.general_media_description)
                .joinedload(MediaDescription.image_1080_1920)
            )
            # Load seasons (will be used to generate nested season JSONs)
            .options(joinedload(Program.seasons))
            .filter(Program.id == id)
            .first()
        )

    def refresh_json_cache(self, db: Session, *, program_id: UUID) -> Program:
        """
        Refresh the JSON cache for a program.

        Args:
            db: Database session
            program_id: UUID of the program

        Returns:
            Updated Program instance

        Raises:
            ValueError: If program not found
        """
        program = self.get(db, id=program_id)
        if not program:
            raise ValueError(f"Program {program_id} not found")

        program.update_json(db)
        return program

    def get_json_cache(self, db: Session, *, program_id: UUID, refresh: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get the cached JSON for a program.

        Args:
            db: Database session
            program_id: UUID of the program
            refresh: If True, regenerate JSON before returning

        Returns:
            Dictionary with program JSON data or None if not found
        """
        program = self.get(db, id=program_id)
        if not program:
            return None

        if refresh or not program.json_content:
            program.update_json(db)

        if program.json_content:
            import json
            return json.loads(program.json_content)

        return None

    def refresh_all_json_caches(self, db: Session) -> Dict[str, Any]:
        """
        Refresh JSON cache for all programs.

        Returns:
            Dictionary with refresh statistics:
            - refreshed_count: Number of programs successfully refreshed
            - failed_count: Number of programs that failed to refresh
            - total_count: Total number of programs processed
            - errors: List of error messages
        """
        from app.models.media_description import MediaDescription
        from app.models.season import Season

        # Get all programs with eager-loaded relationships for efficiency
        programs = (
            db.query(Program)
            .options(joinedload(Program.general_media_description))
            .options(joinedload(Program.seasons))
            .all()
        )

        refreshed_count = 0
        failed_count = 0
        errors = []

        for program in programs:
            try:
                program.update_json(db)
                refreshed_count += 1
            except Exception as e:
                failed_count += 1
                error_msg = f"Program {program.program_name} (ID: {program.id}): {str(e)}"
                errors.append(error_msg)
                logger.error(f"Failed to refresh program JSON: {error_msg}")

        # Commit all changes at once
        db.commit()

        return {
            "refreshed_count": refreshed_count,
            "failed_count": failed_count,
            "total_count": len(programs),
            "errors": errors
        }


program = CRUDProgram(Program)