import logging
from typing import List, Optional, Tuple
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.season import Season
from app.models.media_theme import MediaTheme
from app.models.public_person import PublicPerson
from app.models.picture import Picture
from app.models.country import Country
from app.models.audience_category import AudienceCategory
from app.models.subscription_plan import SubscriptionPlan
from app.models.media_description import MediaDescription
from app.utils.text_normalization import normalize_text_for_search, texts_match

logger = logging.getLogger(__name__)


def get_or_create_program(db: Session, name: str) -> Optional[UUID]:
    """
    Get or create a program by name.
    Returns UUID or None if multiple matches found.
    """
    if not name:
        return None
    
    # Search for existing programs
    programs = db.query(Program).all()
    matches = []
    
    for program in programs:
        if texts_match(name, program.program_name):
            matches.append(program)
    
    if len(matches) == 1:
        return matches[0].id
    elif len(matches) > 1:
        logger.error(f"Multiple programs found for name '{name}': {[p.program_name for p in matches]}")
        return None
    else:
        # Create new program
        new_program = Program(
            id=uuid4(),
            program_name=name.strip()
        )
        db.add(new_program)
        db.commit()
        db.refresh(new_program)
        logger.info(f"Created new program: '{name}' with ID {new_program.id}")
        return new_program.id


def get_or_create_season(db: Session, name: str) -> Optional[UUID]:
    """
    Get or create a season by name.
    Returns UUID or None if multiple matches found.
    """
    if not name:
        return None
    
    # Search for existing seasons
    seasons = db.query(Season).all()
    matches = []
    
    for season in seasons:
        if texts_match(name, season.season_name):
            matches.append(season)
    
    if len(matches) == 1:
        return matches[0].id
    elif len(matches) > 1:
        logger.error(f"Multiple seasons found for name '{name}': {[s.season_name for s in matches]}")
        return None
    else:
        # Create new season (without program_id, season_number will default)
        # Note: This may need adjustment based on business logic
        new_season = Season(
            id=uuid4(),
            season_name=name.strip(),
            season_number=1  # Default value, may need to be calculated
        )
        db.add(new_season)
        db.commit()
        db.refresh(new_season)
        logger.info(f"Created new season: '{name}' with ID {new_season.id}")
        return new_season.id


def get_or_create_themes(db: Session, names: List[str]) -> List[UUID]:
    """
    Get or create themes by names.
    Returns list of UUIDs, skipping any with multiple matches.
    """
    if not names:
        return []
    
    result_ids = []
    
    for name in names:
        if not name:
            continue
            
        # Search for existing themes
        themes = db.query(MediaTheme).all()
        matches = []
        
        for theme in themes:
            if texts_match(name, theme.name):
                matches.append(theme)
        
        if len(matches) == 1:
            result_ids.append(matches[0].id)
        elif len(matches) > 1:
            logger.error(f"Multiple themes found for name '{name}': {[t.name for t in matches]}")
            # Skip this theme
        else:
            # Create new theme
            new_theme = MediaTheme(
                id=uuid4(),
                name=name.strip()
            )
            db.add(new_theme)
            db.commit()
            db.refresh(new_theme)
            logger.info(f"Created new theme: '{name}' with ID {new_theme.id}")
            result_ids.append(new_theme.id)
    
    return result_ids


def get_or_create_persons(db: Session, names: List[str]) -> List[UUID]:
    """
    Get or create public persons by stage_name_roman.
    Returns list of UUIDs, skipping any with multiple matches.
    """
    if not names:
        return []
    
    result_ids = []
    
    for name in names:
        if not name:
            continue
            
        # Search for existing persons
        persons = db.query(PublicPerson).all()
        matches = []
        
        for person in persons:
            if texts_match(name, person.stage_name_roman):
                matches.append(person)
        
        if len(matches) == 1:
            result_ids.append(matches[0].id)
        elif len(matches) > 1:
            logger.error(f"Multiple persons found for stage_name_roman '{name}': {[p.stage_name_roman for p in matches]}")
            # Skip this person
        else:
            # Create new person
            new_person = PublicPerson(
                id=uuid4(),
                stage_name_roman=name.strip()
            )
            db.add(new_person)
            db.commit()
            db.refresh(new_person)
            logger.info(f"Created new person: '{name}' with ID {new_person.id}")
            result_ids.append(new_person.id)
    
    return result_ids


def get_image_by_filename(db: Session, filename: str) -> Optional[UUID]:
    """
    Get image by file_name. Do NOT create if missing.
    Returns UUID or None.
    """
    if not filename:
        return None
    
    # Search for existing pictures
    pictures = db.query(Picture).all()
    matches = []
    
    for picture in pictures:
        if texts_match(filename, picture.file_name):
            matches.append(picture)
    
    if len(matches) == 1:
        return matches[0].id
    elif len(matches) > 1:
        logger.error(f"Multiple pictures found for filename '{filename}': {[p.file_name for p in matches]}")
        return None
    else:
        logger.warning(f"No picture found for filename '{filename}' and not creating new one")
        return None


def get_or_create_countries(db: Session, names: List[str]) -> List[UUID]:
    """
    Get or create countries by name.
    Returns list of UUIDs, skipping any with multiple matches.
    """
    if not names:
        return []
    
    result_ids = []
    
    for name in names:
        if not name:
            continue
            
        # Search for existing countries
        countries = db.query(Country).all()
        matches = []
        
        for country in countries:
            if texts_match(name, country.name):
                matches.append(country)
        
        if len(matches) == 1:
            result_ids.append(matches[0].id)
        elif len(matches) > 1:
            logger.error(f"Multiple countries found for name '{name}': {[c.name for c in matches]}")
            # Skip this country
        else:
            # Create new country
            new_country = Country(
                id=uuid4(),
                name=name.strip()
            )
            db.add(new_country)
            db.commit()
            db.refresh(new_country)
            logger.info(f"Created new country: '{name}' with ID {new_country.id}")
            result_ids.append(new_country.id)
    
    return result_ids


def get_or_create_audience_categories(db: Session, names: List[str]) -> List[UUID]:
    """
    Get or create audience categories by name.
    Returns list of UUIDs, skipping any with multiple matches.
    """
    if not names:
        return []
    
    result_ids = []
    
    for name in names:
        if not name:
            continue
            
        # Search for existing categories
        categories = db.query(AudienceCategory).all()
        matches = []
        
        for category in categories:
            if texts_match(name, category.name):
                matches.append(category)
        
        if len(matches) == 1:
            result_ids.append(matches[0].id)
        elif len(matches) > 1:
            logger.error(f"Multiple audience categories found for name '{name}': {[c.name for c in matches]}")
            # Skip this category
        else:
            # Create new category
            new_category = AudienceCategory(
                id=uuid4(),
                name=name.strip()
            )
            db.add(new_category)
            db.commit()
            db.refresh(new_category)
            logger.info(f"Created new audience category: '{name}' with ID {new_category.id}")
            result_ids.append(new_category.id)
    
    return result_ids


def get_or_create_subscription_plans(db: Session, names: List[str]) -> List[UUID]:
    """
    Get or create subscription plans by name.
    Returns list of UUIDs, skipping any with multiple matches.
    """
    if not names:
        return []
    
    result_ids = []
    
    for name in names:
        if not name:
            continue
            
        # Search for existing plans
        plans = db.query(SubscriptionPlan).all()
        matches = []
        
        for plan in plans:
            if texts_match(name, plan.name):
                matches.append(plan)
        
        if len(matches) == 1:
            result_ids.append(matches[0].id)
        elif len(matches) > 1:
            logger.error(f"Multiple subscription plans found for name '{name}': {[p.name for p in matches]}")
            # Skip this plan
        else:
            # Create new plan
            new_plan = SubscriptionPlan(
                id=uuid4(),
                name=name.strip()
            )
            db.add(new_plan)
            db.commit()
            db.refresh(new_plan)
            logger.info(f"Created new subscription plan: '{name}' with ID {new_plan.id}")
            result_ids.append(new_plan.id)
    
    return result_ids


def get_next_available_file_number(db: Session) -> int:
    """
    Find the first available file_number above 0.
    """
    # Get the maximum file_number
    max_file_number = db.query(MediaDescription.file_number).filter(
        MediaDescription.file_number.isnot(None)
    ).order_by(MediaDescription.file_number.desc()).first()
    
    if not max_file_number or max_file_number[0] is None:
        return 1
    
    # Check for gaps starting from 1
    for i in range(1, max_file_number[0] + 2):
        existing = db.query(MediaDescription).filter(MediaDescription.file_number == i).first()
        if not existing:
            return i
    
    # If no gaps found, return next number after max
    return max_file_number[0] + 1