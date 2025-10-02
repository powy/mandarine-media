"""
Test CRUD base update functionality.
Specifically tests the fix for the bug where updating NULL fields to values would fail.
"""
import pytest
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.program import Program
from app.schemas.program import ProgramCreate, ProgramUpdate


class TestCRUDBaseUpdate:
    """Test CRUDBase update method with NULL to value updates."""

    def test_update_null_field_to_value(self, db: Session, sample_media_description):
        """
        Test updating a NULL field to a value.
        This is the core bug fix test: ensures that fields that are NULL
        in the database CAN be updated to non-NULL values.
        """
        # Create a program with NULL general_media_description_id
        program_crud = CRUDBase[Program, ProgramCreate, ProgramUpdate](Program)

        create_data = ProgramCreate(
            program_name="Test Program NULL to Value",
            general_media_description_id=None
        )
        program = program_crud.create(db=db, obj_in=create_data)

        # Verify it's NULL
        assert program.general_media_description_id is None

        # Update the NULL field to a value
        update_data = ProgramUpdate(
            general_media_description_id=sample_media_description.id
        )
        updated_program = program_crud.update(db=db, db_obj=program, obj_in=update_data)

        # THE BUG FIX: This should now work!
        assert updated_program.general_media_description_id == sample_media_description.id

        # Verify in database
        db.refresh(updated_program)
        assert updated_program.general_media_description_id == sample_media_description.id

    def test_update_value_field_to_null(self, db: Session, sample_media_description):
        """Test updating a field with a value to NULL."""
        program_crud = CRUDBase[Program, ProgramCreate, ProgramUpdate](Program)

        # Create a program with a media description
        create_data = ProgramCreate(
            program_name="Test Program Value to NULL",
            general_media_description_id=sample_media_description.id
        )
        program = program_crud.create(db=db, obj_in=create_data)

        # Verify it has a value
        assert program.general_media_description_id == sample_media_description.id

        # Update to NULL
        update_data = ProgramUpdate(general_media_description_id=None)
        updated_program = program_crud.update(db=db, db_obj=program, obj_in=update_data)

        assert updated_program.general_media_description_id is None

        # Verify in database
        db.refresh(updated_program)
        assert updated_program.general_media_description_id is None

    def test_update_null_field_to_value_then_to_another_value(self, db: Session, sample_media_description):
        """
        Test the intermittent failure scenario:
        1. Create with NULL
        2. Update to a value (works first time)
        3. Update to another value (should also work)
        """
        from app.models.media_description import MediaDescription
        from app.schemas.media_description import MediaDescriptionCreate

        program_crud = CRUDBase[Program, ProgramCreate, ProgramUpdate](Program)

        # Create another media description for testing
        from app.crud.media_description import media_description as media_description_crud
        second_media = media_description_crud.create(
            db=db,
            obj_in=MediaDescriptionCreate(
                episode_title="Second Media Description",
                media_type="video",
                file_number=998
            )
        )

        # Step 1: Create program with NULL
        create_data = ProgramCreate(
            program_name="Test Program Multiple Updates",
            general_media_description_id=None
        )
        program = program_crud.create(db=db, obj_in=create_data)
        assert program.general_media_description_id is None

        # Step 2: Update to first value
        update_data_1 = ProgramUpdate(general_media_description_id=sample_media_description.id)
        updated_program_1 = program_crud.update(db=db, db_obj=program, obj_in=update_data_1)
        assert updated_program_1.general_media_description_id == sample_media_description.id

        # Step 3: Update to second value (this would fail with the bug)
        update_data_2 = ProgramUpdate(general_media_description_id=second_media.id)
        updated_program_2 = program_crud.update(db=db, db_obj=updated_program_1, obj_in=update_data_2)
        assert updated_program_2.general_media_description_id == second_media.id

        # Verify in database
        db.refresh(updated_program_2)
        assert updated_program_2.general_media_description_id == second_media.id

    def test_update_with_dict_null_to_value(self, db: Session, sample_media_description):
        """Test updating with a dict (not Pydantic model) from NULL to value."""
        program_crud = CRUDBase[Program, ProgramCreate, ProgramUpdate](Program)

        # Create with NULL
        create_data = ProgramCreate(
            program_name="Test Program Dict Update",
            general_media_description_id=None
        )
        program = program_crud.create(db=db, obj_in=create_data)
        assert program.general_media_description_id is None

        # Update with dict
        update_dict = {"general_media_description_id": sample_media_description.id}
        updated_program = program_crud.update(db=db, db_obj=program, obj_in=update_dict)

        assert updated_program.general_media_description_id == sample_media_description.id

        # Verify in database
        db.refresh(updated_program)
        assert updated_program.general_media_description_id == sample_media_description.id

    def test_update_only_updates_provided_fields(self, db: Session, sample_media_description):
        """Test that update only modifies fields that are provided."""
        program_crud = CRUDBase[Program, ProgramCreate, ProgramUpdate](Program)

        # Create with specific values
        create_data = ProgramCreate(
            program_name="Original Name",
            general_media_description_id=sample_media_description.id
        )
        program = program_crud.create(db=db, obj_in=create_data)

        # Update only the name, not the media_description_id
        update_data = ProgramUpdate(program_name="Updated Name")
        updated_program = program_crud.update(db=db, db_obj=program, obj_in=update_data)

        # Name should be updated
        assert updated_program.program_name == "Updated Name"
        # Media description should remain unchanged
        assert updated_program.general_media_description_id == sample_media_description.id
