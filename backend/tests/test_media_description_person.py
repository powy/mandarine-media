import pytest
import uuid
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.media_description_person import MediaDescriptionPerson, PersonRoleEnum
from app.models.media_description import MediaDescription
from app.models.public_person import PublicPerson
from app.schemas.media_description_person import (
    PersonRoleCreate,
    PersonRoleUpdate,
    BulkPersonRoleAssignment
)


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
def sample_public_person(db: Session):
    """Create a sample public person for testing."""
    person = PublicPerson(
        id=str(uuid.uuid4()),
        stage_name_roman="John Actor"
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@pytest.fixture
def sample_director(db: Session):
    """Create a sample director for testing."""
    director = PublicPerson(
        id=str(uuid.uuid4()),
        stage_name_roman="Jane Director"
    )
    db.add(director)
    db.commit()
    db.refresh(director)
    return director


class TestMediaDescriptionPersonModel:
    """Test the MediaDescriptionPerson model functionality."""

    def test_create_person_role_basic(self, db: Session, sample_media_description, sample_public_person):
        """Test creating a basic person role assignment."""
        person_role = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_public_person.id,
            role="actor",
            position=10,
            character_name="Hero",
            role_details="Lead Actor"
        )

        db.add(person_role)
        db.commit()
        db.refresh(person_role)

        assert person_role.media_description_id == sample_media_description.id
        assert person_role.public_person_id == sample_public_person.id
        assert person_role.role == "actor"
        assert person_role.position == 10
        assert person_role.character_name == "Hero"
        assert person_role.role_details == "Lead Actor"
        assert person_role.created_date_utc is not None
        assert person_role.updated_date_utc is not None

    def test_person_role_enum_validation(self, db: Session, sample_media_description, sample_public_person):
        """Test that PersonRoleEnum validation works."""
        # Valid roles should work
        for role in ["actor", "director", "producer", "author"]:
            person_role = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=sample_public_person.id,
                role=role,
                position=10 + len(role)  # Different positions
            )
            db.add(person_role)

        db.commit()

        # Check all roles were created
        roles = db.query(MediaDescriptionPerson).filter(
            MediaDescriptionPerson.media_description_id == sample_media_description.id
        ).all()
        assert len(roles) == 4

    def test_multi_role_same_person(self, db: Session, sample_media_description, sample_public_person):
        """Test that the same person can have multiple roles."""
        # Add as actor
        actor_role = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_public_person.id,
            role="actor",
            position=10,
            character_name="Protagonist"
        )

        # Add as director
        director_role = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_public_person.id,
            role="director",
            position=10
        )

        db.add(actor_role)
        db.add(director_role)
        db.commit()

        # Verify both roles exist
        roles = db.query(MediaDescriptionPerson).filter(
            MediaDescriptionPerson.media_description_id == sample_media_description.id,
            MediaDescriptionPerson.public_person_id == sample_public_person.id
        ).all()

        assert len(roles) == 2
        role_types = {role.role for role in roles}
        assert role_types == {"actor", "director"}

    def test_position_uniqueness_constraint(self, db: Session):
        """Test that position constraint is properly defined in the model."""
        # Create fresh test objects to avoid session state issues
        media_id = str(uuid.uuid4())
        person1_id = str(uuid.uuid4())
        person2_id = str(uuid.uuid4())

        media = MediaDescription(
            id=media_id,
            file_number=99999,
            episode_title="Position Test Movie",
            media_type="video"
        )

        person1 = PublicPerson(
            id=person1_id,
            stage_name_roman="Test Actor 1"
        )

        person2 = PublicPerson(
            id=person2_id,
            stage_name_roman="Test Actor 2"
        )

        db.add_all([media, person1, person2])
        db.commit()

        # Create first actor at position 10
        person_role1 = MediaDescriptionPerson(
            media_description_id=media_id,
            public_person_id=person1_id,
            role="actor",
            position=10
        )
        db.add(person_role1)
        db.commit()

        # Different role at same position should work
        person_role2 = MediaDescriptionPerson(
            media_description_id=media_id,
            public_person_id=person2_id,
            role="director",  # Different role
            position=10  # Same position - should be OK
        )
        db.add(person_role2)
        db.commit()  # Should succeed

        # Verify both records exist
        roles = db.query(MediaDescriptionPerson).filter(
            MediaDescriptionPerson.media_description_id == media_id
        ).all()
        assert len(roles) == 2

        # Verify constraint is defined in model
        constraints = MediaDescriptionPerson.__table_args__
        constraint_names = [c.name for c in constraints if hasattr(c, 'name')]
        assert 'unique_role_position' in constraint_names

    def test_composite_primary_key_constraint(self, db: Session, sample_media_description, sample_public_person):
        """Test that the composite primary key prevents duplicate role assignments."""
        # Create first assignment
        person_role1 = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_public_person.id,
            role="actor",
            position=10
        )
        db.add(person_role1)
        db.commit()

        # Try to create duplicate assignment
        person_role2 = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_public_person.id,
            role="actor",  # Same person, same media, same role
            position=20   # Different position doesn't matter
        )
        db.add(person_role2)

        with pytest.raises(IntegrityError):
            db.commit()

    def test_relationships(self, db: Session, sample_media_description, sample_public_person):
        """Test that relationships work correctly."""
        person_role = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_public_person.id,
            role="actor",
            position=10
        )
        db.add(person_role)
        db.commit()
        db.refresh(person_role)

        # Test relationships
        assert person_role.media_description.id == sample_media_description.id
        assert person_role.public_person.id == sample_public_person.id
        assert person_role.media_description.episode_title == "Test Movie"
        assert person_role.public_person.stage_name_roman == "John Actor"

    def test_ordering_by_position(self, db: Session, sample_media_description):
        """Test that people are correctly ordered by position."""
        # Create multiple actors with different positions
        people = []
        for i, name in enumerate(["Lead Actor", "Supporting Actor", "Extra"], 1):
            person = PublicPerson(
                id=str(uuid.uuid4()),
                stage_name_roman=name
            )
            db.add(person)
            people.append(person)

        db.commit()

        # Add them in reverse order of position
        positions = [30, 10, 20]  # Will be ordered as 10, 20, 30
        for person, position in zip(people, positions):
            person_role = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=position
            )
            db.add(person_role)

        db.commit()

        # Query ordered by position
        ordered_roles = db.query(MediaDescriptionPerson).filter(
            MediaDescriptionPerson.media_description_id == sample_media_description.id,
            MediaDescriptionPerson.role == "actor"
        ).order_by(MediaDescriptionPerson.position).all()

        # Check they're in correct order
        assert len(ordered_roles) == 3
        assert ordered_roles[0].position == 10
        assert ordered_roles[1].position == 20
        assert ordered_roles[2].position == 30
        assert ordered_roles[0].public_person.stage_name_roman == "Supporting Actor"  # position 10
        assert ordered_roles[1].public_person.stage_name_roman == "Extra"  # position 20
        assert ordered_roles[2].public_person.stage_name_roman == "Lead Actor"  # position 30


class TestPersonRoleSchemas:
    """Test the Pydantic schemas for person roles."""

    def test_person_role_create_schema(self):
        """Test PersonRoleCreate schema validation."""
        # Valid schema
        role_data = PersonRoleCreate(
            public_person_id=str(uuid.uuid4()),
            role=PersonRoleEnum.actor,
            position=10,
            character_name="Hero",
            role_details="Lead Actor"
        )

        assert role_data.public_person_id is not None
        assert role_data.role == PersonRoleEnum.actor
        assert role_data.position == 10
        assert role_data.character_name == "Hero"
        assert role_data.role_details == "Lead Actor"

    def test_person_role_create_defaults(self):
        """Test default values in PersonRoleCreate."""
        # Minimal schema
        role_data = PersonRoleCreate(
            public_person_id=str(uuid.uuid4()),
            role=PersonRoleEnum.director
        )

        assert role_data.position == 0  # Default
        assert role_data.character_name is None
        assert role_data.role_details is None

    def test_person_role_update_schema(self):
        """Test PersonRoleUpdate schema validation."""
        update_data = PersonRoleUpdate(
            position=20,
            character_name="Updated Character",
            role_details="Supporting Actor"
        )

        assert update_data.position == 20
        assert update_data.character_name == "Updated Character"
        assert update_data.role_details == "Supporting Actor"

    def test_bulk_assignment_validation(self):
        """Test BulkPersonRoleAssignment validation."""
        people_roles = [
            PersonRoleCreate(
                public_person_id=str(uuid.uuid4()),
                role=PersonRoleEnum.actor,
                position=10
            ),
            PersonRoleCreate(
                public_person_id=str(uuid.uuid4()),
                role=PersonRoleEnum.actor,
                position=20
            ),
            PersonRoleCreate(
                public_person_id=str(uuid.uuid4()),
                role=PersonRoleEnum.director,
                position=10  # Same position but different role - OK
            )
        ]

        bulk_assignment = BulkPersonRoleAssignment(people_roles=people_roles)

        # Should pass validation
        assert bulk_assignment.validate_positions() is True

    def test_bulk_assignment_position_conflict(self):
        """Test that BulkPersonRoleAssignment catches position conflicts."""
        people_roles = [
            PersonRoleCreate(
                public_person_id=str(uuid.uuid4()),
                role=PersonRoleEnum.actor,
                position=10
            ),
            PersonRoleCreate(
                public_person_id=str(uuid.uuid4()),
                role=PersonRoleEnum.actor,
                position=10  # Duplicate position in same role
            )
        ]

        bulk_assignment = BulkPersonRoleAssignment(people_roles=people_roles)

        # Should raise validation error
        with pytest.raises(ValueError, match="Duplicate position 10 for role actor"):
            bulk_assignment.validate_positions()


class TestMediaDescriptionHelperProperties:
    """Test the helper properties on MediaDescription for backward compatibility."""

    def test_actors_ordered_property(self, db: Session, sample_media_description):
        """Test the actors_ordered property returns correctly ordered actors."""
        # Create actors with specific order
        actors_data = [
            ("Lead Actor", 10),
            ("Supporting Actor", 20),
            ("Extra", 30)
        ]

        for name, position in actors_data:
            person = PublicPerson(
                id=str(uuid.uuid4()),
                stage_name_roman=name
            )
            db.add(person)
            db.commit()
            db.refresh(person)

            person_role = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=position
            )
            db.add(person_role)

        db.commit()
        db.refresh(sample_media_description)

        # Test the ordered property
        ordered_actors = sample_media_description.actors_ordered
        assert len(ordered_actors) == 3
        assert ordered_actors[0].stage_name_roman == "Lead Actor"
        assert ordered_actors[1].stage_name_roman == "Supporting Actor"
        assert ordered_actors[2].stage_name_roman == "Extra"

    def test_backward_compatibility_properties(self, db: Session, sample_media_description):
        """Test that backward compatibility properties work."""
        # Create one actor and one director
        actor = PublicPerson(id=str(uuid.uuid4()), stage_name_roman="Actor Name")
        director = PublicPerson(id=str(uuid.uuid4()), stage_name_roman="Director Name")

        db.add(actor)
        db.add(director)
        db.commit()

        # Add roles
        actor_role = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=actor.id,
            role="actor",
            position=10
        )

        director_role = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=director.id,
            role="director",
            position=10
        )

        db.add(actor_role)
        db.add(director_role)
        db.commit()
        db.refresh(sample_media_description)

        # Test backward compatibility properties
        assert len(sample_media_description.actors) == 1
        assert len(sample_media_description.directors) == 1
        assert len(sample_media_description.producers) == 0
        assert len(sample_media_description.authors) == 0

        assert sample_media_description.actors[0].stage_name_roman == "Actor Name"
        assert sample_media_description.directors[0].stage_name_roman == "Director Name"