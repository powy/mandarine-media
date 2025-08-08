#!/usr/bin/env python3
"""
Create Excel Template for Database Seeding

This script creates an Excel template with sample data that demonstrates
how to structure data for the database seeding script.
"""

import pandas as pd
from datetime import datetime, timezone
import uuid
from pathlib import Path

def create_sample_data():
    """Create sample data for all entities"""
    
    # Users sheet
    users_data = [
        {
            'email': 'admin@kyool.com',
            'full_name': 'Admin User',
            'is_active': True,
            'is_admin': True,
            '_ref_name': 'admin'  # Reference name for lookups
        },
        {
            'email': 'editor@kyool.com', 
            'full_name': 'Content Editor',
            'is_active': True,
            'is_admin': False,
            '_ref_name': 'editor'
        },
        {
            'email': 'user@kyool.com',
            'full_name': 'Regular User', 
            'is_active': True,
            'is_admin': False,
            '_ref_name': 'user'
        }
    ]

    # Languages sheet
    languages_data = [
        {'name': 'Korean', 'code': 'ko', '_ref_name': 'Korean'},
        {'name': 'English', 'code': 'en', '_ref_name': 'English'},
        {'name': 'Japanese', 'code': 'ja', '_ref_name': 'Japanese'},
        {'name': 'Chinese', 'code': 'zh', '_ref_name': 'Chinese'}
    ]

    # Countries sheet
    countries_data = [
        {'name': 'South Korea', 'code': 'KR', '_ref_name': 'South Korea'},
        {'name': 'United States', 'code': 'US', '_ref_name': 'United States'},
        {'name': 'Japan', 'code': 'JP', '_ref_name': 'Japan'},
        {'name': 'China', 'code': 'CN', '_ref_name': 'China'}
    ]

    # Territories sheet  
    territories_data = [
        {'name': 'Asia Pacific', 'description': 'Asia Pacific region', '_ref_name': 'Asia Pacific'},
        {'name': 'North America', 'description': 'North America region', '_ref_name': 'North America'},
        {'name': 'Europe', 'description': 'European region', '_ref_name': 'Europe'}
    ]

    # Programs sheet
    programs_data = [
        {
            'program_name': 'Squid Game',
            'general_media_description': 'Survival drama series about desperate people competing in deadly children\'s games',
            '_ref_name': 'Squid Game'
        },
        {
            'program_name': 'Kingdom', 
            'general_media_description': 'Historical zombie thriller set in medieval Korea',
            '_ref_name': 'Kingdom'
        },
        {
            'program_name': 'Crash Landing on You',
            'general_media_description': 'Romantic drama about a South Korean heiress who crash lands in North Korea',
            '_ref_name': 'Crash Landing on You'
        }
    ]

    # Public Persons sheet (v1.5 format)
    public_persons_data = [
        {
            'stage_name_roman': 'Lee Jung-jae',
            'first_name_hangul': '이',
            'last_name_hangul': '정재',
            'first_name_roman': 'Jung-jae',
            'last_name_roman': 'Lee',
            'stage_name_hangul': '이정재',
            'profession_list': '["Actor", "Director"]',
            '_ref_name': 'Lee Jung-jae'
        },
        {
            'stage_name_roman': 'Park Hae-soo',
            'first_name_hangul': '박',
            'last_name_hangul': '해수',
            'first_name_roman': 'Hae-soo', 
            'last_name_roman': 'Park',
            'stage_name_hangul': '박해수',
            'profession_list': '["Actor"]',
            '_ref_name': 'Park Hae-soo'
        },
        {
            'stage_name_roman': 'Jung Ho-yeon',
            'first_name_hangul': '정',
            'last_name_hangul': '호연',
            'first_name_roman': 'Ho-yeon',
            'last_name_roman': 'Jung', 
            'stage_name_hangul': '정호연',
            'profession_list': '["Actress", "Model"]',
            '_ref_name': 'Jung Ho-yeon'
        },
        {
            'stage_name_roman': 'Hwang Dong-hyuk',
            'first_name_hangul': '황',
            'last_name_hangul': '동혁',
            'first_name_roman': 'Dong-hyuk',
            'last_name_roman': 'Hwang',
            'stage_name_hangul': '황동혁', 
            'profession_list': '["Director", "Writer"]',
            '_ref_name': 'Hwang Dong-hyuk'
        }
    ]

    # Media Descriptions sheet
    media_descriptions_data = [
        {
            'file_number': 1001,
            'episode_title': 'Red Light, Green Light',
            'media_type': 'video',
            'program_id': 'Squid Game',  # Will be resolved to actual program ID
            'episode_number': 1,
            'descriptive_summary_text': 'Contestants enter the deadly games with the first challenge',
            'synopsis_text': 'Seong Gi-hun and other desperate players enter a mysterious survival game competition',
            'production_year': 2021,
            'duration_seconds': 3600,
            'content_status': 'published',
            'original_language': 'Korean',
            'subtitle_languages_available': '["English", "Japanese", "Chinese"]',
            'audio_languages_available': '["Korean"]',
            'actors_id_list': 'Lee Jung-jae, Park Hae-soo, Jung Ho-yeon',  # Will be resolved to IDs
            'directors_id_list': 'Hwang Dong-hyuk',
            'origin_country_id_list': 'South Korea',
            'original_languages_id': 'Korean',
            'available_countries_list': 'South Korea, United States, Japan',
            'distribution_territories': 'Asia Pacific, North America',
            '_ref_name': 'Squid Game E01'
        },
        {
            'file_number': 1002,
            'episode_title': 'Hell',
            'media_type': 'video', 
            'program_id': 'Squid Game',
            'episode_number': 2,
            'descriptive_summary_text': 'The second game reveals more about the deadly competition',
            'synopsis_text': 'Players face their second challenge as tensions rise',
            'production_year': 2021,
            'duration_seconds': 3540,
            'content_status': 'published',
            'original_language': 'Korean',
            'subtitle_languages_available': '["English", "Japanese", "Chinese"]',
            'audio_languages_available': '["Korean"]',
            'actors_id_list': 'Lee Jung-jae, Park Hae-soo, Jung Ho-yeon',
            'directors_id_list': 'Hwang Dong-hyuk',
            'origin_country_id_list': 'South Korea',
            'original_languages_id': 'Korean',
            'available_countries_list': 'South Korea, United States, Japan',
            'distribution_territories': 'Asia Pacific, North America',
            '_ref_name': 'Squid Game E02'
        }
    ]

    # Video Files sheet
    video_files_data = [
        {
            'file_url': 'https://cdn.kyool.com/squid-game/s01e01.mp4',
            'file_name': 'squid_game_s01e01_1080p.mp4',
            'file_size_bytes': 2147483648,  # 2GB
            'encoding_status': 'completed',
            'video_codec': 'H.264',
            'audio_codec': 'AAC',
            'file_format': 'MP4',
            'upload_method': 'existing_url',
            'upload_status': 'upload_completed',
            'media_description_id': 'Squid Game E01',  # Will be resolved to actual media description ID
            'duration_seconds': 3600,
            'resolution_width': 1920,
            'resolution_height': 1080,
            'bitrate_kbps': 5000,
            'frame_rate': 24.0,
            'aspect_ratio': '16:9',
            'audio_sample_rate': 48000,
            'audio_channels': 2,
            'subtitle_languages_id_list': 'English, Japanese, Chinese',
            'audio_languages_id_list': 'Korean',
            '_ref_name': 'Squid Game E01 Video'
        },
        {
            'file_url': 'https://cdn.kyool.com/squid-game/s01e02.mp4',
            'file_name': 'squid_game_s01e02_1080p.mp4', 
            'file_size_bytes': 2000000000,  # ~1.9GB
            'encoding_status': 'completed',
            'video_codec': 'H.264',
            'audio_codec': 'AAC',
            'file_format': 'MP4',
            'upload_method': 'existing_url',
            'upload_status': 'upload_completed',
            'media_description_id': 'Squid Game E02',
            'duration_seconds': 3540,
            'resolution_width': 1920,
            'resolution_height': 1080,
            'bitrate_kbps': 5000,
            'frame_rate': 24.0,
            'aspect_ratio': '16:9',
            'audio_sample_rate': 48000,
            'audio_channels': 2,
            'subtitle_languages_id_list': 'English, Japanese, Chinese',
            'audio_languages_id_list': 'Korean',
            '_ref_name': 'Squid Game E02 Video'
        }
    ]

    # Content Lists sheet (NEW in API 1.6)
    content_lists_data = [
        {
            'title': 'Trending K-Dramas',
            'thumbnail_format': 'large_landscape',
            'is_active': True,
            'display_order': 1,
            'description': 'Most popular Korean drama series this month',
            'content_items': 'Squid Game, Kingdom, Crash Landing on You',  # Mixed content references
            'content_types': '["program", "program", "program"]',  # Corresponding types
            '_ref_name': 'Trending K-Dramas'
        },
        {
            'title': 'Top Episodes This Week',
            'thumbnail_format': 'medium_portrait',
            'is_active': True,
            'display_order': 2,
            'description': 'Most watched episodes from the past week',
            'content_items': 'Squid Game E01, Squid Game E02',  # Episode references
            'content_types': '["media_description", "media_description"]',
            '_ref_name': 'Top Episodes'
        },
        {
            'title': 'Featured Content',
            'thumbnail_format': 'small_square',
            'is_active': True,
            'display_order': 3,
            'description': 'Curated selection of featured content',
            'content_items': 'Squid Game, Squid Game E01',  # Mixed program and episode
            'content_types': '["program", "media_description"]',
            '_ref_name': 'Featured Content'
        }
    ]

    # Screen Contents sheet (NEW in API 1.6)
    screen_contents_data = [
        {
            'title': 'Homepage Layout',
            'is_active': True,
            'display_order': 1,
            'description': 'Main homepage screen layout with trending content',
            'content_lists': 'Trending K-Dramas, Top Episodes',  # References to content lists
            'screen_type': 'homepage',
            '_ref_name': 'Homepage'
        },
        {
            'title': 'Drama Category Page',
            'is_active': True,
            'display_order': 2,
            'description': 'Drama category page showing featured and trending dramas',
            'content_lists': 'Featured Content, Trending K-Dramas',
            'screen_type': 'category',
            '_ref_name': 'Drama Category'
        },
        {
            'title': 'Search Results Layout',
            'is_active': True,
            'display_order': 3,
            'description': 'Layout for search results pages',
            'content_lists': 'Top Episodes',
            'screen_type': 'search',
            '_ref_name': 'Search Results'
        }
    ]

    return {
        'users': users_data,
        'languages': languages_data,
        'countries': countries_data,
        'territories': territories_data,
        'programs': programs_data,
        'public_persons': public_persons_data,
        'media_descriptions': media_descriptions_data,
        'video_files': video_files_data,
        'content_lists': content_lists_data,
        'screen_contents': screen_contents_data
    }

def create_excel_template(output_path: str):
    """Create Excel file with sample data"""
    
    sample_data = create_sample_data()
    
    # Create Excel writer
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        
        # Write each sheet
        for sheet_name, data in sample_data.items():
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Get the worksheet to format it
            worksheet = writer.sheets[sheet_name]
            
            # Auto-adjust column widths
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
                worksheet.column_dimensions[column].width = adjusted_width

    print(f"Excel template created at: {output_path}")
    print(f"Sheets included: {list(sample_data.keys())}")

def create_instructions_sheet():
    """Create a documentation sheet explaining the Excel structure"""
    
    instructions_data = [
        {
            'Sheet Name': 'users',
            'Description': 'User accounts for the system',
            'Key Fields': 'email (required), full_name, is_admin',
            'Reference Field': '_ref_name',
            'Notes': 'Create admin users first'
        },
        {
            'Sheet Name': 'languages',
            'Description': 'Language definitions',
            'Key Fields': 'name (required), code',
            'Reference Field': '_ref_name',
            'Notes': 'Referenced by media content'
        },
        {
            'Sheet Name': 'countries',
            'Description': 'Country definitions',
            'Key Fields': 'name (required), code',
            'Reference Field': '_ref_name', 
            'Notes': 'Referenced by territories and content'
        },
        {
            'Sheet Name': 'territories',
            'Description': 'Geographic regions for distribution',
            'Key Fields': 'name (required), description',
            'Reference Field': '_ref_name',
            'Notes': 'Used for content distribution rights'
        },
        {
            'Sheet Name': 'programs',
            'Description': 'TV shows or program series',
            'Key Fields': 'program_name (required), general_media_description',
            'Reference Field': '_ref_name',
            'Notes': 'Parent entity for seasons and episodes'
        },
        {
            'Sheet Name': 'public_persons',
            'Description': 'Actors, directors, and other public figures (v1.5)',
            'Key Fields': 'stage_name_roman (required), profession_list',
            'Reference Field': '_ref_name',
            'Notes': 'Only stage_name_roman is required in v1.5. Use JSON arrays for lists.'
        },
        {
            'Sheet Name': 'media_descriptions',
            'Description': 'Episodes and media content metadata',
            'Key Fields': 'file_number (required), episode_title (required), media_type (required)',
            'Reference Field': '_ref_name',
            'Notes': 'Links to programs and persons via reference names'
        },
        {
            'Sheet Name': 'video_files',
            'Description': 'Video file technical information',
            'Key Fields': 'file_url, encoding_status, upload_method',
            'Reference Field': '_ref_name',
            'Notes': 'Links to media_descriptions'
        },
        {
            'Sheet Name': 'content_lists',
            'Description': 'Flexible content organization lists (NEW in API 1.6)',
            'Key Fields': 'title (required), thumbnail_format (required), content_items, content_types',
            'Reference Field': '_ref_name',
            'Notes': 'Can mix programs, seasons, and media descriptions. thumbnail_format must be: small_square, medium_portrait, large_landscape, or vertical_mobile'
        },
        {
            'Sheet Name': 'screen_contents',
            'Description': 'Complete screen layout management (NEW in API 1.6)',
            'Key Fields': 'title (required), content_lists, screen_type',
            'Reference Field': '_ref_name',
            'Notes': 'Organizes content lists into screen layouts. References content_lists by name.'
        }
    ]
    
    return instructions_data

def main():
    # Create directories
    output_dir = Path("./data")
    output_dir.mkdir(exist_ok=True)
    
    # Create the main template
    template_path = output_dir / "seed_data_template.xlsx"
    create_excel_template(str(template_path))
    
    # Create instructions file
    instructions_path = output_dir / "excel_structure_guide.xlsx"
    instructions_data = create_instructions_sheet()
    
    with pd.ExcelWriter(str(instructions_path), engine='openpyxl') as writer:
        df = pd.DataFrame(instructions_data)
        df.to_excel(writer, sheet_name='Instructions', index=False)
        
        # Format the instructions sheet
        worksheet = writer.sheets['Instructions']
        for col in worksheet.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 80)
            worksheet.column_dimensions[column].width = adjusted_width
    
    print(f"Instructions created at: {instructions_path}")
    print("\n=== USAGE INSTRUCTIONS ===")
    print("1. Edit the Excel template with your actual data")
    print("2. Use _ref_name columns to create named references")
    print("3. Reference other entities by their _ref_name values")
    print("4. Use comma-separated lists for multiple references")
    print("5. Run the seeder script:")
    print(f"   python scripts/db_seeder.py --excel-file {template_path}")

if __name__ == "__main__":
    main()