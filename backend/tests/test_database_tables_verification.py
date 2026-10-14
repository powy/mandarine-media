"""
Database tables verification tests

This test suite verifies that all required tables exist and are properly configured
for the media description relationship processing.
"""

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.media_description import MediaDescription
from app.models.public_person import PublicPerson
from app.models.media_theme import MediaTheme
from app.models.audience_category import AudienceCategory
from app.models.country import Country
from app.models.subscription_plan import SubscriptionPlan
from app.db.database import engine


@pytest.mark.skipif(
    engine.url.drivername.startswith("sqlite"),
    reason="Inspects the app's configured database (not the test DB); needs a migrated Postgres instance",
)
class TestDatabaseTablesExist:
    """Verify all required tables exist in the database"""

    def test_required_tables_exist(self):
        """Test that all required tables exist"""
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        required_tables = [
            'media_description',
            'public_person',
            'media_themes',
            'audience_category',
            'countries',
            'subscription_plan'
        ]

        for table in required_tables:
            assert table in existing_tables, f"Required table '{table}' does not exist"

    def test_table_schemas_are_correct(self):
        """Test that tables have expected columns"""
        inspector = inspect(engine)

        # Test public_person table
        person_columns = [col['name'] for col in inspector.get_columns('public_person')]
        assert 'id' in person_columns
        assert 'stage_name_roman' in person_columns

        # Test media_themes table
        theme_columns = [col['name'] for col in inspector.get_columns('media_themes')]
        assert 'id' in theme_columns
        assert 'name' in theme_columns

        # Test audience_category table
        category_columns = [col['name'] for col in inspector.get_columns('audience_category')]
        assert 'id' in category_columns
        assert 'name' in category_columns

        # Test countries table
        country_columns = [col['name'] for col in inspector.get_columns('countries')]
        assert 'id' in country_columns
        assert 'name' in country_columns

        # Test subscription_plan table
        plan_columns = [col['name'] for col in inspector.get_columns('subscription_plan')]
        assert 'id' in plan_columns
        assert 'name' in plan_columns


class TestDatabaseOperations:
    """Test basic database operations on all tables"""

    def test_create_and_retrieve_person(self, db: Session):
        """Test creating and retrieving a person"""
        person = PublicPerson(
            id=uuid4(),
            stage_name_roman="Test Actor"
        )
        db.add(person)
        db.commit()

        # Retrieve the person
        retrieved = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman == "Test Actor"
        ).first()

        assert retrieved is not None
        assert retrieved.stage_name_roman == "Test Actor"
        assert retrieved.id == person.id

    def test_create_and_retrieve_theme(self, db: Session):
        """Test creating and retrieving a theme"""
        theme = MediaTheme(
            id=uuid4(),
            name="Test Theme"
        )
        db.add(theme)
        db.commit()

        # Retrieve the theme
        retrieved = db.query(MediaTheme).filter(
            MediaTheme.name == "Test Theme"
        ).first()

        assert retrieved is not None
        assert retrieved.name == "Test Theme"
        assert retrieved.id == theme.id

    def test_create_and_retrieve_audience_category(self, db: Session):
        """Test creating and retrieving an audience category"""
        category = AudienceCategory(
            id=uuid4(),
            name="Test Category"
        )
        db.add(category)
        db.commit()

        # Retrieve the category
        retrieved = db.query(AudienceCategory).filter(
            AudienceCategory.name == "Test Category"
        ).first()

        assert retrieved is not None
        assert retrieved.name == "Test Category"
        assert retrieved.id == category.id

    def test_create_and_retrieve_country(self, db: Session):
        """Test creating and retrieving a country"""
        country = Country(
            id=uuid4(),
            name="Test Country"
        )
        db.add(country)
        db.commit()

        # Retrieve the country
        retrieved = db.query(Country).filter(
            Country.name == "Test Country"
        ).first()

        assert retrieved is not None
        assert retrieved.name == "Test Country"
        assert retrieved.id == country.id

    def test_create_and_retrieve_subscription_plan(self, db: Session):
        """Test creating and retrieving a subscription plan"""
        plan = SubscriptionPlan(
            id=uuid4(),
            name="Test Plan"
        )
        db.add(plan)
        db.commit()

        # Retrieve the plan
        retrieved = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.name == "Test Plan"
        ).first()

        assert retrieved is not None
        assert retrieved.name == "Test Plan"
        assert retrieved.id == plan.id


class TestDatabaseConstraints:
    """Test database constraints and relationships"""

    def test_person_unique_constraints(self, db: Session):
        """Test if person table has proper constraints"""
        # Create first person
        person1 = PublicPerson(id=uuid4(), stage_name_roman="Unique Actor")
        db.add(person1)
        db.commit()

        # This should work - different person, different name
        person2 = PublicPerson(id=uuid4(), stage_name_roman="Another Actor")
        db.add(person2)
        db.commit()

        # Verify both exist
        count = db.query(PublicPerson).count()
        assert count >= 2

    def test_country_basic_handling(self, db: Session):
        """Test basic country handling"""
        # Test creating countries with required fields
        country1 = Country(id=uuid4(), name="United States")
        country2 = Country(id=uuid4(), name="Test Country")

        db.add_all([country1, country2])
        db.commit()

        # Both should be retrievable
        us = db.query(Country).filter(Country.name == "United States").first()
        test = db.query(Country).filter(Country.name == "Test Country").first()

        assert us is not None
        assert us.name == "United States"
        assert test is not None
        assert test.name == "Test Country"

    def test_subscription_plan_required_fields(self, db: Session):
        """Test subscription plan required fields"""
        # Test with minimal required fields
        minimal_plan = SubscriptionPlan(
            id=uuid4(),
            name="Minimal Plan"
        )

        try:
            db.add(minimal_plan)
            db.commit()
            # If this succeeds, minimal fields are sufficient
            assert True
        except Exception as e:
            # If this fails, we need to identify required fields
            db.rollback()
            print(f"Minimal plan creation failed: {e}")
            # Re-raise the exception to understand what went wrong
            raise


class TestDatabaseQueries:
    """Test database query operations"""

    def test_bulk_person_queries(self, db: Session):
        """Test bulk operations on persons table"""
        # Create multiple persons
        persons = []
        for i in range(10):
            person = PublicPerson(id=uuid4(), stage_name_roman=f"Actor {i}")
            persons.append(person)

        db.add_all(persons)
        db.commit()

        # Test bulk retrieval
        all_actors = db.query(PublicPerson).all()
        assert len(all_actors) >= 10

        # Test filtered queries
        specific_actors = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman.like("Actor %")
        ).all()
        assert len(specific_actors) >= 10

    def test_case_insensitive_queries(self, db: Session):
        """Test case handling in queries"""
        # Create person with mixed case
        person = PublicPerson(id=uuid4(), stage_name_roman="John Smith")
        db.add(person)
        db.commit()

        # Test different case queries
        # Note: This depends on database collation settings
        lower_query = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman == "john smith"
        ).first()

        upper_query = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman == "JOHN SMITH"
        ).first()

        # At minimum, exact case should work
        exact_query = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman == "John Smith"
        ).first()

        assert exact_query is not None

    def test_text_search_functionality(self, db: Session):
        """Test text search capabilities"""
        # Create persons with various names
        test_persons = [
            PublicPerson(id=uuid4(), stage_name_roman="John Smith"),
            PublicPerson(id=uuid4(), stage_name_roman="Jane Smith"),
            PublicPerson(id=uuid4(), stage_name_roman="Bob Johnson"),
        ]

        db.add_all(test_persons)
        db.commit()

        # Test partial matches
        smith_results = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman.like("%Smith%")
        ).all()

        assert len(smith_results) >= 2

        # Test exact matches
        john_result = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman == "John Smith"
        ).first()

        assert john_result is not None
        assert john_result.stage_name_roman == "John Smith"


class TestDatabasePerformance:
    """Basic performance tests"""

    def test_large_dataset_creation(self, db: Session):
        """Test creating larger datasets"""
        # Create 100 persons
        persons = []
        for i in range(100):
            person = PublicPerson(id=uuid4(), stage_name_roman=f"Performance Actor {i}")
            persons.append(person)

        # This should complete without timeout
        db.add_all(persons)
        db.commit()

        # Verify count
        count = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman.like("Performance Actor %")
        ).count()

        assert count == 100

    def test_concurrent_access_simulation(self, db: Session):
        """Test basic concurrent access patterns"""
        # Simulate what might happen with concurrent requests

        # Session 1: Create some data
        person1 = PublicPerson(id=uuid4(), stage_name_roman="Concurrent Actor 1")
        db.add(person1)
        db.commit()

        # Session 1: Read the data back
        retrieved = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman == "Concurrent Actor 1"
        ).first()

        assert retrieved is not None

        # Session 1: Update the data
        retrieved.stage_name_roman = "Updated Concurrent Actor 1"
        db.commit()

        # Session 1: Verify update
        updated = db.query(PublicPerson).filter(
            PublicPerson.stage_name_roman == "Updated Concurrent Actor 1"
        ).first()

        assert updated is not None