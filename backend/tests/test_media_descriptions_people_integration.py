import pytest
import uuid
from fastapi import status
from fastapi.testclient import TestClient

from app.models.public_person import PublicPerson


@pytest.fixture
def sample_program_data():
    """Sample program data for testing."""
    return {
        "program_name": "Test Program with People",
        "general_media_description": "Test program description"
    }


@pytest.fixture
def sample_season_data():
    """Sample season data for testing."""
    return {
        "season_number": 1
    }


@pytest.fixture
def created_people(db):
    """Create sample people for testing."""
    people = []
    names_and_roles = [
        ("John Actor", "actor"),
        ("Jane Director", "director"),
        ("Bob Producer", "producer"),
        ("Alice Author", "author"),
        ("Charlie Supporting", "actor")
    ]

    for name, role in names_and_roles:
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
def created_program(client, admin_token, sample_program_data):
    """Create a program for testing."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/programs", json=sample_program_data, headers=headers)
    return response.json()


@pytest.fixture
def created_season(client, admin_token, created_program, sample_season_data):
    """Create a season for testing."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    season_data = {**sample_season_data, "program_id": created_program["id"]}
    response = client.post("/api/v1/seasons", json=season_data, headers=headers)
    return response.json()


class TestMediaDescriptionWithPeopleRoles:
    """Test media descriptions using the new people_roles functionality."""

    def test_create_media_with_people_roles_new_format(self, client, admin_token, created_program, created_season, created_people):
        """Test creating media description with new people_roles format."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99999,
            "episode_title": "Test Movie with People Roles",
            "media_type": "video",
            "program_id": created_program["id"],
            "season_id": created_season["id"],
            "episode_number": 1,
            "descriptive_summary_text": "Test movie with new people roles format",
            "content_status": "published",
            # New people_roles format
            "people_roles": [
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 10,
                    "character_name": "Hero",
                    "role_details": "Lead Actor"
                },
                {
                    "public_person_id": str(created_people[4].id),
                    "role": "actor",
                    "position": 20,
                    "character_name": "Sidekick",
                    "role_details": "Supporting Actor"
                },
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "director",
                    "position": 10
                },
                {
                    "public_person_id": str(created_people[2].id),
                    "role": "producer",
                    "position": 10,
                    "role_details": "Executive Producer"
                }
            ]
        }

        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Check basic fields
        assert data["file_number"] == 99999
        assert data["episode_title"] == "Test Movie with People Roles"

        # Check that people_roles were processed (backward compatibility should still show old format)
        assert "actors" in data
        assert "directors" in data
        assert "producers" in data

        # The new format should also be available
        if "people_roles" in data:
            assert len(data["people_roles"]) == 4

    def test_create_media_with_multi_role_person(self, client, admin_token, created_people):
        """Test creating media with same person in multiple roles."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99998,
            "episode_title": "Multi-Role Test Movie",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 10,
                    "character_name": "Protagonist"
                },
                {
                    "public_person_id": str(created_people[0].id),  # Same person
                    "role": "director",
                    "position": 10
                }
            ]
        }

        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify the media was created
        assert data["file_number"] == 99998

        # Verify both roles exist via the people API
        people_response = client.get(
            f"/api/v1/media-descriptions/{data['id']}/people",
            headers=headers
        )
        people_data = people_response.json()

        # Should have 2 assignments for the same person
        assert len(people_data) == 2
        person_roles = {p["role"] for p in people_data}
        assert person_roles == {"actor", "director"}

        # All assignments should be for the same person
        person_ids = {p["public_person_id"] for p in people_data}
        assert len(person_ids) == 1
        assert str(created_people[0].id) in person_ids

    def test_create_media_backward_compatibility_old_format(self, client, admin_token, created_people):
        """Test that old format (actor_ids, director_ids) still works."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99997,
            "episode_title": "Backward Compatibility Test",
            "media_type": "video",
            # Old format
            "actor_ids": [str(created_people[0].id), str(created_people[4].id)],
            "director_ids": [str(created_people[1].id)],
            "producer_ids": [str(created_people[2].id)],
            "author_ids": [str(created_people[3].id)]
        }

        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Check that old format still works
        assert data["file_number"] == 99997

        # Verify people were assigned (but without position/character info)
        people_response = client.get(
            f"/api/v1/media-descriptions/{data['id']}/people",
            headers=headers
        )
        people_data = people_response.json()

        # Should have 5 people total (2 actors + 1 director + 1 producer + 1 author)
        assert len(people_data) == 5

        # Check roles distribution
        role_counts = {}
        for person in people_data:
            role = person["role"]
            role_counts[role] = role_counts.get(role, 0) + 1

        assert role_counts["actor"] == 2
        assert role_counts["director"] == 1
        assert role_counts["producer"] == 1
        assert role_counts["author"] == 1

    def test_create_media_mixed_formats_new_takes_precedence(self, client, admin_token, created_people):
        """Test that new people_roles format takes precedence over old format."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99996,
            "episode_title": "Mixed Format Test",
            "media_type": "video",
            # Both old and new formats
            "actor_ids": [str(created_people[0].id)],  # Old format - should be ignored
            "people_roles": [  # New format - should take precedence
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "actor",
                    "position": 10,
                    "character_name": "Real Hero"
                }
            ]
        }

        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify people_roles took precedence
        people_response = client.get(
            f"/api/v1/media-descriptions/{data['id']}/people",
            headers=headers
        )
        people_data = people_response.json()

        # Should only have 1 person (from people_roles, not actor_ids)
        assert len(people_data) == 1
        assert people_data[0]["public_person_id"] == str(created_people[1].id)
        assert people_data[0]["character_name"] == "Real Hero"

    def test_update_media_with_people_roles(self, client, admin_token, created_people):
        """Test updating media description with new people_roles."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create media first
        media_data = {
            "file_number": 99995,
            "episode_title": "Update Test Movie",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 10
                }
            ]
        }

        create_response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        created_media = create_response.json()

        # Update with new people
        update_data = {
            "episode_title": "Updated Movie Title",
            "people_roles": [
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "actor",
                    "position": 10,
                    "character_name": "New Hero"
                },
                {
                    "public_person_id": str(created_people[2].id),
                    "role": "director",
                    "position": 10
                }
            ]
        }

        update_response = client.put(
            f"/api/v1/media-descriptions/{created_media['id']}",
            json=update_data,
            headers=headers
        )

        assert update_response.status_code == status.HTTP_200_OK

        # Verify update
        people_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}/people",
            headers=headers
        )
        people_data = people_response.json()

        # Should have new people, not old ones
        assert len(people_data) == 2
        person_ids = {p["public_person_id"] for p in people_data}
        assert str(created_people[0].id) not in person_ids  # Old person should be gone
        assert str(created_people[1].id) in person_ids     # New actor
        assert str(created_people[2].id) in person_ids     # New director

    def test_position_ordering_in_response(self, client, admin_token, created_people):
        """Test that people are returned in correct position order."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99994,
            "episode_title": "Position Order Test",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": str(created_people[2].id),
                    "role": "actor",
                    "position": 30,  # Third
                    "character_name": "Extra"
                },
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 10,  # First
                    "character_name": "Lead"
                },
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "actor",
                    "position": 20,  # Second
                    "character_name": "Supporting"
                }
            ]
        }

        create_response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        created_media = create_response.json()

        # Get people and verify ordering
        people_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}/people?role=actor",
            headers=headers
        )
        actors = people_response.json()

        assert len(actors) == 3

        # Should be ordered by position
        assert actors[0]["position"] == 10
        assert actors[0]["character_name"] == "Lead"
        assert actors[1]["position"] == 20
        assert actors[1]["character_name"] == "Supporting"
        assert actors[2]["position"] == 30
        assert actors[2]["character_name"] == "Extra"

    def test_position_auto_assignment(self, client, admin_token, created_people):
        """Test automatic position assignment when position is 0."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99993,
            "episode_title": "Auto Position Test",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 0  # Auto-assign
                },
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "actor",
                    "position": 0  # Auto-assign
                }
            ]
        }

        create_response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        created_media = create_response.json()

        # Get people and verify positions were auto-assigned
        people_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}/people?role=actor",
            headers=headers
        )
        actors = people_response.json()

        assert len(actors) == 2

        # Positions should be auto-assigned as 10, 20
        assert actors[0]["position"] == 10
        assert actors[1]["position"] == 20

    def test_character_name_and_role_details_preservation(self, client, admin_token, created_people):
        """Test that character names and role details are preserved."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99992,
            "episode_title": "Character Details Test",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 10,
                    "character_name": "John Smith",
                    "role_details": "Lead Actor, Action Hero"
                },
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "director",
                    "position": 10,
                    "role_details": "Director and Cinematographer"
                }
            ]
        }

        create_response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        created_media = create_response.json()

        # Verify details are preserved
        people_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}/people",
            headers=headers
        )
        people_data = people_response.json()

        actor = next(p for p in people_data if p["role"] == "actor")
        director = next(p for p in people_data if p["role"] == "director")

        assert actor["character_name"] == "John Smith"
        assert actor["role_details"] == "Lead Actor, Action Hero"

        assert director["character_name"] is None  # Not provided for director
        assert director["role_details"] == "Director and Cinematographer"


class TestBackwardCompatibilityProperties:
    """Test that backward compatibility properties still work."""

    def test_actors_property_still_works(self, client, admin_token, created_people):
        """Test that the actors property on MediaDescription still works."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99991,
            "episode_title": "Backward Compat Property Test",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 10
                },
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "director",
                    "position": 10
                }
            ]
        }

        create_response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)
        created_media = create_response.json()

        # Get full media details
        get_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}",
            headers=headers
        )
        media_details = get_response.json()

        # Backward compatibility fields should still be present
        assert "actors" in media_details
        assert "directors" in media_details
        assert "producers" in media_details
        assert "authors" in media_details

        # And they should contain the right data
        assert len(media_details["actors"]) == 1
        assert len(media_details["directors"]) == 1
        assert len(media_details["producers"]) == 0
        assert len(media_details["authors"]) == 0

    def test_from_text_endpoint_with_people_names(self, client, admin_token, created_people):
        """Test the from-text endpoint works with people names."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "episode_title": "From Text Test Movie",
            "media_type": "video",
            # Use text names that match our created people
            "actor_names": ["John Actor", "Charlie Supporting"],
            "director_names": ["Jane Director"],
            "producer_names": ["Bob Producer"]
        }

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=media_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        created_media = response.json()

        # Verify people were found and assigned
        people_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}/people",
            headers=headers
        )
        people_data = people_response.json()

        # Should have 4 people total
        assert len(people_data) == 4

        # Check role distribution
        role_counts = {}
        for person in people_data:
            role = person["role"]
            role_counts[role] = role_counts.get(role, 0) + 1

        assert role_counts["actor"] == 2
        assert role_counts["director"] == 1
        assert role_counts["producer"] == 1


class TestErrorHandling:
    """Test error handling for people relationships."""

    def test_position_conflict_error(self, client, admin_token, created_people):
        """Test that position conflicts are caught during creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        media_data = {
            "file_number": 99990,
            "episode_title": "Position Conflict Test",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": str(created_people[0].id),
                    "role": "actor",
                    "position": 10
                },
                {
                    "public_person_id": str(created_people[1].id),
                    "role": "actor",
                    "position": 10  # Same position - should fail
                }
            ]
        }

        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)

        # Should succeed (bulk creation handles conflicts by skipping)
        assert response.status_code == status.HTTP_200_OK

        # But only one actor should be created
        created_media = response.json()
        people_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}/people?role=actor",
            headers=headers
        )
        actors = people_response.json()

        assert len(actors) == 1  # Only first actor created

    def test_nonexistent_person_graceful_handling(self, client, admin_token):
        """Test that nonexistent people are handled gracefully."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        fake_person_id = str(uuid.uuid4())

        media_data = {
            "file_number": 99989,
            "episode_title": "Nonexistent Person Test",
            "media_type": "video",
            "people_roles": [
                {
                    "public_person_id": fake_person_id,
                    "role": "actor",
                    "position": 10
                }
            ]
        }

        response = client.post("/api/v1/media-descriptions", json=media_data, headers=headers)

        # Should succeed at media level (people assignment might fail silently)
        assert response.status_code == status.HTTP_200_OK

        # Verify no people were assigned
        created_media = response.json()
        people_response = client.get(
            f"/api/v1/media-descriptions/{created_media['id']}/people",
            headers=headers
        )
        people_data = people_response.json()

        assert len(people_data) == 0  # No people assigned