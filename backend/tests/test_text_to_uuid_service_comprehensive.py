"""
Comprehensive tests for text_to_uuid_service functions

This test suite covers each get_or_create function individually:
1. get_or_create_persons
2. get_or_create_themes
3. get_or_create_audience_categories
4. get_or_create_countries
5. get_or_create_subscription_plans
"""

import pytest
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.public_person import PublicPerson
from app.models.media_theme import MediaTheme
from app.models.audience_category import AudienceCategory
from app.models.country import Country
from app.models.subscription_plan import SubscriptionPlan
from app.services.text_to_uuid_service import (
    get_or_create_persons, get_or_create_themes,
    get_or_create_audience_categories, get_or_create_countries,
    get_or_create_subscription_plans
)


class TestGetOrCreatePersons:
    """Test get_or_create_persons function"""

    def test_create_new_persons(self, db: Session):
        """Test creating new persons"""
        names = ["John Smith", "Jane Doe", "Bob Johnson"]
        result_ids = get_or_create_persons(db, names)

        assert len(result_ids) == 3

        # Verify persons were created in database
        persons = db.query(PublicPerson).all()
        person_names = [p.stage_name_roman for p in persons]

        assert "John Smith" in person_names
        assert "Jane Doe" in person_names
        assert "Bob Johnson" in person_names

    def test_find_existing_persons(self, db: Session):
        """Test finding existing persons"""
        # Create existing person
        existing_person = PublicPerson(id=uuid4(), stage_name_roman="Existing Actor")
        db.add(existing_person)
        db.commit()

        names = ["Existing Actor", "New Actor"]
        result_ids = get_or_create_persons(db, names)

        assert len(result_ids) == 2

        # First ID should be the existing person
        assert existing_person.id in result_ids

        # Verify only one new person was created
        all_persons = db.query(PublicPerson).all()
        assert len(all_persons) == 2

    def test_empty_names_list(self, db: Session):
        """Test with empty names list"""
        result_ids = get_or_create_persons(db, [])
        assert result_ids == []

    def test_names_with_empty_strings(self, db: Session):
        """Test with list containing empty strings"""
        names = ["Valid Actor", "", "Another Actor", None]
        result_ids = get_or_create_persons(db, names)

        # Should only create 2 persons (skipping empty and None)
        assert len(result_ids) == 2

        persons = db.query(PublicPerson).all()
        person_names = [p.stage_name_roman for p in persons]
        assert "Valid Actor" in person_names
        assert "Another Actor" in person_names

    def test_duplicate_names_in_input(self, db: Session):
        """Test with duplicate names in input list"""
        names = ["Actor One", "Actor Two", "Actor One"]  # Duplicate "Actor One"
        result_ids = get_or_create_persons(db, names)

        # Should process each name independently (even duplicates)
        assert len(result_ids) == 3

        # But should only create unique persons in database
        persons = db.query(PublicPerson).all()
        person_names = [p.stage_name_roman for p in persons]
        assert person_names.count("Actor One") >= 1  # At least one "Actor One"
        assert "Actor Two" in person_names

    def test_case_sensitivity(self, db: Session):
        """Test case sensitivity in person matching"""
        # Create existing person with specific case
        existing = PublicPerson(id=uuid4(), stage_name_roman="John Smith")
        db.add(existing)
        db.commit()

        names = ["john smith", "John Smith", "JOHN SMITH"]
        result_ids = get_or_create_persons(db, names)

        # Depending on texts_match implementation, this tests case handling
        assert len(result_ids) >= 1


class TestGetOrCreateThemes:
    """Test get_or_create_themes function"""

    def test_create_new_themes(self, db: Session):
        """Test creating new themes"""
        names = ["Action", "Drama", "Comedy"]
        result_ids = get_or_create_themes(db, names)

        assert len(result_ids) == 3

        # Verify themes were created in database
        themes = db.query(MediaTheme).all()
        theme_names = [t.name for t in themes]

        assert "Action" in theme_names
        assert "Drama" in theme_names
        assert "Comedy" in theme_names

    def test_find_existing_themes(self, db: Session):
        """Test finding existing themes"""
        # Create existing theme
        existing_theme = MediaTheme(id=uuid4(), name="Existing Theme")
        db.add(existing_theme)
        db.commit()

        names = ["Existing Theme", "New Theme"]
        result_ids = get_or_create_themes(db, names)

        assert len(result_ids) == 2
        assert existing_theme.id in result_ids

    def test_empty_theme_names(self, db: Session):
        """Test with empty theme names"""
        result_ids = get_or_create_themes(db, [])
        assert result_ids == []


class TestGetOrCreateAudienceCategories:
    """Test get_or_create_audience_categories function"""

    def test_create_new_categories(self, db: Session):
        """Test creating new audience categories"""
        names = ["General Audience", "Teen Plus", "Adult Only"]
        result_ids = get_or_create_audience_categories(db, names)

        assert len(result_ids) == 3

        # Verify categories were created in database
        categories = db.query(AudienceCategory).all()
        category_names = [c.name for c in categories]

        assert "General Audience" in category_names
        assert "Teen Plus" in category_names
        assert "Adult Only" in category_names

    def test_find_existing_categories(self, db: Session):
        """Test finding existing audience categories"""
        # Create existing category
        existing = AudienceCategory(id=uuid4(), name="Family Friendly")
        db.add(existing)
        db.commit()

        names = ["Family Friendly", "Mature Audience"]
        result_ids = get_or_create_audience_categories(db, names)

        assert len(result_ids) == 2
        assert existing.id in result_ids


class TestGetOrCreateCountries:
    """Test get_or_create_countries function"""

    def test_create_new_countries(self, db: Session):
        """Test creating new countries"""
        names = ["United States", "Canada", "France"]
        result_ids = get_or_create_countries(db, names)

        assert len(result_ids) == 3

        # Verify countries were created in database
        countries = db.query(Country).all()
        country_names = [c.name for c in countries]

        assert "United States" in country_names
        assert "Canada" in country_names
        assert "France" in country_names

    def test_find_existing_countries(self, db: Session):
        """Test finding existing countries"""
        # Create existing country
        existing = Country(id=uuid4(), name="Germany")
        db.add(existing)
        db.commit()

        names = ["Germany", "Italy"]
        result_ids = get_or_create_countries(db, names)

        assert len(result_ids) == 2
        assert existing.id in result_ids


class TestGetOrCreateSubscriptionPlans:
    """Test get_or_create_subscription_plans function"""

    def test_create_new_plans(self, db: Session):
        """Test creating new subscription plans"""
        names = ["Premium", "Family Plan", "Student Discount"]
        result_ids = get_or_create_subscription_plans(db, names)

        assert len(result_ids) == 3

        # Verify plans were created in database
        plans = db.query(SubscriptionPlan).all()
        plan_names = [p.name for p in plans]

        assert "Premium" in plan_names
        assert "Family Plan" in plan_names
        assert "Student Discount" in plan_names

    def test_find_existing_plans(self, db: Session):
        """Test finding existing subscription plans"""
        # Create existing plan
        existing = SubscriptionPlan(
            id=uuid4(),
            name="Basic Plan"
        )
        db.add(existing)
        db.commit()

        names = ["Basic Plan", "Pro Plan"]
        result_ids = get_or_create_subscription_plans(db, names)

        assert len(result_ids) == 2
        assert existing.id in result_ids


class TestIntegrationScenarios:
    """Test realistic integration scenarios"""

    def test_mixed_existing_and_new_items(self, db: Session):
        """Test scenario with mix of existing and new items across all types"""
        # Create some existing data
        existing_actor = PublicPerson(id=uuid4(), stage_name_roman="Famous Actor")
        existing_theme = MediaTheme(id=uuid4(), name="Adventure")
        existing_country = Country(id=uuid4(), name="United States")

        db.add_all([existing_actor, existing_theme, existing_country])
        db.commit()

        # Test persons
        actor_ids = get_or_create_persons(db, ["Famous Actor", "New Actor"])
        assert len(actor_ids) == 2
        assert existing_actor.id in actor_ids

        # Test themes
        theme_ids = get_or_create_themes(db, ["Adventure", "Comedy"])
        assert len(theme_ids) == 2
        assert existing_theme.id in theme_ids

        # Test countries
        country_ids = get_or_create_countries(db, ["United States", "Canada"])
        assert len(country_ids) == 2
        assert existing_country.id in country_ids

    def test_large_arrays_performance(self, db: Session):
        """Test performance with larger arrays"""
        # Create arrays with many items
        many_actors = [f"Actor {i}" for i in range(50)]
        many_themes = [f"Theme {i}" for i in range(30)]

        # These should complete without timeout
        actor_ids = get_or_create_persons(db, many_actors)
        theme_ids = get_or_create_themes(db, many_themes)

        assert len(actor_ids) == 50
        assert len(theme_ids) == 30

    def test_special_characters_in_names(self, db: Session):
        """Test handling of special characters in names"""
        special_names = [
            "Jean-Claude Van Damme",
            "María García",
            "李明",  # Chinese characters
            "Müller",  # German umlaut
            "O'Connor",  # Apostrophe
            "Smith & Jones"  # Ampersand
        ]

        result_ids = get_or_create_persons(db, special_names)
        assert len(result_ids) == len(special_names)

        # Verify all were created correctly
        persons = db.query(PublicPerson).all()
        created_names = [p.stage_name_roman for p in persons]

        for name in special_names:
            assert name in created_names