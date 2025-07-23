#!/usr/bin/env python3
"""Create a small test Excel file for testing the seeder"""

import pandas as pd
from pathlib import Path

def create_test_data():
    # Test data with just a few entities
    test_data = {
        'languages': [
            {'name': 'Korean', 'sigle': 'ko', '_ref_name': 'Korean'},
            {'name': 'English', 'sigle': 'en', '_ref_name': 'English'}
        ],
        'countries': [
            {'name': 'South Korea', '_ref_name': 'South Korea'},
            {'name': 'United States', '_ref_name': 'United States'}
        ],
        'programs': [
            {
                'program_name': 'Test Show',
                'general_media_description': 'A test TV show for seeding',
                '_ref_name': 'Test Show'
            }
        ],
        'public_persons': [
            {
                'stage_name_roman': 'Test Actor',
                'profession_list': '["Actor"]',
                '_ref_name': 'Test Actor'
            }
        ]
    }
    
    output_path = "/home/powy/code/kyool-media/backend/data/test_seed_data.xlsx"
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        for sheet_name, data in test_data.items():
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"Test data created at: {output_path}")

if __name__ == "__main__":
    create_test_data()