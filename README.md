# Kyool Media Platform

A modern Korean media streaming platform with support for videos, webtoons, and other digital content. Built as a full-stack monorepo with multiple client applications and a comprehensive backend API.

## 🏗️ Project Overview

Kyool Media is a complete media platform offering:
- **Video Streaming**: Korean dramas, movies, variety shows, music videos
- **Webtoons**: Digital comics with chapter-based reading
- **Content Management**: Admin tools for content curation and user management
- **Multi-Platform Access**: Web, mobile (React Native), and administrative interfaces

## 📁 Project Structure

```
media_workspace/
├── kyool-media/                    # Main monorepo
│   ├── apps/
│   │   ├── web/                   # Public React web application
│   │   ├── backoffice/            # React Admin dashboard
│   │   ├── alpha/                 # Primary React Native mobile app
│   │   └── mobile/                # Alternative React Native implementation
│   ├── packages/share/            # Shared utilities, API client, types
│   ├── backend/                   # Python FastAPI server
│   └── documents/                 # Technical documentation
├── documents/                     # Project documentation (Aug 2025)
│   ├── kyool_api_usage_guide_20250819.md
│   ├── kyool_backend_code_review_20250819.md
│   ├── kyool_media_developer_guide_20250819.md
│   └── kyool_web_app_code_review_20250819.md
└── 20250815journal/              # Development logs and progress reports
```

## 🚀 Quick Start

### Prerequisites

```bash
# Required versions
node >= 18.0.0
npm >= 8.0.0
python >= 3.12
docker >= 20.0.0
```

### Installation & Setup

1. **Install Dependencies:**
```bash
cd kyool-media
npm install                        # Install all workspace dependencies
```

2. **Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate          # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Database Initialization:**
```bash
cd backend
alembic upgrade head              # Apply database migrations
python scripts/create_admin.py   # Create admin user
python scripts/db_seeder.py --file data/test_seed_data.xlsx  # Seed sample data
```

4. **Start Development Servers:**
```bash
# Terminal 1: Frontend applications
npm run dev                       # Starts all frontend apps

# Terminal 2: Backend API
npm run start:backend            # Starts Python FastAPI server
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web App** | http://localhost:3000 | User registration or admin |
| **Backoffice** | http://localhost:3001 | admin@kyool.com / admin123 |
| **Alpha Mobile** | Metro bundler URLs | Same as web |
| **API Docs** | http://localhost:8000/docs | N/A |
| **API (ReDoc)** | http://localhost:8000/redoc | N/A |

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript across all applications
- **Vite** for fast development and building
- **TanStack React Query** for server state management
- **Tailwind CSS** for styling (web app)
- **React Admin** for backoffice interface
- **React Native** with Expo for mobile applications

### Backend
- **FastAPI** (Python) REST API
- **SQLAlchemy 2.0** ORM with Alembic migrations
- **PostgreSQL** (production) / SQLite (development)
- **JWT Authentication** with role-based access
- **File Storage** (Local, S3, Mux video processing)

### Development Tools
- **NX** monorepo management
- **npm workspaces** for dependency management
- **Docker** for backend containerization
- **pytest/Vitest** for comprehensive testing

## 🎯 Key Features

### Content Management
- **Media Descriptions**: Rich metadata for all content types
- **Programs & Seasons**: Hierarchical content organization
- **Category Lists**: Curated content collections
- **File Uploads**: Support for videos, images, and documents
- **Content Status**: Draft, published, archived, scheduled states

### User Management
- **Authentication**: JWT-based secure login system
- **Role-Based Access**: Admin and regular user permissions
- **User Profiles**: Customizable user information

### Media Support
- **Video Types**: Movies, dramas, variety shows, music videos, trailers
- **Webtoon Support**: Chapter-based image galleries
- **File Processing**: Multiple storage backends (local, S3, Mux)
- **Metadata Management**: Comprehensive content descriptions

### Administrative Tools
- **React Admin Interface**: Full CRUD operations for all content
- **Bulk Operations**: Excel import/export functionality
- **User Management**: Admin controls for user accounts
- **Content Moderation**: Publishing and scheduling controls

## 📚 Available Scripts

### Root Level Commands
```bash
# Development
npm run dev                    # Start all development servers
npm run dev:web               # Start web app only
npm run dev:backoffice        # Start backoffice only
npm run dev:alpha             # Start React Native alpha app
npm run dev:mobile            # Start React Native mobile app

# Building
npm run build                 # Build all applications
npm run build:share           # Build shared package only

# Testing
npm run test                  # Run all tests
npm run test:e2e             # Run end-to-end tests

# Quality & Maintenance
npm run lint                  # Lint all workspaces
npm run type-check           # TypeScript checking
npm run clean                # Clean all build outputs
npm run install:clean        # Fresh install

# Backend
npm run start:backend        # Start FastAPI server
npm run stop:backend         # Stop Docker services
```

### Backend Commands
```bash
cd backend

# Database operations
alembic revision --autogenerate -m "Description"  # Create migration
alembic upgrade head                               # Apply migrations
python scripts/create_admin.py                    # Create admin user
python scripts/db_seeder.py --file data/file.xlsx # Import data

# Testing
pytest                                             # Run backend tests
pytest tests/test_specific.py                     # Run specific tests

# Development
./start_server.sh                                  # Start server directly
python -m uvicorn app.main:app --reload          # Manual server start
```

## 📖 Documentation

The project includes comprehensive documentation added in August 2025:

- **[API Usage Guide](documents/kyool_api_usage_guide_20250819.md)**: Complete API reference with examples
- **[Developer Guide](documents/kyool_media_developer_guide_20250819.md)**: Detailed development workflows
- **[Backend Code Review](documents/kyool_backend_code_review_20250819.md)**: Backend architecture analysis
- **[Web App Code Review](documents/kyool_web_app_code_review_20250819.md)**: Frontend implementation details

### Interactive Documentation
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/api/v1/openapi.json

## 🔧 Development Workflow

### Adding New Features
1. **Backend**: Create model → schema → CRUD → API endpoint
2. **Frontend**: Add API client → React hooks → components → screens
3. **Shared**: Update types and shared utilities
4. **Testing**: Add unit and integration tests

### Database Changes
```bash
cd backend
# Modify models in app/models/
alembic revision --autogenerate -m "Add new field"
alembic upgrade head
# Update schemas in app/schemas/
# Update frontend types in packages/share/src/types/
```

### Environment Configuration

#### Backend (.env)
```bash
ENVIRONMENT=development
SECRET_KEY=your-secret-key
DATABASE_URI=sqlite:///./kyool_media.db
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### Frontend (apps/backoffice/.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest                          # All tests
pytest tests/test_auth.py       # Specific test file
pytest -v                       # Verbose output
pytest --cov=app tests/         # Coverage report
```

### Frontend Testing
```bash
npm run test                     # All workspaces
npm run test:share              # Shared package only
npm run test:backoffice         # Backoffice only
```

### End-to-End Testing
```bash
npm run test:e2e                # Run E2E test suite
```

## 🚀 Deployment

### Production Build
```bash
npm run build                   # Build all frontend apps
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment
```bash
cd backend
docker-compose -f docker-compose.dev.yml up --build
```

## 🛠️ Troubleshooting

### Common Issues

1. **Module not found errors**:
   ```bash
   npm run clean && npm install
   ```

2. **Database issues**:
   ```bash
   cd backend
   alembic downgrade base
   alembic upgrade head
   ```

3. **Authentication problems**:
   - Clear browser localStorage
   - Check token expiration
   - Verify CORS settings

4. **Build failures**:
   ```bash
   npm run type-check
   npm run lint
   ```

### Performance Tips
- Use pagination for large datasets
- Implement proper caching strategies
- Monitor API response times
- Optimize bundle sizes

## 🔐 Security

- JWT-based authentication with configurable expiration
- Role-based access control (admin/user)
- Input validation with Pydantic schemas
- CORS configuration for cross-origin requests
- Environment-based configuration management

## 📊 Recent Updates (August 2025)

- ✅ Comprehensive documentation overhaul
- ✅ Enhanced API endpoints for all content types
- ✅ React Admin backoffice implementation
- ✅ Mobile app authentication system
- ✅ Excel import/export functionality
- ✅ Enhanced file upload system
- ✅ Video processing integration
- ✅ Complete testing coverage

## 🤝 Contributing

1. Follow existing code patterns and conventions
2. Write comprehensive tests for new features
3. Update documentation for significant changes
4. Use TypeScript strictly across all frontend code
5. Follow Python PEP 8 standards for backend code

## 📞 Support

- **API Documentation**: Available at `/docs` when backend is running
- **Development Logs**: Check `20250815journal/` for detailed progress reports
- **Technical Documentation**: Comprehensive guides in `documents/` directory

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: August 19, 2025  
**License**: Private - Kyool Media Platform