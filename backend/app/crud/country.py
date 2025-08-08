from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.crud.base import CRUDBase
from app.models.country import Country
from app.schemas.country import CountryCreate, CountryUpdate


class CRUDCountry(CRUDBase[Country, CountryCreate, CountryUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Country]:
        return db.query(Country).filter(Country.name == name).first()
    
    def get_multi_with_search(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        search_query: Optional[str] = None
    ) -> Tuple[List[Country], int]:
        """
        Get countries with optional search and return total count.
        """
        query = db.query(Country)
        
        # Apply search filter if provided
        if search_query:
            search_filter = Country.name.ilike(f"%{search_query}%")
            query = query.filter(search_filter)
        
        # Get total count before applying pagination
        total = query.count()
        
        # Apply pagination
        countries = query.offset(skip).limit(limit).all()
        
        return countries, total
    
    def search_by_name(self, db: Session, *, search_term: str) -> List[Country]:
        """
        Search countries by partial name match.
        """
        return db.query(Country).filter(
            Country.name.ilike(f"%{search_term}%")
        ).all()


country = CRUDCountry(Country)