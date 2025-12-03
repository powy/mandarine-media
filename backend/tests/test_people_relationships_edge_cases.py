import pytest
import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.media_description import MediaDescription
from app.models.public_person import PublicPerson
from app.models.media_description_person import MediaDescriptionPerson
from app.crud.media_description_person import media_description_person
from app.schemas.media_description_person import PersonRoleCreate


@pytest.fixture
def large_cast(db: Session):
    """Create a large cast of people for performance testing."""
    people = []
    for i in range(100):
        person = PublicPerson(
            id=uuid.uuid4(),
            stage_name_roman=f"Actor {i:03d}"
        )
        db.add(person)
        people.append(person)

    db.commit()
    for person in people:
        db.refresh(person)

    return people


@pytest.fixture
def sample_media_description(db: Session):
    """Create a sample media description for testing."""
    media = MediaDescription(
        id=uuid.uuid4(),
        file_number=77777,
        episode_title="Edge Case Test Movie",
        media_type="video"
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


class TestLargeScaleOperations:
    """Test operations with large numbers of people."""

    def test_large_cast_creation_performance(self, db: Session, sample_media_description, large_cast):
        """Test creating a large cast efficiently."""
        # Create assignments for 50 actors
        people_roles = []
        for i, person in enumerate(large_cast[:50]):
            people_roles.append(PersonRoleCreate(
                public_person_id=person.id,
                role="actor",
                position=(i + 1) * 10,  # 10, 20, 30, ... 500
                character_name=f"Character {i+1}",
                role_details="Cast Member" if i > 2 else f"Lead Actor {i+1}"
            ))

        # Bulk create should handle this efficiently
        created_assignments = media_description_person.bulk_create_for_media(
            db=db,
            media_description_id=sample_media_description.id,
            people_roles=people_roles
        )

        assert len(created_assignments) == 50

        # Verify ordering is maintained
        actors = media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )

        assert len(actors) == 50
        # Check that positions are in order
        for i, actor in enumerate(actors):
            assert actor.position == (i + 1) * 10
            assert actor.character_name == f"Character {i+1}"

    def test_large_cast_reordering(self, db: Session, sample_media_description, large_cast):
        """Test reordering a large cast."""
        # Create 20 actors first
        assignments = []
        for i, person in enumerate(large_cast[:20]):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=(i + 1) * 10
            )
            db.add(assignment)
            assignments.append(assignment)

        db.commit()

        # Reorder them in reverse
        reverse_order = [person.id for person in reversed(large_cast[:20])]

        reordered = media_description_person.reorder_roles(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            person_order=reverse_order
        )

        assert len(reordered) == 20

        # Verify the order is reversed
        for i, assignment in enumerate(reordered):
            expected_person = large_cast[19 - i]  # Reversed order
            assert assignment.public_person_id == expected_person.id
            assert assignment.position == (i + 1) * 10

    def test_api_large_cast_bulk_assignment(self, client: TestClient, admin_token, sample_media_description, large_cast):
        """Test API bulk assignment with large cast."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create bulk assignment for 30 people
        bulk_data = {
            "people_roles": [
                {
                    "public_person_id": str(person.id),
                    "role": "actor",
                    "position": (i + 1) * 10,
                    "character_name": f"Character {i+1}"
                }
                for i, person in enumerate(large_cast[:30])
            ]
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/bulk",
            json=bulk_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 30

        # Verify all assignments were created correctly
        get_response = client.get(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people?role=actor",
            headers=headers
        )
        actors = get_response.json()

        assert len(actors) == 30
        # Check ordering
        for i, actor in enumerate(actors):
            assert actor["position"] == (i + 1) * 10

    def test_api_large_cast_reordering(self, client: TestClient, admin_token, db: Session, sample_media_description, large_cast):
        """Test API reordering with large cast."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # First create 25 actors
        assignments = []
        for i, person in enumerate(large_cast[:25]):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=(i + 1) * 10
            )
            db.add(assignment)
            assignments.append(assignment)

        db.commit()

        # Create new order (move first 5 to the end)
        new_order = [str(person.id) for person in large_cast[5:25]] + [str(person.id) for person in large_cast[:5]]

        response = client.put(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/actor/reorder",
            json={"person_order": new_order},
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "Reordered 25 people" in data["message"]
        assert len(data["assignments"]) == 25


class TestPositionManagementEdgeCases:
    """Test edge cases in position management."""

    def test_position_gaps_handling(self, db: Session, sample_media_description, large_cast):
        """Test that position gaps are handled correctly."""
        # Create actors with large gaps in positions
        positions = [10, 100, 200, 1000, 1500]
        assignments = []

        for i, position in enumerate(positions):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=large_cast[i].id,
                role="actor",
                position=position
            )
            db.add(assignment)
            assignments.append(assignment)

        db.commit()

        # Get next available position
        next_pos = media_description_person.get_next_available_position(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )

        # Should be max (1500) + 10 = 1510
        assert next_pos == 1510

        # Add new actor with auto-position
        new_role = PersonRoleCreate(
            public_person_id=large_cast[5].id,
            role="actor",
            position=0  # Auto-assign
        )

        new_assignment = media_description_person.create_with_auto_position(
            db=db,
            obj_in=new_role,
            media_description_id=sample_media_description.id
        )

        assert new_assignment.position == 1510

    def test_position_zero_handling(self, db: Session, sample_media_description, large_cast):
        """Test handling of position 0 (should auto-assign)."""
        # Create actors with position 0 (should auto-assign)
        for i in range(5):
            role = PersonRoleCreate(
                public_person_id=large_cast[i].id,
                role="actor",
                position=0  # Auto-assign
            )

            assignment = media_description_person.create_with_auto_position(
                db=db,
                obj_in=role,
                media_description_id=sample_media_description.id
            )

            # Should be assigned positions 10, 20, 30, 40, 50
            assert assignment.position == (i + 1) * 10

    def test_negative_position_handling(self, client: TestClient, admin_token, sample_media_description, large_cast):
        """Test that negative positions are handled appropriately."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(large_cast[0].id),
            "role": "actor",
            "position": -10  # Negative position
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        # Should work (negative positions are valid for ordering)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["position"] == -10

    def test_very_large_position_numbers(self, client: TestClient, admin_token, sample_media_description, large_cast):
        """Test handling of very large position numbers."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(large_cast[0].id),
            "role": "actor",
            "position": 999999999  # Very large position
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["position"] == 999999999


class TestConcurrencyAndConflicts:
    """Test concurrent operations and conflict resolution."""

    def test_simultaneous_position_assignment_conflict(self, db: Session, sample_media_description, large_cast):
        """Test handling when two assignments try to use the same position."""
        # Simulate race condition by creating two assignments at the same position
        # First one should succeed, second should fail

        assignment1 = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=large_cast[0].id,
            role="actor",
            position=50
        )
        db.add(assignment1)
        db.commit()

        # Try to create second at same position using CRUD
        role2 = PersonRoleCreate(
            public_person_id=large_cast[1].id,
            role="actor",
            position=50  # Same position
        )

        with pytest.raises(ValueError, match="Position 50 is already taken"):
            media_description_person.create_with_auto_position(
                db=db,
                obj_in=role2,
                media_description_id=sample_media_description.id
            )

    def test_bulk_operation_partial_failure_handling(self, db: Session, sample_media_description, large_cast):
        """Test that bulk operations handle partial failures gracefully."""
        # Create one assignment first
        existing_assignment = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=large_cast[0].id,
            role="actor",
            position=20
        )
        db.add(existing_assignment)
        db.commit()

        # Try bulk create with one conflicting position
        people_roles = [
            PersonRoleCreate(
                public_person_id=large_cast[1].id,
                role="actor",
                position=10  # Should work
            ),
            PersonRoleCreate(
                public_person_id=large_cast[2].id,
                role="actor",
                position=20  # Conflict - should be skipped
            ),
            PersonRoleCreate(
                public_person_id=large_cast[3].id,
                role="actor",
                position=30  # Should work
            )
        ]

        created_assignments = media_description_person.bulk_create_for_media(
            db=db,
            media_description_id=sample_media_description.id,
            people_roles=people_roles
        )

        # Should create 2 assignments (skipping the conflicting one)
        assert len(created_assignments) == 2

        # Verify the right ones were created
        positions = {a.position for a in created_assignments}
        assert positions == {10, 30}

    def test_role_replacement_atomicity(self, db: Session, sample_media_description, large_cast):
        """Test that role replacement is atomic (all or nothing)."""
        # Create initial actors
        initial_assignments = []
        for i in range(3):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=large_cast[i].id,
                role="actor",
                position=(i + 1) * 10
            )
            db.add(assignment)
            initial_assignments.append(assignment)

        db.commit()

        # Replace with new actors
        new_people_roles = [
            PersonRoleCreate(
                public_person_id=large_cast[5].id,
                role="actor",
                position=15
            ),
            PersonRoleCreate(
                public_person_id=large_cast[6].id,
                role="actor",
                position=25
            )
        ]

        new_assignments = media_description_person.replace_all_for_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor",
            people_roles=new_people_roles
        )

        assert len(new_assignments) == 2

        # Verify all old assignments are gone
        remaining_actors = media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )

        assert len(remaining_actors) == 2
        remaining_person_ids = {a.public_person_id for a in remaining_actors}
        assert remaining_person_ids == {large_cast[5].id, large_cast[6].id}


class TestComplexCharacterNamesAndRoleDetails:
    """Test handling of complex character names and role details."""

    def test_unicode_character_names(self, client: TestClient, admin_token, sample_media_description, large_cast):
        """Test handling of Unicode character names and role details."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(large_cast[0].id),
            "role": "actor",
            "position": 10,
            "character_name": "김철수",  # Korean name
            "role_details": "主人公 (Protagonist in Japanese)"
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["character_name"] == "김철수"
        assert "主人公" in data["role_details"]

    def test_very_long_character_names(self, client: TestClient, admin_token, sample_media_description, large_cast):
        """Test handling of very long character names and role details."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create very long strings
        long_character_name = "A" * 250  # Very long character name
        long_role_details = "B" * 250    # Very long role details

        person_role_data = {
            "public_person_id": str(large_cast[0].id),
            "role": "actor",
            "position": 10,
            "character_name": long_character_name,
            "role_details": long_role_details
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should be truncated to fit database limits if any
        assert data["character_name"] == long_character_name
        assert data["role_details"] == long_role_details

    def test_special_characters_in_names(self, client: TestClient, admin_token, sample_media_description, large_cast):
        """Test handling of special characters in names and details."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(large_cast[0].id),
            "role": "actor",
            "position": 10,
            "character_name": "Dr. John \"The Rock\" O'Connor-Smith Jr.",
            "role_details": "Lead Actor & Executive Producer (50%)"
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["character_name"] == "Dr. John \"The Rock\" O'Connor-Smith Jr."
        assert data["role_details"] == "Lead Actor & Executive Producer (50%)"


class TestDatabaseConstraintValidation:
    """Test database constraint validation and edge cases."""

    def test_null_values_handling(self, db: Session, sample_media_description, large_cast):
        """Test handling of null/None values in optional fields."""
        # Create assignment with minimal data
        assignment = MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=large_cast[0].id,
            role="actor",
            position=10,
            character_name=None,  # Explicitly None
            role_details=None     # Explicitly None
        )

        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        assert assignment.character_name is None
        assert assignment.role_details is None
        assert assignment.created_date_utc is not None
        assert assignment.updated_date_utc is not None

    def test_empty_string_handling(self, client: TestClient, admin_token, sample_media_description, large_cast):
        """Test handling of empty strings in character names and role details."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(large_cast[0].id),
            "role": "actor",
            "position": 10,
            "character_name": "",  # Empty string
            "role_details": ""     # Empty string
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Empty strings should be preserved (not converted to null)
        assert data["character_name"] == ""
        assert data["role_details"] == ""

    def test_maximum_people_per_role(self, db: Session, sample_media_description, large_cast):
        """Test system behavior with maximum people per role."""
        # Create 100 actors to test scalability
        assignments = []
        for i, person in enumerate(large_cast):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=(i + 1) * 10,
                character_name=f"Character {i+1}"
            )
            db.add(assignment)
            assignments.append(assignment)

        db.commit()

        # Verify all were created
        actors = media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )

        assert len(actors) == 100

        # Test ordering is maintained
        for i, actor in enumerate(actors):
            assert actor.position == (i + 1) * 10
            assert actor.character_name == f"Character {i+1}"


class TestMigrationValidation:
    """Test that migration from old format works correctly."""

    def test_migration_position_assignment(self, db: Session, sample_media_description, large_cast):
        """Test that migrated data has correct position assignments."""
        # Simulate what migration would do - create assignments without positions first
        # (This simulates old data being migrated)

        # Add actors directly to database without using CRUD (simulating migration)
        from app.models.media_description_person import MediaDescriptionPerson

        for i, person in enumerate(large_cast[:5]):
            # Insert with position = i * 10 (simulating migration logic)
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=person.id,
                role="actor",
                position=i * 10
            )
            db.add(assignment)

        db.commit()

        # Verify positions are correct
        actors = media_description_person.get_by_media_and_role(
            db=db,
            media_description_id=sample_media_description.id,
            role="actor"
        )

        assert len(actors) == 5
        for i, actor in enumerate(actors):
            assert actor.position == i * 10

    def test_migration_backward_compatibility(self, client: TestClient, user_token, db: Session, sample_media_description, large_cast):
        """Test that migrated data is accessible via backward compatibility properties."""
        headers = {"Authorization": f"Bearer {user_token}"}

        # Create assignments directly (simulating migrated data)
        assignments = []
        roles = ["actor", "director", "producer", "author"]

        for i, role in enumerate(roles):
            assignment = MediaDescriptionPerson(
                media_description_id=sample_media_description.id,
                public_person_id=large_cast[i].id,
                role=role,
                position=10
            )
            db.add(assignment)
            assignments.append(assignment)

        db.commit()

        # Test that old API format still works
        response = client.get(
            f"/api/v1/media-descriptions/{sample_media_description.id}",
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Backward compatibility fields should work
        assert "actors" in data
        assert "directors" in data
        assert "producers" in data
        assert "authors" in data

        assert len(data["actors"]) == 1
        assert len(data["directors"]) == 1
        assert len(data["producers"]) == 1
        assert len(data["authors"]) == 1