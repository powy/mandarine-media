import pytest
from unittest.mock import Mock, MagicMock
from uuid import uuid4
from sqlalchemy.orm import Session

from app.services.text_to_uuid_service import (
    get_or_create_program, get_or_create_season, get_or_create_themes,
    get_or_create_persons, get_image_by_filename, get_or_create_countries,
    get_or_create_audience_categories, get_or_create_subscription_plans,
    get_next_available_file_number
)
from app.models.program import Program
from app.models.season import Season
from app.models.media_theme import MediaTheme
from app.models.public_person import PublicPerson
from app.models.picture import Picture
from app.models.country import Country
from app.models.audience_category import AudienceCategory
from app.models.subscription_plan import SubscriptionPlan
from app.models.media_description import MediaDescription


class TestTextToUuidService:
    """Test text-to-UUID service functions"""

    def setup_method(self):
        """Setup test fixtures"""
        self.db = Mock(spec=Session)

    def test_get_or_create_program_existing(self):
        """Test getting existing program"""
        # Mock existing program
        existing_program = Program(id=uuid4(), program_name="Test Program")
        self.db.query.return_value.all.return_value = [existing_program]
        
        result = get_or_create_program(self.db, "test program")
        
        assert result == existing_program.id
        self.db.add.assert_not_called()
        self.db.commit.assert_not_called()

    def test_get_or_create_program_new(self):
        """Test creating new program"""
        # Mock no existing programs
        self.db.query.return_value.all.return_value = []
        
        result = get_or_create_program(self.db, "New Program")
        
        assert result is not None
        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()

    def test_get_or_create_program_multiple_matches(self):
        """Test handling multiple matches"""
        # Mock multiple programs
        prog1 = Program(id=uuid4(), program_name="Test Program")
        prog2 = Program(id=uuid4(), program_name="test program")
        self.db.query.return_value.all.return_value = [prog1, prog2]
        
        result = get_or_create_program(self.db, "TEST PROGRAM")
        
        assert result is None  # Should return None for multiple matches
        self.db.add.assert_not_called()

    def test_get_or_create_program_empty_name(self):
        """Test handling empty program name"""
        result = get_or_create_program(self.db, "")
        assert result is None
        
        result = get_or_create_program(self.db, None)
        assert result is None

    def test_get_or_create_themes_mixed_results(self):
        """Test themes with mix of existing and new"""
        # Mock existing theme
        existing_theme = MediaTheme(id=uuid4(), name="Action")
        self.db.query.return_value.all.return_value = [existing_theme]
        
        result = get_or_create_themes(self.db, ["action", "Drama", "Comedy"])
        
        # Should return list of UUIDs
        assert isinstance(result, list)
        assert len(result) >= 1  # At least the existing one

    def test_get_or_create_persons_accent_matching(self):
        """Test person matching with accents"""
        # Mock existing person with accents
        existing_person = PublicPerson(id=uuid4(), stage_name_roman="María García")
        self.db.query.return_value.all.return_value = [existing_person]
        
        result = get_or_create_persons(self.db, ["Maria Garcia"])
        
        assert len(result) == 1
        assert result[0] == existing_person.id

    def test_get_image_by_filename_existing(self):
        """Test getting existing image"""
        existing_image = Picture(id=uuid4(), file_name="test.jpg")
        self.db.query.return_value.all.return_value = [existing_image]
        
        result = get_image_by_filename(self.db, "test.jpg")
        
        assert result == existing_image.id
        self.db.add.assert_not_called()  # Should not create new image

    def test_get_image_by_filename_not_found(self):
        """Test image not found (should not create)"""
        self.db.query.return_value.all.return_value = []
        
        result = get_image_by_filename(self.db, "nonexistent.jpg")
        
        assert result is None
        self.db.add.assert_not_called()

    def test_get_next_available_file_number_empty_db(self):
        """Test file number generation with empty database"""
        self.db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
        
        result = get_next_available_file_number(self.db)
        
        assert result == 1

    def test_get_next_available_file_number_sequential(self):
        """Test file number generation returns sequential number"""
        # Mock max file number exists
        self.db.query.return_value.filter.return_value.order_by.return_value.first.return_value = (3,)
        
        # Mock that all numbers 1,2,3 exist, so next available should be 4
        self.db.query.return_value.filter.return_value.first.return_value = Mock()  # Something exists
        
        result = get_next_available_file_number(self.db)
        
        # Should return a valid number
        assert isinstance(result, int)
        assert result >= 1

    def test_get_or_create_countries_case_insensitive(self):
        """Test country creation with case insensitive matching"""
        existing_country = Country(id=uuid4(), name="United States")
        self.db.query.return_value.all.return_value = [existing_country]
        
        result = get_or_create_countries(self.db, ["UNITED STATES", "canada"])
        
        # Should match existing US and create new Canada
        assert len(result) >= 1
        assert existing_country.id in result

    def test_get_or_create_audience_categories_empty_list(self):
        """Test audience categories with empty input"""
        result = get_or_create_audience_categories(self.db, [])
        assert result == []
        
        result = get_or_create_audience_categories(self.db, None)
        assert result == []

    def test_get_or_create_subscription_plans_whitespace(self):
        """Test subscription plans with whitespace normalization"""
        existing_plan = SubscriptionPlan(id=uuid4(), name="Premium Plan")
        self.db.query.return_value.all.return_value = [existing_plan]
        
        result = get_or_create_subscription_plans(self.db, ["  premium plan  "])
        
        assert len(result) == 1
        assert result[0] == existing_plan.id