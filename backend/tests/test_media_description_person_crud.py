import pytest
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.crud.media_description_person import media_description_person
from app.models.media_description import MediaDescription
from app.models.public_person import PublicPerson
from app.models.media_description_person import MediaDescriptionPerson
from app.schemas.media_description_person import PersonRoleCreate, PersonRoleUpdate


@pytest.fixture
def sample_media_description(db: Session):
    """Create a sample media description for testing."""
    media = MediaDescription(
        id=str(uuid.uuid4()),
        file_number=12345,
        episode_title="Test Movie",
        media_type="video"
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


@pytest.fixture
def sample_people(db: Session):
    """Create sample people for testing."""
    people = []
    names = ["John Actor", "Jane Director", "Bob Producer", "Alice Author"]

    for name in names:
        person = PublicPerson(
            id=str(uuid.uuid4()),
            stage_name_roman=name
        )
        db.add(person)
        people.append(person)

    db.commit()
    for person in people:
        db.refresh(person)

    return people


@pytest.fixture
def sample_person_role_assignments(sample_media_description, sample_people):
    """Create sample person role assignments."""
    assignments = []

    # Actor assignments
    assignments.append(MediaDescriptionPerson(
        media_description_id=sample_media_description.id,
        public_person_id=sample_people[0].id,
        role="actor",
        position=10,
        character_name="Hero",
        role_details="Lead Actor"
    ))

    assignments.append(MediaDescriptionPerson(
        media_description_id=sample_media_description.id,
        public_person_id=sample_people[1].id,
        role="actor",
        position=20,
        character_name="Villain",
        role_details="Supporting Actor"
    ))

    # Director assignment
    assignments.append(MediaDescriptionPerson(
        media_description_id=sample_media_description.id,
        public_person_id=sample_people[1].id,
        role="director",
        position=10
    ))

    return assignments


class TestMediaDescriptionPersonCRUD:
    """Test CRUD operations for MediaDescriptionPerson."""

    def test_get_by_media_and_role(self, db: Session, sample_media_description, sample_people):
        """Test getting people by media and role with ordering."""
        # Create actors in reverse position order
        actors_data = [
            (sample_people[0].id, 30, "Extra"),
            (sample_people[1].id, 10, "Lead"),
            (sample_people[2].id, 20, "Supporting")
        ]

        for person_id, position, character in actors_data:
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person_id,
                role="actor",
                position=position,
                character_name=character
            )
            db.add(assignment)

        db.commit()

        # Test get by media and role
        actors = media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )

        assert len(actors) == 3
        # Should be ordered by position
        assert actors[0].position == 10
        assert actors[1].position == 20
        assert actors[2].position == 30
        assert actors[0].character_name == "Lead"
        assert actors[1].character_name == "Supporting"
        assert actors[2].character_name == "Extra"

    def test_get_by_person_and_role(self, db: Session, sample_people):
        """Test getting media descriptions by person and role."""
        person = sample_people[0]

        # Create multiple media descriptions for the same person
        media_list = []
        for i in range(3):
            media = MediaDescription(
                id=str(uuid.uuid4()),
                file_number=12345 + i,
                episode_title=f"Movie {i+1}",
                media_type="video"
            )
            db.add(media)
            media_list.append(media)

        db.commit()

        # Add person as actor in all media
        for media in media_list:
            assignment = MediaDescriptionPerson(
                media_description_id=media.id,
                public_person_id=person.id,
                role="actor",
                position=10
            )
            db.add(assignment)

        db.commit()

        # Test get by person and role
        actor_roles = media_description_person.get_by_person_and_role(
            db=db,
            public_person_id=person.id,
            role="actor"
        )

        assert len(actor_roles) == 3
        media_titles = {role.media_description.episode_title for role in actor_roles}
        assert media_titles == {"Movie 1", "Movie 2", "Movie 3"}

    def test_get_by_composite_key(self, db: Session, sample_media_description, sample_people):
        """Test getting specific assignment by composite key."""
        person = sample_people[0]

        assignment = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=person.id,
            role="actor",
            position=10,
            character_name="Protagonist"
        )
        db.add(assignment)
        db.commit()

        # Test get by composite key
        found_assignment = media_description_person.get_by_composite_key(
            db=db,
            media_description_id=sample_media_description.id,
            public_person_id=person.id,
            role="actor"
        )

        assert found_assignment is not None
        assert found_assignment.character_name == "Protagonist"
        assert found_assignment.position == 10

        # Test with non-existent combination
        not_found = media_description_person.get_by_composite_key(
            db=db,
            media_description_id=sample_media_description.id,
            public_person_id=person.id,
            role="director"  # Different role
        )

        assert not_found is None

    def test_get_max_position_for_role(self, db: Session, sample_media_description, sample_people):
        """Test getting maximum position for a role."""
        # Initially should be 0
        max_pos = media_description_person.get_max_position_for_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )
        assert max_pos == 0

        # Add some actors
        positions = [10, 30, 20]
        for i, position in enumerate(positions):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=sample_people[i].id,
                role="actor",
                position=position
            )
            db.add(assignment)

        db.commit()

        # Now max should be 30
        max_pos = media_description_person.get_max_position_for_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )
        assert max_pos == 30

    def test_get_next_available_position(self, db: Session, sample_media_description, sample_people):
        """Test getting next available position."""
        # Initially should be 10 (0 + 10)
        next_pos = media_description_person.get_next_available_position(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )
        assert next_pos == 10

        # Add an actor at position 25
        assignment = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[0].id,
            role="actor",
            position=25
        )
        db.add(assignment)
        db.commit()

        # Next available should be 35 (25 + 10)
        next_pos = media_description_person.get_next_available_position(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )
        assert next_pos == 35

    def test_check_position_available(self, db: Session, sample_media_description, sample_people):
        """Test position availability checking."""
        # Position 10 should be available initially
        is_available = media_description_person.check_position_available(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            position=10
        )
        assert is_available is True

        # Add actor at position 10
        assignment = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[0].id,
            role="actor",
            position=10
        )
        db.add(assignment)
        db.commit()

        # Position 10 should no longer be available
        is_available = media_description_person.check_position_available(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            position=10
        )
        assert is_available is False

        # But position 10 for different role should be available
        is_available = media_description_person.check_position_available(
            db=db,
            media_description_id=sample_media_description.id,
            role="director",
            position=10
        )
        assert is_available is True

        # Should be available if we exclude the current person
        is_available = media_description_person.check_position_available(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            position=10,
            exclude_person_id=sample_people[0].id
        )
        assert is_available is True

    def test_create_with_auto_position(self, db: Session, sample_media_description, sample_people):
        """Test creating assignment with automatic position assignment."""
        person_role_data = PersonRoleCreate(
            public_person_id=sample_people[0].id,
            role="actor",
            position=0,  # Auto-assign
            character_name="Hero"
        )

        assignment = media_description_person.create_with_auto_position(
            db=db,
            obj_in=person_role_data,
            media_description_id=sample_media_description.id
        )

        assert assignment.position == 10  # First available position
        assert assignment.character_name == "Hero"

        # Create another with auto-position
        person_role_data2 = PersonRoleCreate(
            public_person_id=sample_people[1].id,
            role="actor",
            position=0  # Auto-assign
        )

        assignment2 = media_description_person.create_with_auto_position(
            db=db,
            obj_in=person_role_data2,
            media_description_id=sample_media_description.id
        )

        assert assignment2.position == 20  # Next available

    def test_create_with_specific_position(self, db: Session, sample_media_description, sample_people):
        """Test creating assignment with specific position."""
        person_role_data = PersonRoleCreate(
            public_person_id=sample_people[0].id,
            role="actor",
            position=15,  # Specific position
            character_name="Hero"
        )

        assignment = media_description_person.create_with_auto_position(
            db=db,
            obj_in=person_role_data,
            media_description_id=sample_media_description.id
        )

        assert assignment.position == 15
        assert assignment.character_name == "Hero"

    def test_create_position_conflict(self, db: Session, sample_media_description, sample_people):
        """Test that creating with conflicting position raises error."""
        # Create first assignment
        person_role_data1 = PersonRoleCreate(
            public_person_id=sample_people[0].id,
            role="actor",
            position=10
        )

        media_description_person.create_with_auto_position(
            db=db,
            obj_in=person_role_data1,
            media_description_id=sample_media_description.id
        )

        # Try to create second assignment at same position
        person_role_data2 = PersonRoleCreate(
            public_person_id=sample_people[1].id,
            role="actor",
            position=10  # Same position
        )

        with pytest.raises(ValueError, match="Position 10 is already taken"):
            media_description_person.create_with_auto_position(
                db=db,
                obj_in=person_role_data2,
                media_description_id=sample_media_description.id
            )

    def test_update_position(self, db: Session, sample_media_description, sample_people):
        """Test updating position of existing assignment."""
        # Create assignment
        assignment = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[0].id,
            role="actor",
            position=10
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        # Update position
        updated_assignment = media_description_person.update_position(
            db=db,
            db_obj=assignment,
            new_position=20
        )

        assert updated_assignment.position == 20

    def test_update_position_conflict(self, db: Session, sample_media_description, sample_people):
        """Test that updating to conflicting position raises error."""
        # Create two assignments
        assignment1 = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[0].id,
            role="actor",
            position=10
        )
        assignment2 = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[1].id,
            role="actor",
            position=20
        )
        db.add(assignment1)
        db.add(assignment2)
        db.commit()

        # Try to update assignment2 to position 10 (conflict)
        with pytest.raises(ValueError, match="Position 10 is already taken"):
            media_description_person.update_position(
                db=db,
                db_obj=assignment2,
                new_position=10
            )

    def test_reorder_roles(self, db: Session, sample_media_description, sample_people):
        """Test reordering people within a role."""
        # Create three actors
        assignments = []
        for i, person in enumerate(sample_people[:3]):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=(i + 1) * 10  # 10, 20, 30
            )
            db.add(assignment)
            assignments.append(assignment)

        db.commit()

        # Reorder: put third person first, first person second, second person third
        new_order = [sample_people[2].id, sample_people[0].id, sample_people[1].id]

        reordered = media_description_person.reorder_roles(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            person_order=new_order
        )

        assert len(reordered) == 3
        assert reordered[0].public_person_id == sample_people[2].id
        assert reordered[0].position == 10
        assert reordered[1].public_person_id == sample_people[0].id
        assert reordered[1].position == 20
        assert reordered[2].public_person_id == sample_people[1].id
        assert reordered[2].position == 30

    def test_bulk_create_for_media(self, db: Session, sample_media_description, sample_people):
        """Test bulk creation of person role assignments."""
        people_roles = [
            PersonRoleCreate(
                public_person_id=sample_people[0].id,
                role="actor",
                position=10,
                character_name="Hero"
            ),
            PersonRoleCreate(
                public_person_id=sample_people[1].id,
                role="actor",
                position=20,
                character_name="Villain"
            ),
            PersonRoleCreate(
                public_person_id=sample_people[2].id,
                role="director",
                position=10
            )
        ]

        created_assignments = media_description_person.bulk_create_for_media(
            db=db,
            media_description_id=sample_media_description.id,
            people_roles=people_roles
        )

        assert len(created_assignments) == 3

        # Check that all assignments were created correctly
        actors = [a for a in created_assignments if a.role == "actor"]
        directors = [a for a in created_assignments if a.role == "director"]

        assert len(actors) == 2
        assert len(directors) == 1

        # Check ordering
        actors.sort(key=lambda x: x.position)
        assert actors[0].character_name == "Hero"
        assert actors[1].character_name == "Villain"

    def test_replace_all_for_media_and_role(self, db: Session, sample_media_description, sample_people):
        """Test replacing all people for a specific role."""
        # Create initial actors
        initial_assignments = []
        for i, person in enumerate(sample_people[:2]):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=(i + 1) * 10
            )
            db.add(assignment)
            initial_assignments.append(assignment)

        db.commit()

        # Verify initial state
        actors = media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )
        assert len(actors) == 2

        # Replace with new actors
        new_people_roles = [
            PersonRoleCreate(
                public_person_id=sample_people[2].id,
                role="actor",
                position=10,
                character_name="New Hero"
            ),
            PersonRoleCreate(
                public_person_id=sample_people[3].id,
                role="actor",
                position=20,
                character_name="New Villain"
            )
        ]

        new_assignments = media_description_person.replace_all_for_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            people_roles=new_people_roles
        )

        assert len(new_assignments) == 2

        # Verify old assignments are gone and new ones exist
        all_actors = media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )
        assert len(all_actors) == 2

        actor_person_ids = {a.public_person_id for a in all_actors}
        assert actor_person_ids == {sample_people[2].id, sample_people[3].id}

        character_names = {a.character_name for a in all_actors}
        assert character_names == {"New Hero", "New Villain"}


class TestCRUDErrorHandling:
    """Test error handling in CRUD operations."""

    def test_bulk_create_with_conflicts(self, db: Session, sample_media_description, sample_people):
        """Test bulk create handles conflicts gracefully."""
        # Create conflicting assignments (same position)
        people_roles = [
            PersonRoleCreate(
                public_person_id=sample_people[0].id,
                role="actor",
                position=10
            ),
            PersonRoleCreate(
                public_person_id=sample_people[1].id,
                role="actor",
                position=10  # Conflict
            )
        ]

        # Should handle the conflict by skipping the conflicting assignment
        created_assignments = media_description_person.bulk_create_for_media(
            db=db,
            media_description_id=sample_media_description.id,
            people_roles=people_roles
        )

        # Only one assignment should be created (the first one)
        assert len(created_assignments) == 1
        assert created_assignments[0].public_person_id == sample_people[0].id

    def test_reorder_with_missing_person(self, db: Session, sample_media_description, sample_people):
        """Test reordering handles missing people gracefully."""
        # Create one assignment
        assignment = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[0].id,
            role="actor",
            position=10
        )
        db.add(assignment)
        db.commit()

        # Try to reorder with a person that's not assigned
        non_existent_person_id = str(uuid.uuid4())
        person_order = [sample_people[0].id, non_existent_person_id]

        reordered = media_description_person.reorder_roles(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            person_order=person_order
        )

        # Should only reorder existing assignments
        assert len(reordered) == 1
        assert reordered[0].public_person_id == sample_people[0].id