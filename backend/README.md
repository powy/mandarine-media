# KYOOL Media Platform Backend

A comprehensive FastAPI backend for the Korean media streaming platform, supporting video content, webtoons, and content management with full administrative capabilities.

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Docker and Docker Compose (optional)
- PostgreSQL (production) or SQLite (development)

### Local Development Setup

1. **Environment Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate          # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Database Initialization**
   ```bash
   # Apply migrations
   alembic upgrade head
   
   # Create admin user
   python scripts/create_admin.py
   
   # Seed sample data (optional)
   python scripts/db_seeder.py --file data/test_seed_data.xlsx
   ```

3. **Start Development Server**
   ```bash
   # Using the startup script
   ./start_server.sh
   
   # Or manually
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Docker Development (Alternative)

```bash
# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up --build

# Run migrations in container
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head

# Create admin user in container
docker-compose -f docker-compose.dev.yml exec api python scripts/create_admin.py
```

### API Access

Once running, access:
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Default Admin Credentials
- **Email**: admin@kyool.com
- **Password**: admin123

⚠️ **Important**: Change the admin password after first login!

## 🏗️ Project Structure

```
backend/
├── app/                        # Main application code
│   ├── api/v1/                # API version 1
│   │   ├── endpoints/         # API endpoint handlers
│   │   │   ├── auth.py       # Authentication endpoints
│   │   │   ├── media_descriptions.py  # Media content management
│   │   │   ├── programs.py    # TV shows/movies
│   │   │   ├── seasons.py     # Season management
│   │   │   ├── users.py       # User management
│   │   │   ├── video_files.py # File management
│   │   │   └── ... (15+ endpoint files)
│   │   └── api.py            # API router configuration
│   ├── core/                  # Core functionality
│   │   ├── config.py         # Application configuration
│   │   └── security.py       # Authentication & security
│   ├── crud/                  # Database CRUD operations
│   │   ├── base.py           # Base CRUD class
│   │   └── ... (15+ CRUD modules)
│   ├── db/                    # Database configuration
│   ├── models/                # SQLAlchemy database models
│   │   ├── common.py         # Shared model components
│   │   └── ... (15+ model files)
│   ├── schemas/               # Pydantic request/response schemas
│   │   └── ... (15+ schema files)
│   ├── services/              # Business logic services
│   │   ├── storage/          # File storage backends (S3, Local, Mux)
│   │   └── upload_service.py # File upload handling
│   └── main.py               # FastAPI application entry point
├── alembic/                   # Database migrations
├── data/                      # Sample data and Excel templates
│   ├── seed_data_template.xlsx
│   ├── test_seed_data.xlsx
│   └── excel_structure_guide.xlsx
├── scripts/                   # Utility scripts
│   ├── create_admin.py       # Admin user creation
│   ├── db_seeder.py          # Excel data import
│   ├── create_excel_template.py
│   └── verify_setup.py
├── tests/                     # Comprehensive test suite
│   ├── conftest.py           # Test configuration
│   └── test_*.py             # Test modules (20+ test files)
├── docker-compose.dev.yml     # Development Docker setup
├── requirements.txt           # Python dependencies
└── start_server.sh           # Development server startup script
```

## ✅ Current Features (Production Ready)

### Core Infrastructure
- ✅ FastAPI with automatic OpenAPI documentation
- ✅ SQLAlchemy 2.0 with Alembic migrations
- ✅ PostgreSQL (production) / SQLite (development)
- ✅ JWT authentication with role-based access
- ✅ Docker containerization support
- ✅ Comprehensive testing with pytest

### Content Management
- ✅ Media descriptions with rich metadata
- ✅ Programs and seasons hierarchical structure
- ✅ Category lists and content organization
- ✅ Content lists for featured/curated content
- ✅ Public persons (actors, directors, etc.)
- ✅ Multi-language and territory support
- ✅ Content status workflow (draft, published, archived)

### File Management
- ✅ Multi-backend file storage (Local, S3, Mux)
- ✅ Video file upload and processing
- ✅ Image upload for webtoons and thumbnails
- ✅ File metadata and reporting
- ✅ Storage backend configuration per media type

### Data Management
- ✅ Excel import/export functionality
- ✅ Database seeding with sample data
- ✅ Bulk operations for content management
- ✅ Data validation and error handling

### API Features
- ✅ RESTful API design with consistent patterns
- ✅ Pagination support for large datasets
- ✅ Advanced filtering and search capabilities
- ✅ Request validation with Pydantic
- ✅ Comprehensive error handling
- ✅ CORS support for frontend integration

## 🔗 API Endpoints (Complete)

### Authentication & Users
- `POST /api/v1/auth/login` - JWT authentication
- `GET /api/v1/users/me` - Current user profile
- `POST /api/v1/users/` - Create user (admin)
- `PUT /api/v1/users/{id}` - Update user (admin)
- `GET /api/v1/users/` - List users with pagination

### Content Management
- `GET/POST/PUT/DELETE /api/v1/media-descriptions` - Media content CRUD
- `GET/POST/PUT/DELETE /api/v1/programs` - TV shows/movies CRUD
- `GET/POST/PUT/DELETE /api/v1/seasons` - Season management
- `GET/POST/PUT/DELETE /api/v1/category-lists` - Content categorization
- `GET/POST/PUT/DELETE /api/v1/content-lists` - Curated content lists

### File Operations
- `POST /api/v1/upload/single` - Single file upload
- `POST /api/v1/upload/multiple` - Multiple file upload
- `GET/POST/PUT/DELETE /api/v1/video-files` - Video file management
- `GET /api/v1/upload/backends` - Storage configuration info

### Content Organization
- `GET/POST/PUT/DELETE /api/v1/public-persons` - People management
- `GET/POST/PUT/DELETE /api/v1/pictures` - Image management
- `GET/POST/PUT/DELETE /api/v1/countries` - Geographic data
- `GET/POST/PUT/DELETE /api/v1/languages` - Language support
- `GET/POST/PUT/DELETE /api/v1/territories` - Territory management

### Reporting & Analytics
- `GET/POST/PUT/DELETE /api/v1/description-reports` - Content reports
- `GET/POST/PUT/DELETE /api/v1/video-file-reports` - File reports

### Screen Content
- `GET/POST/PUT/DELETE /api/v1/screen-contents` - UI content management

### Utility Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `GET /api/v1/openapi.json` - OpenAPI specification

## ⚙️ Environment Configuration

### Development Environment

Create `.env` file in the backend directory:

```bash
# Environment Configuration
ENVIRONMENT=development

# Database Configuration (SQLite for development)
DATABASE_URI=sqlite:///./kyool_media.db

# For PostgreSQL production:
# DATABASE_URI=postgresql://user:password@host:5432/kyool_media

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Authentication
SECRET_KEY=your-very-secure-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

# File Upload Configuration
UPLOAD_LOCAL_BASE_PATH=./files
UPLOAD_LOCAL_BASE_URL=http://localhost:8000/files

# AWS S3 (optional)
UPLOAD_S3_BUCKET_NAME=your-s3-bucket
UPLOAD_S3_ACCESS_KEY=your-access-key
UPLOAD_S3_SECRET_KEY=your-secret-key
UPLOAD_S3_REGION=us-east-1

# Mux Video Processing (optional)
UPLOAD_MUX_TOKEN_ID=your-mux-token-id
UPLOAD_MUX_TOKEN_SECRET=your-mux-token-secret
```

### Production Environment

For production deployment, ensure:
- Use PostgreSQL database
- Set secure SECRET_KEY (256-bit)
- Configure proper CORS_ORIGINS
- Set appropriate file storage (S3/Mux)
- Enable HTTPS

## 🧪 Testing

### Run All Tests
```bash
pytest
```

### Run Specific Test Categories
```bash
# Authentication tests
pytest tests/test_auth.py -v

# Media management tests
pytest tests/test_media_descriptions.py -v

# File upload tests
pytest tests/test_upload_endpoints.py -v

# Test with coverage
pytest --cov=app tests/
```

### Test Database
Tests use a separate SQLite database (`test.db`) that's automatically created and cleaned.

## 📊 Database Management

### Migrations
```bash
# Create new migration (after model changes)
alembic revision --autogenerate -m "Add new feature"

# Apply all migrations
alembic upgrade head

# Rollback to previous migration
alembic downgrade -1

# Show current migration status
alembic current

# Show migration history
alembic history --verbose
```

### Data Seeding
```bash
# Create admin user
python scripts/create_admin.py

# Import data from Excel file
python scripts/db_seeder.py --file data/seed_data_template.xlsx

# Create Excel template with sample data
python scripts/create_excel_template.py

# Create minimal test data
python scripts/create_test_data.py
```

### Database Reset (Development Only)
```bash
# ⚠️ WARNING: This will delete all data
rm kyool_media.db
alembic upgrade head
python scripts/create_admin.py
```

## 🐳 Docker Development

### Start Services
```bash
# Start all services (API + PostgreSQL)
docker-compose -f docker-compose.dev.yml up --build

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f api
```

### Container Operations
```bash
# Execute commands in API container
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head
docker-compose -f docker-compose.dev.yml exec api python scripts/create_admin.py
docker-compose -f docker-compose.dev.yml exec api pytest

# Access PostgreSQL
docker-compose -f docker-compose.dev.yml exec db psql -U kyool_user -d kyool_media

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## 🚀 Deployment Commands

### Local Development
```bash
# Direct Python execution
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Using startup script
./start_server.sh
```

### Production Deployment
```bash
# Install dependencies
pip install -r requirements.txt

# Apply migrations
alembic upgrade head

# Start with multiple workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Or with gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## 🔧 Development Tools

### Database Inspection
```bash
# Verify database setup
python scripts/verify_setup.py

# Create sample Excel templates
python scripts/create_excel_template.py
```

### API Testing
- **Interactive Docs**: http://localhost:8000/docs
- **Redoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

### Monitoring
```bash
# Check server status
curl http://localhost:8000/health

# Get API info
curl http://localhost:8000/

# Test authentication
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@kyool.com&password=admin123"
```

## 📝 Logging

Logs are written to:
- `backend.log` - Application logs
- Console output for development

Configure logging levels in `app/core/config.py`

## 🔒 Security Features

- **JWT Authentication** with configurable expiration
- **Role-based Access Control** (admin/user permissions)
- **Input Validation** with Pydantic schemas
- **SQL Injection Protection** via SQLAlchemy ORM
- **CORS Configuration** for frontend integration
- **Environment-based Secrets** management

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database file exists
   ls -la kyool_media.db
   
   # Recreate database
   rm kyool_media.db && alembic upgrade head
   ```

2. **Migration Issues**
   ```bash
   # Reset migrations (development only)
   rm -rf alembic/versions/*.py
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

3. **Import Errors**
   ```bash
   # Ensure virtual environment is activated
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Permission Errors**
   ```bash
   # Make startup script executable
   chmod +x start_server.sh
   ```

### Performance Optimization

- Use PostgreSQL for production
- Implement database connection pooling
- Add database indexes for frequently queried fields
- Use Redis for caching (future enhancement)
- Monitor query performance with logging

---

**Backend Status**: ✅ Production Ready  
**API Version**: v1.0  
**FastAPI Version**: Latest  
**Database**: SQLAlchemy 2.0 with Alembic  
**Last Updated**: August 19, 2025