# KYOOL Media Platform Backend

A media platform backend for organizing and serving video content and web-comics, built with FastAPI, PostgreSQL, and Docker.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development)

### Development Setup

1. **Clone and setup**
   ```bash
   cd kyool-media-server
   ```

2. **Start the development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Initialize the database**
   
   In a new terminal, run migrations:
   ```bash
   # Create initial migration
   docker-compose -f docker-compose.dev.yml exec api alembic revision --autogenerate -m "Initial migration"
   
   # Apply migrations
   docker-compose -f docker-compose.dev.yml exec api alembic upgrade head
   ```

4. **Create admin user**
   ```bash
   docker-compose -f docker-compose.dev.yml exec api python scripts/create_admin.py
   ```

### Testing

Run tests:
```bash
docker-compose -f docker-compose.dev.yml exec api pytest
```

### API Documentation

Once the server is running, visit:
- API Documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Default Admin Credentials
- Email: admin@kyool.com
- Password: admin123

**Important:** Change the admin password after first login!

## Project Structure

```
kyool-media-server/
├── app/                    # Application code
│   ├── api/               # API routes
│   ├── core/              # Core functionality (config, security)
│   ├── crud/              # Database operations
│   ├── db/                # Database setup
│   ├── models/            # SQLAlchemy models
│   └── schemas/           # Pydantic schemas
├── alembic/               # Database migrations
├── scripts/               # Utility scripts
├── tests/                 # Test files
├── docker-compose.dev.yml # Development docker setup
└── requirements.txt       # Python dependencies
```

## Current Features (Step 1)

- ✅ FastAPI project setup with Docker
- ✅ PostgreSQL database with SQLAlchemy
- ✅ JWT authentication system
- ✅ User model with CRUD operations
- ✅ Admin user management
- ✅ Environment-based configuration
- ✅ Unit testing framework
- ✅ API documentation (Swagger/ReDoc)
- ✅ Docker development environment

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login

### Users
- `GET /api/v1/users/me` - Get current user info
- `POST /api/v1/users/` - Create user (admin only)
- `PUT /api/v1/users/{user_id}` - Update user (admin only)
- `GET /api/v1/users/{user_id}` - Get user by ID (admin only)

### Utility
- `GET /` - API info
- `GET /health` - Health check

## Environment Variables

Create `.env.local` file:

```bash
# Environment Configuration
ENVIRONMENT=local

# Database Configuration
POSTGRES_SERVER=localhost
POSTGRES_USER=kyool_user
POSTGRES_PASSWORD=kyool_password
POSTGRES_DB=kyool_media

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Authentication
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256
```

## Next Steps (Step 2+)

- Media Description model and CRUD operations
- File upload functionality
- Video file processing
- S3 integration
- Enhanced API endpoints per specification

## Development Commands

```bash
# Start development server
docker-compose -f docker-compose.dev.yml up

# Run tests
docker-compose -f docker-compose.dev.yml exec api pytest

# Create migration
docker-compose -f docker-compose.dev.yml exec api alembic revision --autogenerate -m "Description"

# Apply migrations
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head

# Create admin user
docker-compose -f docker-compose.dev.yml exec api python scripts/create_admin.py

# Access database
docker-compose -f docker-compose.dev.yml exec db psql -U kyool_user -d kyool_media
```