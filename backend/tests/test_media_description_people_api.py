import pytest
import uuid
from fastapi import status
from fastapi.testclient import TestClient

from app.models.media_description import MediaDescription
from app.models.public_person import PublicPerson
from app.models.media_description_person import MediaDescriptionPerson


@pytest.fixture
def sample_media_description(db):
    """Create a sample media description for testing."""
    media = MediaDescription(
        id=uuid.uuid4(),
        file_number=12345,
        episode_title="Test Movie",
        media_type="video"
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


@pytest.fixture
def sample_people(db):
    """Create sample people for testing."""
    people = []
    names = ["John Actor", "Jane Director", "Bob Producer", "Alice Author", "Charlie Extra"]

    for name in names:
        person = PublicPerson(
            id=uuid.uuid4(),
            stage_name_roman=name
        )
        db.add(person)
        people.append(person)

    db.commit()
    for person in people:
        db.refresh(person)

    return people


@pytest.fixture
def media_with_people(db, sample_media_description, sample_people):
    """Create a media description with existing people assignments."""
    assignments = [
        MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[0].id,
            role="actor",
            position=10,
            character_name="Hero",
            role_details="Lead Actor"
        ),
        MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[1].id,
            role="actor",
            position=20,
            character_name="Villain",
            role_details="Supporting Actor"
        ),
        MediaDescriptionPerson(
            media_description_id=sample_media_description.id,
            public_person_id=sample_people[2].id,
            role="director",
            position=10
        )
    ]

    for assignment in assignments:
        db.add(assignment)

    db.commit()
    return sample_media_description, assignments


class TestGetMediaPeople:
    """Test GET /media-descriptions/{id}/people endpoint."""

    def test_get_all_people_for_media(self, client: TestClient, user_token, media_with_people):
        """Test getting all people for a media description."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get(
            f"/api/v1/media-descriptions/{media.id}/people",
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data) == 3

        # Check ordering (should be by role, then position)
        assert data[0]["role"] == "actor"
        assert data[0]["position"] == 10
        assert data[0]["character_name"] == "Hero"
        assert data[1]["role"] == "actor"
        assert data[1]["position"] == 20
        assert data[1]["character_name"] == "Villain"
        assert data[2]["role"] == "director"
        assert data[2]["position"] == 10

    def test_get_people_by_role(self, client: TestClient, user_token, media_with_people):
        """Test getting people filtered by role."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get(
            f"/api/v1/media-descriptions/{media.id}/people?role=actor",
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data) == 2
        assert all(person["role"] == "actor" for person in data)

        # Check ordering by position
        assert data[0]["position"] == 10
        assert data[1]["position"] == 20

    def test_get_people_media_not_found(self, client: TestClient, user_token):
        """Test getting people for non-existent media."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())

        response = client.get(
            f"/api/v1/media-descriptions/{fake_id}/people",
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Media description not found" in response.json()["detail"]

    def test_get_people_no_auth(self, client: TestClient, media_with_people):
        """Test that endpoint works without authentication."""
        media, assignments = media_with_people

        response = client.get(f"/api/v1/media-descriptions/{media.id}/people")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 3


class TestAddPersonToMedia:
    """Test POST /media-descriptions/{id}/people endpoint."""

    def test_add_person_to_media(self, client: TestClient, admin_token, sample_media_description, sample_people):
        """Test adding a person to a media description."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(sample_people[0].id),
            "role": "actor",
            "position": 10,
            "character_name": "Hero",
            "role_details": "Lead Actor"
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["public_person_id"] == str(sample_people[0].id)
        assert data["role"] == "actor"
        assert data["position"] == 10
        assert data["character_name"] == "Hero"
        assert data["role_details"] == "Lead Actor"

    def test_add_person_auto_position(self, client: TestClient, admin_token, sample_media_description, sample_people):
        """Test adding person with auto position assignment."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(sample_people[0].id),
            "role": "actor",
            "position": 0  # Auto-assign
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["position"] == 10  # First available position

    def test_add_person_duplicate_role(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test that adding duplicate person-role combination fails."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Try to add first person as actor again (already exists)
        person_role_data = {
            "public_person_id": str(sample_people[0].id),
            "role": "actor",
            "position": 30
        }

        response = client.post(
            f"/api/v1/media-descriptions/{media.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "already assigned as actor" in response.json()["detail"]

    def test_add_person_position_conflict(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test that adding person at conflicting position fails."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        person_role_data = {
            "public_person_id": str(sample_people[3].id),  # New person
            "role": "actor",
            "position": 10  # Already taken by sample_people[0]
        }

        response = client.post(
            f"/api/v1/media-descriptions/{media.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Position 10 is already taken" in response.json()["detail"]

    def test_add_person_media_not_found(self, client: TestClient, admin_token, sample_people):
        """Test adding person to non-existent media."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())

        person_role_data = {
            "public_person_id": str(sample_people[0].id),
            "role": "actor",
            "position": 10
        }

        response = client.post(
            f"/api/v1/media-descriptions/{fake_id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Media description not found" in response.json()["detail"]

    def test_add_person_not_found(self, client: TestClient, admin_token, sample_media_description):
        """Test adding non-existent person."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_person_id = str(uuid.uuid4())

        person_role_data = {
            "public_person_id": fake_person_id,
            "role": "actor",
            "position": 10
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Person not found" in response.json()["detail"]

    def test_add_person_non_admin(self, client: TestClient, user_token, sample_media_description, sample_people):
        """Test that non-admin cannot add people."""
        headers = {"Authorization": f"Bearer {user_token}"}

        person_role_data = {
            "public_person_id": str(sample_people[0].id),
            "role": "actor",
            "position": 10
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json=person_role_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestUpdatePersonRole:
    """Test PUT /media-descriptions/{id}/people/{person_id}/{role} endpoint."""

    def test_update_person_role_details(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test updating person role details."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        update_data = {
            "position": 15,
            "character_name": "Updated Hero",
            "role_details": "Main Character"
        }

        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/{sample_people[0].id}/actor",
            json=update_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["position"] == 15
        assert data["character_name"] == "Updated Hero"
        assert data["role_details"] == "Main Character"

    def test_update_person_position_conflict(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test updating to conflicting position fails."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Try to update second actor (position 20) to position 10 (taken by first actor)
        update_data = {"position": 10}

        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/{sample_people[1].id}/actor",
            json=update_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Position 10 is already taken" in response.json()["detail"]

    def test_update_person_role_not_found(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test updating non-existent person role assignment."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        update_data = {"position": 15}

        # Try to update sample_people[3] as actor (not assigned)
        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/{sample_people[3].id}/actor",
            json=update_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Person role assignment not found" in response.json()["detail"]

    def test_update_person_role_non_admin(self, client: TestClient, user_token, media_with_people, sample_people):
        """Test that non-admin cannot update person roles."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {user_token}"}

        update_data = {"position": 15}

        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/{sample_people[0].id}/actor",
            json=update_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestRemovePersonFromMedia:
    """Test DELETE /media-descriptions/{id}/people/{person_id}/{role} endpoint."""

    def test_remove_person_from_media(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test removing a person from a media description."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.delete(
            f"/api/v1/media-descriptions/{media.id}/people/{sample_people[0].id}/actor",
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "removed successfully" in data["message"]

        # Verify person was removed
        get_response = client.get(
            f"/api/v1/media-descriptions/{media.id}/people?role=actor",
            headers=headers
        )
        actors = get_response.json()
        assert len(actors) == 1  # Only one actor left
        assert actors[0]["public_person_id"] != str(sample_people[0].id)

    def test_remove_person_role_not_found(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test removing non-existent person role assignment."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.delete(
            f"/api/v1/media-descriptions/{media.id}/people/{sample_people[3].id}/actor",
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Person role assignment not found" in response.json()["detail"]

    def test_remove_person_non_admin(self, client: TestClient, user_token, media_with_people, sample_people):
        """Test that non-admin cannot remove people."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.delete(
            f"/api/v1/media-descriptions/{media.id}/people/{sample_people[0].id}/actor",
            headers=headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestBulkAssignPeople:
    """Test POST /media-descriptions/{id}/people/bulk endpoint."""

    def test_bulk_assign_people(self, client: TestClient, admin_token, sample_media_description, sample_people):
        """Test bulk assigning people to a media description."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        bulk_data = {
            "people_roles": [
                {
                    "public_person_id": str(sample_people[0].id),
                    "role": "actor",
                    "position": 10,
                    "character_name": "Hero"
                },
                {
                    "public_person_id": str(sample_people[1].id),
                    "role": "actor",
                    "position": 20,
                    "character_name": "Villain"
                },
                {
                    "public_person_id": str(sample_people[2].id),
                    "role": "director",
                    "position": 10
                }
            ]
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/bulk",
            json=bulk_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data) == 3

        # Verify assignments were created
        actors = [p for p in data if p["role"] == "actor"]
        directors = [p for p in data if p["role"] == "director"]

        assert len(actors) == 2
        assert len(directors) == 1

    def test_bulk_assign_position_conflict(self, client: TestClient, admin_token, sample_media_description, sample_people):
        """Test bulk assign with position conflicts."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        bulk_data = {
            "people_roles": [
                {
                    "public_person_id": str(sample_people[0].id),
                    "role": "actor",
                    "position": 10
                },
                {
                    "public_person_id": str(sample_people[1].id),
                    "role": "actor",
                    "position": 10  # Duplicate position
                }
            ]
        }

        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/bulk",
            json=bulk_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Duplicate position 10 for role actor" in response.json()["detail"]

    def test_bulk_assign_media_not_found(self, client: TestClient, admin_token, sample_people):
        """Test bulk assign to non-existent media."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())

        bulk_data = {
            "people_roles": [
                {
                    "public_person_id": str(sample_people[0].id),
                    "role": "actor",
                    "position": 10
                }
            ]
        }

        response = client.post(
            f"/api/v1/media-descriptions/{fake_id}/people/bulk",
            json=bulk_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Media description not found" in response.json()["detail"]


class TestReorderPeopleInRole:
    """Test PUT /media-descriptions/{id}/people/{role}/reorder endpoint."""

    def test_reorder_people_in_role(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test reordering people within a role."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Original order: sample_people[0] (pos 10), sample_people[1] (pos 20)
        # New order: sample_people[1], sample_people[0]
        new_order = [str(sample_people[1].id), str(sample_people[0].id)]

        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/actor/reorder",
            json={"person_order": new_order},
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "Reordered 2 people" in data["message"]
        assert len(data["assignments"]) == 2

        # Verify new ordering
        assignments = data["assignments"]
        assert assignments[0]["public_person_id"] == str(sample_people[1].id)
        assert assignments[0]["position"] == 10
        assert assignments[1]["public_person_id"] == str(sample_people[0].id)
        assert assignments[1]["position"] == 20

    def test_reorder_media_not_found(self, client: TestClient, admin_token, sample_people):
        """Test reordering for non-existent media."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())

        new_order = [str(sample_people[0].id)]

        response = client.put(
            f"/api/v1/media-descriptions/{fake_id}/people/actor/reorder",
            json={"person_order": new_order},
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Media description not found" in response.json()["detail"]

    def test_reorder_non_admin(self, client: TestClient, user_token, media_with_people, sample_people):
        """Test that non-admin cannot reorder people."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {user_token}"}

        new_order = [str(sample_people[1].id), str(sample_people[0].id)]

        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/actor/reorder",
            json={"person_order": new_order},
            headers=headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestReplaceAllPeopleInRole:
    """Test PUT /media-descriptions/{id}/people/{role}/replace endpoint."""

    def test_replace_all_people_in_role(self, client: TestClient, admin_token, media_with_people, sample_people):
        """Test replacing all people for a specific role."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Replace actors with different people
        new_people_roles = [
            {
                "public_person_id": str(sample_people[3].id),
                "role": "actor",
                "position": 10,
                "character_name": "New Hero"
            },
            {
                "public_person_id": str(sample_people[4].id),
                "role": "actor",
                "position": 20,
                "character_name": "New Villain"
            }
        ]

        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/actor/replace",
            json={"people_roles": new_people_roles},
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "Replaced all people in role actor" in data["message"]
        assert len(data["assignments"]) == 2

        # Verify old actors are gone and new ones exist
        get_response = client.get(
            f"/api/v1/media-descriptions/{media.id}/people?role=actor",
            headers=headers
        )
        actors = get_response.json()

        assert len(actors) == 2
        actor_person_ids = {actor["public_person_id"] for actor in actors}
        assert actor_person_ids == {str(sample_people[3].id), str(sample_people[4].id)}

        character_names = {actor["character_name"] for actor in actors}
        assert character_names == {"New Hero", "New Villain"}

    def test_replace_all_media_not_found(self, client: TestClient, admin_token, sample_people):
        """Test replacing people for non-existent media."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())

        new_people_roles = [
            {
                "public_person_id": str(sample_people[0].id),
                "role": "actor",
                "position": 10
            }
        ]

        response = client.put(
            f"/api/v1/media-descriptions/{fake_id}/people/actor/replace",
            json={"people_roles": new_people_roles},
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Media description not found" in response.json()["detail"]

    def test_replace_all_non_admin(self, client: TestClient, user_token, media_with_people, sample_people):
        """Test that non-admin cannot replace people."""
        media, assignments = media_with_people
        headers = {"Authorization": f"Bearer {user_token}"}

        new_people_roles = [
            {
                "public_person_id": str(sample_people[3].id),
                "role": "actor",
                "position": 10
            }
        ]

        response = client.put(
            f"/api/v1/media-descriptions/{media.id}/people/actor/replace",
            json={"people_roles": new_people_roles},
            headers=headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAuthenticationAndAuthorization:
    """Test authentication and authorization for all endpoints."""

    def test_read_endpoints_work_without_auth(self, client: TestClient, media_with_people):
        """Test that read endpoints work without authentication."""
        media, assignments = media_with_people

        # Test GET endpoints work without auth
        response = client.get(f"/api/v1/media-descriptions/{media.id}/people")
        assert response.status_code == status.HTTP_200_OK

        response = client.get(f"/api/v1/media-descriptions/{media.id}/people?role=actor")
        assert response.status_code == status.HTTP_200_OK

    def test_write_endpoints_require_admin(self, client: TestClient, user_token, sample_media_description, sample_people):
        """Test that all write endpoints require admin access."""
        headers = {"Authorization": f"Bearer {user_token}"}

        # Test POST (add person)
        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people",
            json={
                "public_person_id": str(sample_people[0].id),
                "role": "actor",
                "position": 10
            },
            headers=headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Test PUT (update person)
        response = client.put(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/{sample_people[0].id}/actor",
            json={"position": 20},
            headers=headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Test DELETE (remove person)
        response = client.delete(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/{sample_people[0].id}/actor",
            headers=headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Test bulk operations
        response = client.post(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/bulk",
            json={"people_roles": []},
            headers=headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

        response = client.put(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/actor/reorder",
            json={"person_order": []},
            headers=headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

        response = client.put(
            f"/api/v1/media-descriptions/{sample_media_description.id}/people/actor/replace",
            json={"people_roles": []},
            headers=headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_endpoints_require_valid_uuids(self, client: TestClient, admin_token):
        """Test that endpoints validate UUID parameters."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Test with invalid media ID
        response = client.get("/api/v1/media-descriptions/not-a-uuid/people", headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Test with invalid person ID
        media_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/media-descriptions/{media_id}/people/not-a-uuid/actor",
            json={"position": 10},
            headers=headers
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY