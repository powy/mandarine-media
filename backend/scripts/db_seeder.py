#!/usr/bin/env python3
"""
Database Seeding Script for Kyool Media Backend

This script reads data from Excel files and populates the database via API endpoints.
Each Excel sheet corresponds to a database table/model.

Usage:
    python scripts/db_seeder.py --excel-file data/seed_data.xlsx --api-url http://localhost:8000

Excel Structure:
- Each sheet represents a table (users, programs, public_persons, etc.)
- First row contains column headers matching API field names
- Relationships are handled via ID references and name lookups
- Special columns like _ref_name allow referencing by name instead of ID

Dependencies:
    pip install pandas openpyxl requests
"""

import argparse
import sys
import pandas as pd
import requests
import uuid
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path
import json
from datetime import datetime, timezone

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseSeeder:
    def __init__(self, api_base_url: str, admin_email: str = "admin@kyool.com", admin_password: str = "admin123"):
        self.api_base_url = api_base_url.rstrip('/')
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.access_token = None
        self.entity_cache = {}  # Cache for created entities to resolve references
        
        # Define seeding order to handle dependencies
        self.seeding_order = [
            'users',
            'languages', 
            'countries',
            'territories',
            'pictures',
            'audience_categories',
            'subscription_plans',
            'category_lists',
            'category_list_items',
            'programs',
            'seasons',
            'public_persons',
            'media_descriptions',
            'video_files',
            'description_reports',
            'video_file_reports',
            'content_lists',
            'screen_contents'
        ]
        
        # API endpoint mapping
        self.endpoints = {
            'users': '/api/v1/users',
            'languages': '/api/v1/languages',
            'countries': '/api/v1/countries', 
            'territories': '/api/v1/territories',
            'pictures': '/api/v1/pictures',
            'audience_categories': '/api/v1/audience/categories',
            'subscription_plans': '/api/v1/subscription/plans',
            'category_lists': '/api/v1/category/lists',
            'category_list_items': '/api/v1/category/lists/{list_id}/items',
            'programs': '/api/v1/programs',
            'seasons': '/api/v1/seasons',
            'public_persons': '/api/v1/persons',
            'media_descriptions': '/api/v1/media/descriptions',
            'video_files': '/api/v1/video/files',
            'description_reports': '/api/v1/description/reports',
            'video_file_reports': '/api/v1/video/file/reports',
            'content_lists': '/api/v1/content/lists',
            'screen_contents': '/api/v1/screen/contents'
        }

    def authenticate(self) -> bool:
        """Authenticate with the API and get access token"""
        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/auth/login",
                data={
                    "username": self.admin_email,
                    "password": self.admin_password
                }
            )
            if response.status_code == 200:
                self.access_token = response.json()["access_token"]
                logger.info("Successfully authenticated with API")
                return True
            else:
                logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False

    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication token"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def load_excel_data(self, excel_file_path: str) -> Dict[str, pd.DataFrame]:
        """Load all sheets from Excel file"""
        try:
            excel_data = pd.read_excel(excel_file_path, sheet_name=None, engine='openpyxl')
            logger.info(f"Loaded Excel file with sheets: {list(excel_data.keys())}")
            return excel_data
        except Exception as e:
            logger.error(f"Error loading Excel file: {e}")
            raise

    def resolve_reference(self, value: Any, entity_type: str, reference_field: str = 'name') -> Optional[str]:
        """Resolve entity reference by name to ID"""
        if pd.isna(value) or value == '':
            return None
            
        # If it's already a UUID, return as is
        try:
            uuid.UUID(str(value))
            return str(value)
        except ValueError:
            pass
        
        # Look up in cache by reference field
        cache_key = f"{entity_type}_{reference_field}_{value}"
        if cache_key in self.entity_cache:
            return self.entity_cache[cache_key]
        
        logger.warning(f"Could not resolve reference: {entity_type}.{reference_field} = '{value}'")
        return None

    def process_json_array_field(self, value: Any) -> Optional[List[str]]:
        """Process fields that should be JSON arrays"""
        if pd.isna(value) or value == '':
            return None
        
        if isinstance(value, str):
            # Try to parse as JSON first
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # Split by comma if not JSON
                return [item.strip() for item in value.split(',') if item.strip()]
        
        if isinstance(value, list):
            return value
            
        return [str(value)]

    def process_reference_list(self, value: Any, entity_type: str) -> Optional[List[str]]:
        """Process fields that contain lists of entity references"""
        if pd.isna(value) or value == '':
            return None
        
        items = []
        if isinstance(value, str):
            # Split by comma and resolve each reference
            refs = [item.strip() for item in value.split(',') if item.strip()]
            for ref in refs:
                resolved_id = self.resolve_reference(ref, entity_type)
                if resolved_id:
                    items.append(resolved_id)
        
        return items if items else None

    def process_mixed_content_references(self, value: Any) -> Optional[List[str]]:
        """Process content_items field that can reference programs, seasons, or media_descriptions"""
        if pd.isna(value) or value == '':
            return None
        
        items = []
        if isinstance(value, str):
            # Split by comma and try to resolve each reference across multiple entity types
            refs = [item.strip() for item in value.split(',') if item.strip()]
            for ref in refs:
                # Try to resolve as program first, then season, then media_description
                resolved_id = (
                    self.resolve_reference(ref, 'programs') or
                    self.resolve_reference(ref, 'seasons') or
                    self.resolve_reference(ref, 'media_descriptions')
                )
                if resolved_id:
                    items.append(resolved_id)
                else:
                    logger.warning(f"Could not resolve mixed content reference: {ref}")
        
        return items if items else None

    def prepare_row_data(self, row: pd.Series, sheet_name: str) -> Dict[str, Any]:
        """Prepare row data for API submission"""
        data = {}
        
        for column, value in row.items():
            # Skip empty values and reference columns
            if pd.isna(value) or value == '' or column.startswith('_'):
                continue
            
            # Handle special field types
            if column.endswith('_id_list') or column.endswith('_list') or column in ['content_items', 'content_types', 'content_lists']:
                # These are JSON array fields that might contain entity references
                if 'public_person' in column or 'person' in column:
                    data[column] = self.process_reference_list(value, 'public_persons')
                elif 'language' in column:
                    data[column] = self.process_reference_list(value, 'languages')
                elif 'country' in column or 'countries' in column:
                    data[column] = self.process_reference_list(value, 'countries')
                elif 'territory' in column or 'territories' in column:
                    data[column] = self.process_reference_list(value, 'territories')
                elif 'category' in column:
                    data[column] = self.process_reference_list(value, 'categories')
                elif column == 'content_items':
                    # For content lists: can reference programs, seasons, or media_descriptions
                    data[column] = self.process_mixed_content_references(value)
                elif column == 'content_lists':
                    # For screen contents: references to content lists
                    data[column] = self.process_reference_list(value, 'content_lists')
                elif column == 'content_types':
                    # For content lists: array of content type strings
                    data[column] = self.process_json_array_field(value)
                else:
                    data[column] = self.process_json_array_field(value)
            
            elif column.endswith('_id'):
                # Single entity reference fields
                entity_type = column.replace('_id', '')
                if entity_type == 'program':
                    entity_type = 'programs'
                elif entity_type == 'season':
                    entity_type = 'seasons'
                elif entity_type == 'media_description':
                    entity_type = 'media_descriptions'
                elif entity_type == 'face_image':
                    entity_type = 'pictures'
                    
                data[column] = self.resolve_reference(value, entity_type)
            
            elif column == 'thumbnail_format':
                # Validate thumbnail format enum value
                valid_formats = ['small_square', 'medium_portrait', 'large_landscape', 'vertical_mobile']
                if value in valid_formats:
                    data[column] = value
                else:
                    logger.warning(f"Invalid thumbnail format: {value}. Valid options: {valid_formats}")
                    continue
            
            elif column in ['creation_date_utc', 'contract_start_date_utc', 'contract_end_date_utc', 
                          'original_broadcast_date_utc', 'last_updated_utc', 'encodage_date_utc', 'upload_timestamp']:
                # Date fields
                if isinstance(value, str):
                    try:
                        # Parse date and convert to ISO format
                        dt = pd.to_datetime(value)
                        data[column] = dt.isoformat()
                    except:
                        logger.warning(f"Could not parse date: {value}")
                        continue
                elif pd.notna(value):
                    data[column] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
            
            else:
                # Regular fields
                data[column] = value
        
        return data

    def create_entity(self, entity_type: str, data: Dict[str, Any], row: pd.Series) -> Optional[Dict[str, Any]]:
        """Create a single entity via API"""
        endpoint = self.endpoints.get(entity_type)
        if not endpoint:
            logger.error(f"No endpoint defined for entity type: {entity_type}")
            return None
        
        # Handle special cases for nested endpoints
        if entity_type == 'category_list_items':
            list_name = row.get('_list_name', '')
            list_id = self.resolve_reference(list_name, 'category_lists')
            if not list_id:
                logger.error(f"Could not resolve category list reference: {list_name}")
                return None
            endpoint = endpoint.format(list_id=list_id)
        
        url = f"{self.api_base_url}{endpoint}"
        
        try:
            response = requests.post(url, json=data, headers=self.get_headers())
            
            if response.status_code in [200, 201]:
                created_entity = response.json()
                logger.info(f"Created {entity_type}: {created_entity.get('id', 'unknown')}")
                
                # Cache entity for future reference resolution
                entity_id = created_entity.get('id')
                if entity_id:
                    # Cache by ID
                    self.entity_cache[f"{entity_type}_id_{entity_id}"] = entity_id
                    
                    # Cache by name if available
                    for name_field in ['name', 'program_name', 'stage_name_roman', 'episode_title', 'full_name', 'email', 'title']:
                        if name_field in created_entity:
                            cache_key = f"{entity_type}_name_{created_entity[name_field]}"
                            self.entity_cache[cache_key] = entity_id
                            break
                    
                    # Also check original row for reference name
                    ref_name = row.get('_ref_name', '')
                    if ref_name:
                        cache_key = f"{entity_type}_name_{ref_name}"
                        self.entity_cache[cache_key] = entity_id
                
                return created_entity
            else:
                logger.error(f"Failed to create {entity_type}: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating {entity_type}: {e}")
            return None

    def seed_sheet(self, sheet_name: str, df: pd.DataFrame) -> int:
        """Seed all data from a single sheet"""
        if df.empty:
            logger.info(f"Sheet '{sheet_name}' is empty, skipping")
            return 0
        
        logger.info(f"Seeding {len(df)} records from sheet '{sheet_name}'")
        created_count = 0
        
        for index, row in df.iterrows():
            # Skip empty rows
            if row.isna().all():
                continue
            
            data = self.prepare_row_data(row, sheet_name)
            if not data:
                logger.warning(f"No valid data in row {index + 1} of sheet '{sheet_name}'")
                continue
            
            entity = self.create_entity(sheet_name, data, row)
            if entity:
                created_count += 1
            
        logger.info(f"Created {created_count} entities from sheet '{sheet_name}'")
        return created_count

    def seed_database(self, excel_file_path: str) -> bool:
        """Main seeding process"""
        logger.info(f"Starting database seeding from {excel_file_path}")
        
        # Authenticate
        if not self.authenticate():
            return False
        
        # Load Excel data
        try:
            excel_data = self.load_excel_data(excel_file_path)
        except Exception as e:
            logger.error(f"Failed to load Excel data: {e}")
            return False
        
        total_created = 0
        
        # Process sheets in dependency order
        for sheet_name in self.seeding_order:
            if sheet_name in excel_data:
                created_count = self.seed_sheet(sheet_name, excel_data[sheet_name])
                total_created += created_count
            else:
                logger.info(f"Sheet '{sheet_name}' not found in Excel file, skipping")
        
        # Process any remaining sheets not in the ordered list
        for sheet_name, df in excel_data.items():
            if sheet_name not in self.seeding_order:
                logger.warning(f"Processing unordered sheet '{sheet_name}'")
                created_count = self.seed_sheet(sheet_name, df)
                total_created += created_count
        
        logger.info(f"Database seeding completed. Total entities created: {total_created}")
        return True


def main():
    parser = argparse.ArgumentParser(description="Seed database from Excel file")
    parser.add_argument("--excel-file", required=True, help="Path to Excel file with seed data")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base URL of the API")
    parser.add_argument("--admin-email", default="admin@kyool.com", help="Admin email for authentication")
    parser.add_argument("--admin-password", default="admin123", help="Admin password for authentication")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Check if Excel file exists
    excel_path = Path(args.excel_file)
    if not excel_path.exists():
        logger.error(f"Excel file not found: {excel_path}")
        sys.exit(1)
    
    # Initialize seeder
    seeder = DatabaseSeeder(
        api_base_url=args.api_url,
        admin_email=args.admin_email,
        admin_password=args.admin_password
    )
    
    # Run seeding
    success = seeder.seed_database(str(excel_path))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()