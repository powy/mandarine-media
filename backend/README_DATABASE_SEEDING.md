# Database Seeding with Excel Files

This directory contains a comprehensive database seeding system that allows you to populate your Kyool Media database from Excel files. This is perfect for manual testing, importing sample data, or migrating content from external sources.

## 🚀 Quick Start

1. **Prepare your data in Excel format:**
   ```bash
   # Use the provided template
   cp data/seed_data_template.xlsx data/my_content.xlsx
   # Edit my_content.xlsx with your actual data
   ```

2. **Run the seeder:**
   ```bash
   source kyoolenv/bin/activate
   python scripts/db_seeder.py --excel-file data/my_content.xlsx
   ```

3. **Verify results in the backoffice:**
   - Open http://localhost:3001
   - Login with admin@kyool.com / admin123
   - Browse your imported content

## 📁 Files Overview

### Core Scripts
- **`scripts/db_seeder.py`** - Main seeding script that reads Excel and populates DB via API
- **`scripts/create_excel_template.py`** - Creates sample Excel template with example data
- **`scripts/create_test_data.py`** - Creates minimal test data for validation

### Data Files
- **`data/seed_data_template.xlsx`** - Complete Excel template with sample Korean drama content
- **`data/excel_structure_guide.xlsx`** - Documentation explaining Excel structure
- **`data/test_seed_data.xlsx`** - Minimal test data for script validation

## 📊 Excel Structure

### Sheet Organization
Each Excel sheet corresponds to a database table. Process in this order for dependencies:

1. **Basic Data**: `languages`, `countries`, `territories`, `pictures`
2. **Content Structure**: `programs`, `seasons`, `category_lists`
3. **People**: `public_persons`, `users`
4. **Content**: `media_descriptions`, `video_files`
5. **Reports**: `description_reports`, `video_file_reports`

### Key Concepts

#### 🏷️ Reference Names (`_ref_name`)
Use the special `_ref_name` column to create named references:
```excel
Sheet: programs
program_name          | general_media_description     | _ref_name
Squid Game           | Korean survival drama         | Squid Game

Sheet: media_descriptions  
episode_title        | program_id    | _ref_name
Red Light Green Light| Squid Game    | Episode 1
```

#### 🔗 Entity References
Reference other entities by their `_ref_name` values:
- **Single reference**: `program_id: "Squid Game"`
- **Multiple references**: `actors_id_list: "Lee Jung-jae, Park Hae-soo"`
- **JSON arrays**: `profession_list: ["Actor", "Director"]`

#### 📝 Field Types
- **Required fields**: Cannot be empty (marked in template)
- **Optional fields**: Can be left blank
- **JSON arrays**: Use JSON format: `["item1", "item2"]` or comma-separated: `item1, item2`
- **Dates**: Use ISO format: `2021-10-15T00:00:00Z` or Excel date format

## 🎯 Usage Examples

### Basic Language Setup
```excel
Sheet: languages
name     | sigle | _ref_name
Korean   | ko    | Korean
English  | en    | English
Japanese | ja    | Japanese
```

### Public Persons (v1.5 Format)
```excel
Sheet: public_persons
stage_name_roman | profession_list    | _ref_name
Lee Jung-jae     | ["Actor"]          | Lee Jung-jae
Hwang Dong-hyuk  | ["Director"]       | Hwang Director
```

### Media Content with Relationships
```excel
Sheet: media_descriptions
file_number | episode_title      | program_id  | actors_id_list           | _ref_name
1001        | Red Light Green    | Squid Game  | Lee Jung-jae, Park Hae-soo | Episode 1
1002        | Hell               | Squid Game  | Lee Jung-jae             | Episode 2
```

## 🛠️ Advanced Usage

### Command Line Options
```bash
# Basic usage
python scripts/db_seeder.py --excel-file data/content.xlsx

# With custom API URL
python scripts/db_seeder.py --excel-file data/content.xlsx --api-url http://localhost:8000

# With custom admin credentials
python scripts/db_seeder.py --excel-file data/content.xlsx --admin-email user@company.com --admin-password secret123

# Verbose logging for debugging
python scripts/db_seeder.py --excel-file data/content.xlsx --verbose
```

### Entity Relationship Resolution
The seeder automatically resolves references:

1. **By UUID**: If you provide a valid UUID, it's used directly
2. **By Name**: References are looked up in the entity cache by `_ref_name`
3. **JSON Arrays**: Automatically parsed from JSON strings or comma-separated values
4. **Lists of References**: Multiple entity references separated by commas

### Error Handling
- **Authentication Errors**: Check admin credentials
- **Schema Errors**: Verify required fields are present and correctly named
- **Reference Errors**: Ensure referenced entities exist or are created first
- **API Errors**: Check that the backend server is running

## 📋 Sheet Specifications

### Users Sheet
```excel
email               | full_name      | is_admin | _ref_name
admin@kyool.com     | Admin User     | true     | admin
editor@kyool.com    | Content Editor | false    | editor
```

### Programs Sheet
```excel
program_name | general_media_description                    | _ref_name
Squid Game   | Korean survival drama about deadly games     | Squid Game
Kingdom      | Historical zombie thriller set in Korea     | Kingdom
```

### Public Persons Sheet (v1.5)
```excel
stage_name_roman | first_name_roman | last_name_roman | profession_list | _ref_name
Lee Jung-jae     | Jung-jae         | Lee             | ["Actor"]       | Lee Jung-jae
Hwang Dong-hyuk  | Dong-hyuk        | Hwang           | ["Director"]    | Hwang Director
```

### Media Descriptions Sheet
```excel
file_number | episode_title | media_type | program_id | actors_id_list | directors_id_list | _ref_name
1001        | Episode 1     | video      | Squid Game | Lee Jung-jae   | Hwang Director    | SG E01
1002        | Episode 2     | video      | Squid Game | Lee Jung-jae   | Hwang Director    | SG E02
```

### Video Files Sheet
```excel
file_url                          | file_name           | encoding_status | media_description_id | _ref_name
https://cdn.example.com/sg01.mp4  | squid_game_e01.mp4 | completed       | SG E01               | SG E01 Video
https://cdn.example.com/sg02.mp4  | squid_game_e02.mp4 | completed       | SG E02               | SG E02 Video
```

## 🔧 Technical Details

### API Integration
- Uses FastAPI REST endpoints for all CRUD operations
- Authenticates with admin credentials via JWT tokens
- Respects API validation rules and schemas
- Handles rate limiting and error responses

### Dependency Management
- Processes entities in the correct order to handle foreign key relationships
- Caches created entities to resolve references
- Validates data against API schemas before submission
- Provides detailed logging for troubleshooting

### Performance
- Processes entities sequentially to ensure data consistency
- Caches entity mappings for efficient reference resolution
- Provides progress feedback during large imports
- Handles API errors gracefully without stopping the entire process

## 🐛 Troubleshooting

### Common Issues

1. **"Field required" errors**
   - Check that all required fields are present in your Excel sheet
   - Verify field names match exactly (case-sensitive)
   - For v1.5 public persons, only `stage_name_roman` is required

2. **"Could not resolve reference" warnings**
   - Ensure referenced entities exist in earlier sheets
   - Check `_ref_name` values match exactly
   - Verify dependency order (languages before media content, etc.)

3. **Authentication failures**
   - Verify admin credentials are correct
   - Check that the API server is running on the specified URL
   - Ensure the admin user exists in the database

4. **500 Internal Server Errors**
   - Check backend server logs for detailed error information
   - Verify database is properly initialized
   - Check for data type mismatches

### Debug Mode
```bash
# Enable verbose logging to see detailed API interactions
python scripts/db_seeder.py --excel-file data/content.xlsx --verbose
```

### Validation
```bash
# Test with minimal data first
python scripts/create_test_data.py
python scripts/db_seeder.py --excel-file data/test_seed_data.xlsx --verbose
```

## 🎉 Success Stories

After running the seeder successfully, you should see:
- Languages, countries, and territories populated
- TV programs and seasons created
- Public persons (actors, directors) added
- Media descriptions with proper relationships
- Video files linked to content
- All entities accessible via the backoffice at http://localhost:3001

## 📞 Support

For issues or questions:
1. Check the `--verbose` output for detailed error messages
2. Verify your Excel structure against the provided templates
3. Test with the minimal test data first
4. Check backend server logs for API errors
5. Review the API documentation for schema requirements

The seeding system is designed to handle real-world content management scenarios while providing clear feedback for any issues that arise during the import process.