# Production Database Migration Guide - Clean Slate Approach

## Overview
This guide provides step-by-step instructions for resetting the production database with a clean migration schema. This approach is recommended when you have only test data and the migration chain has become corrupted.

## Prerequisites
- Access to AWS RDS console
- PostgreSQL client tools (psql, pg_dump, pg_restore)
- Access to production server
- Latest code with the new migration file

## Step 1: Backup Current Production Database

### 1.1 Create Database Backup
```bash
# Connect to production server
ssh your-production-server

# Create backup of current database
pg_dump -h your-rds-endpoint.amazonaws.com \
        -U your_username \
        -d kyool_media \
        -f kyool_media_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh kyool_media_backup_*.sql
```

## Step 2: Create New Database in RDS

### 2.1 Via AWS Console
1. Log into AWS RDS Console
2. Select your RDS instance
3. Connect to the instance using psql or a database client
4. Create new database:

```sql
-- Connect to RDS instance
psql -h your-rds-endpoint.amazonaws.com -U master_user -d postgres

-- Create new database
CREATE DATABASE kyool_media_clean;

-- Grant all privileges to your application user
GRANT ALL PRIVILEGES ON DATABASE kyool_media_clean TO your_app_user;

-- Exit psql
\q
```

### 2.2 Rename Old Database for Archive
```sql
-- Connect to RDS instance
psql -h your-rds-endpoint.amazonaws.com -U master_user -d postgres

-- Terminate all connections to the old database
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'kyool_media' AND pid <> pg_backend_pid();

-- Rename old database
ALTER DATABASE kyool_media RENAME TO kyool_media_archive_$(date +%Y%m%d);

-- Rename new database to production name
ALTER DATABASE kyool_media_clean RENAME TO kyool_media;
```

## Step 3: Deploy New Migration

### 3.1 Prepare Migration Files
```bash
# On production server
cd /path/to/your/backend

# Backup old migrations (if not already done)
mkdir -p alembic/migrations_backup_$(date +%Y%m%d)
mv alembic/versions/*.py alembic/migrations_backup_$(date +%Y%m%d)/

# Copy new migration file
# The new migration file is: 44489c7915e3_initial_schema_clean_slate.py
# Make sure this file is in alembic/versions/
```

### 3.2 Update Database Configuration
```bash
# Update your .env or configuration file
DATABASE_URL=postgresql://your_user:your_password@your-rds-endpoint.amazonaws.com/kyool_media
```

### 3.3 Run Migration
```bash
# Navigate to backend directory
cd /path/to/your/backend

# Run the migration
alembic upgrade head

# Verify migration was applied
alembic current
# Should show: 44489c7915e3 (head)
```

## Step 4: Verify Database Schema

### 4.1 Check Tables Created
```sql
-- Connect to new database
psql -h your-rds-endpoint.amazonaws.com -U your_user -d kyool_media

-- List all tables
\dt

-- Expected tables:
-- alembic_version
-- audience_category
-- content_lists
-- countries
-- description_report
-- languages
-- media_description
-- media_description_* (association tables)
-- pictures
-- programs
-- public_person
-- screen_descriptions
-- seasons
-- subscription_plan
-- themes
-- users
-- video_file
-- video_file_reports

-- Check alembic version
SELECT * FROM alembic_version;
-- Should show: 44489c7915e3
```

### 4.2 Test Basic Operations
```bash
# Test API endpoints
curl https://your-api-domain.com/api/v1/media-descriptions
# Should return: [] (empty array)

curl https://your-api-domain.com/docs
# Should load Swagger documentation
```

## Step 5: Restore Test Data (Optional)

If you need to restore some test data:

```bash
# Create a SQL script with only the INSERT statements for test data
# Be careful not to include any schema creation statements

# Apply test data
psql -h your-rds-endpoint.amazonaws.com \
     -U your_user \
     -d kyool_media \
     -f test_data.sql
```

## Step 6: Final Verification

### 6.1 Application Testing
```bash
# Restart application services
sudo systemctl restart your-backend-service

# Check service status
sudo systemctl status your-backend-service

# Check application logs
tail -f /var/log/your-app/backend.log
```

### 6.2 Frontend Testing
- Test web frontend can connect to API
- Test backoffice can perform CRUD operations
- Verify authentication works

## Rollback Procedure (If Needed)

If something goes wrong:

```bash
# 1. Stop application
sudo systemctl stop your-backend-service

# 2. Rename databases back
psql -h your-rds-endpoint.amazonaws.com -U master_user -d postgres
ALTER DATABASE kyool_media RENAME TO kyool_media_failed;
ALTER DATABASE kyool_media_archive_[date] RENAME TO kyool_media;

# 3. Restore old migration files
cd /path/to/your/backend
rm alembic/versions/*.py
mv alembic/migrations_backup_[date]/*.py alembic/versions/

# 4. Restart application
sudo systemctl start your-backend-service
```

## Important Notes

1. **Migration File**: The new clean migration file `44489c7915e3_initial_schema_clean_slate.py` must include the proper imports:
   ```python
   from app.models.common import GUID, JSONArray
   ```

2. **Database Naming**: You can keep multiple database versions in RDS:
   - `kyool_media` - Active production database
   - `kyool_media_archive_20250829` - Archived old database
   - `kyool_media_backup_[date]` - SQL dump files

3. **Connection Strings**: Update all services that connect to the database with the new connection string if the database name changes.

4. **Testing**: Always test this procedure on a staging environment first if available.

## Migration File Location
The new migration file that was generated and tested locally is:
- **File**: `alembic/versions/44489c7915e3_initial_schema_clean_slate.py`
- **Description**: Complete initial schema with all tables and relationships
- **Dependencies**: None (this is the initial migration)

## Contact
If you encounter any issues during migration, ensure you have:
1. Backed up the current database
2. Documented any error messages
3. Access to rollback procedures