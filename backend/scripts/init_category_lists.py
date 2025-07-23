#!/usr/bin/env python3
"""
Initialize default category lists in the database.
This script should be run after database migration to set up the default categories.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.crud.category_list import category_list
from app.models.category_list import CategoryList

def init_default_category_lists():
    """Initialize the default category lists."""
    db = SessionLocal()
    try:
        print("Initializing default category lists...")
        
        # Check if any category lists already exist
        existing_count = db.query(CategoryList).count()
        if existing_count > 0:
            print(f"Found {existing_count} existing category lists. Skipping initialization.")
            return
        
        # Create default categories
        created_lists = category_list.create_default_categories(db=db)
        
        print(f"Successfully created {len(created_lists)} default category lists:")
        for cat_list in created_lists:
            print(f"  - {cat_list.name}: {cat_list.title}")
            
            # Update JSON for each category
            success = category_list.update_json_for_list(db=db, id=cat_list.id)
            if success:
                print(f"    ✓ JSON generated for {cat_list.name}")
            else:
                print(f"    ✗ Failed to generate JSON for {cat_list.name}")
        
        print("\nDefault category lists initialization completed!")
        
    except Exception as e:
        print(f"Error initializing category lists: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_default_category_lists()