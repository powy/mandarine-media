import os
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime
import ast
import re

# Add parent directory to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from app.models import (
    User, Program, MediaDescription, VideoFile, Season, Picture,
    PublicPerson, ContentList, Country, Language, AudienceCategory, 
    ScreenDescription, DescriptionReport, VideoFileReport, SubscriptionPlan
)
from sqlalchemy import inspect, String, Integer, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.common import GUID, JSONArray

def get_field_type(column):
    """Extract human-readable type from SQLAlchemy column"""
    type_str = str(column.type)
    
    if isinstance(column.type, GUID):
        return "UUID/GUID"
    elif isinstance(column.type, JSONArray):
        return "Array/JSON"
    elif "VARCHAR" in type_str or isinstance(column.type, String):
        return "String"
    elif "INTEGER" in type_str or isinstance(column.type, Integer):
        return "Integer"
    elif "BOOLEAN" in type_str or isinstance(column.type, Boolean):
        return "Boolean"
    elif "FLOAT" in type_str or isinstance(column.type, Float):
        return "Float"
    elif "DATETIME" in type_str or isinstance(column.type, DateTime):
        return "DateTime"
    elif "TEXT" in type_str or isinstance(column.type, Text):
        return "Text"
    else:
        return type_str

def get_constraints(column):
    """Extract constraints from column"""
    constraints = []
    
    if column.primary_key:
        constraints.append("Primary Key")
    if column.unique:
        constraints.append("Unique")
    if column.index:
        constraints.append("Indexed")
    if column.foreign_keys:
        for fk in column.foreign_keys:
            constraints.append(f"FK -> {fk.target_fullname}")
    
    return ", ".join(constraints) if constraints else ""

def get_default_value(column):
    """Extract default value from column"""
    if column.default is not None:
        default = column.default
        if hasattr(default, 'arg'):
            arg = default.arg
            if callable(arg):
                return f"Function: {arg.__name__}"
            return str(arg)
    if column.server_default is not None:
        return "Server Default"
    return ""

def extract_model_info(model_class):
    """Extract all field information from a SQLAlchemy model"""
    inspector = inspect(model_class)
    table_name = model_class.__tablename__
    model_name = model_class.__name__
    
    fields = []
    
    for column in inspector.columns:
        field_info = {
            'Model': model_name,
            'Table': table_name,
            'Field Name': column.name,
            'Type': get_field_type(column),
            'Nullable': 'Optional' if column.nullable else 'Mandatory',
            'Default': get_default_value(column),
            'Constraints': get_constraints(column),
            'Comment': ''
        }
        
        # Add special comments for certain fields
        if 'id' in column.name.lower() and column.primary_key:
            field_info['Comment'] = 'Primary key identifier'
        elif 'creation_date' in column.name.lower():
            field_info['Comment'] = 'Record creation timestamp'
        elif 'last_updated' in column.name.lower():
            field_info['Comment'] = 'Last modification timestamp'
        elif '_list' in column.name or isinstance(column.type, JSONArray):
            field_info['Comment'] = 'Array of values stored as JSON'
        elif column.foreign_keys:
            field_info['Comment'] = 'Foreign key reference'
        
        fields.append(field_info)
    
    return fields

def main():
    """Generate Excel file with all model definitions"""
    
    # List of all models to export
    models = [
        User, Program, MediaDescription, VideoFile, Season, Picture,
        PublicPerson, ContentList, Country, Language, AudienceCategory, 
        ScreenDescription, DescriptionReport, VideoFileReport, SubscriptionPlan
    ]
    
    all_fields = []
    
    # Extract information from each model
    for model in models:
        try:
            fields = extract_model_info(model)
            all_fields.extend(fields)
            print(f"Processed {model.__name__}: {len(fields)} fields")
        except Exception as e:
            print(f"Error processing {model.__name__}: {e}")
    
    # Create DataFrame
    df = pd.DataFrame(all_fields)
    
    # Create Excel writer with multiple sheets
    output_file = backend_path / 'data' / f'kyool_models_documentation_{datetime.now().strftime("%Y%m%d")}.xlsx'
    
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # Sheet 1: All fields
        df.to_excel(writer, sheet_name='All Fields', index=False)
        
        # Sheet 2: Summary by model
        summary_data = []
        for model in models:
            model_fields = df[df['Model'] == model.__name__]
            summary_data.append({
                'Model': model.__name__,
                'Table': model.__tablename__,
                'Total Fields': len(model_fields),
                'Mandatory Fields': len(model_fields[model_fields['Nullable'] == 'Mandatory']),
                'Optional Fields': len(model_fields[model_fields['Nullable'] == 'Optional']),
                'Has Foreign Keys': 'Yes' if any('FK' in str(c) for c in model_fields['Constraints']) else 'No'
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Model Summary', index=False)
        
        # Sheet 3-N: One sheet per model
        for model in models:
            model_fields = df[df['Model'] == model.__name__]
            if not model_fields.empty:
                # Remove the Model column for individual sheets (redundant)
                model_fields_clean = model_fields.drop(columns=['Model'])
                model_fields_clean.to_excel(writer, sheet_name=model.__name__[:31], index=False)  # Excel sheet names limited to 31 chars
        
        # Auto-adjust column widths
        for sheet_name in writer.sheets:
            worksheet = writer.sheets[sheet_name]
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
                worksheet.column_dimensions[column_letter].width = adjusted_width
    
    print(f"\nExcel file created successfully: {output_file}")
    print(f"Total models processed: {len(models)}")
    print(f"Total fields documented: {len(all_fields)}")
    
    # Also create a simplified CSV for quick reference
    csv_file = backend_path / 'data' / f'kyool_models_simple_{datetime.now().strftime("%Y%m%d")}.csv'
    df[['Model', 'Field Name', 'Type', 'Nullable', 'Constraints']].to_csv(csv_file, index=False)
    print(f"CSV file created: {csv_file}")

if __name__ == "__main__":
    main()