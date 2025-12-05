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
│   │   ├── mobile/                # Alternative React Native implementation
│   │   └── media-uploader/        # CLI tool for media processing and uploads
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

| Service          | URL                         | Credentials                |
| ---------------- | --------------------------- | -------------------------- |
| **Web App**      | http://localhost:3000       | User registration or admin |
| **Backoffice**   | http://localhost:3001       | admin@kyool.com / admin123 |
| **Alpha Mobile** | Metro bundler URLs          | Same as web                |
| **API Docs**     | http://localhost:8000/docs  | N/A                        |
| **API (ReDoc)**  | http://localhost:8000/redoc | N/A                        |

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

### Media Uploader Commands

```bash
# Media processing and upload tool
npm run media-uploader -- [command] [options]  # Run media uploader CLI
npm run media-uploader:help                    # Show detailed help
npm run test:media-uploader                    # Run media uploader tests

# Alternative access methods
nx run media-uploader:start [command]          # Via NX
node apps/media-uploader/src/index.js [command] # Direct execution
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

## 📤 Media Uploader Tool

The `media-uploader` is a powerful CLI tool for processing and uploading media content to various platforms including Mux, S3, and the Kyool backend API. It consolidates five specialized tools into a unified interface.

### Overview

The media uploader provides automated workflows for:

- **File Analysis**: Scan and associate video, subtitle, and image files
- **Video Upload**: Upload videos to Mux streaming platform
- **Subtitle Management**: Upload subtitles to existing Mux assets
- **Image Processing**: Upload pictures to S3 and create backend records
- **Complete Workflows**: End-to-end media processing pipelines

### Installation & Access

The media uploader is integrated into the monorepo and accessible via:

```bash
# Primary method - workspace script
npm run media-uploader -- [command] [options]

# Help and testing
npm run media-uploader:help                # Show complete help
npm run test:media-uploader                # Run tests

# Alternative methods
nx run media-uploader:start [command]      # Via NX
node apps/media-uploader/src/index.js [command] # Direct execution
```

### Available Commands

#### 🔍 **analyze** (Media Analyzer)

Scans directories to find and associate related media files (videos, subtitles, images).

```bash
# Basic usage
npm run media-uploader -- analyze /path/to/media

# Advanced options
npm run media-uploader -- analyze \
  --video-path /videos \
  --subtitle-path /subs \
  --image-path /images \
  --output analysis.json \
  --min-score 75 \
  --verbose
```

**Options:**

- `--video-path <path>`: Specific video folder location
- `--subtitle-path <path>`: Specific subtitle folder location
- `--image-path <path>`: Specific image folder location
- `--output <file>`: Save analysis results to JSON file
- `--min-score <score>`: Minimum association confidence (default: 60)
- `--verbose`: Detailed analysis output
- `--no-metadata`: Skip video metadata reading (faster)
- `--export-for-upload`: Format output for upload workflows

#### 🎥 **mux-upload** (Video Upload)

Uploads video files to Mux streaming platform with comprehensive options.

```bash
# Basic upload
npm run media-uploader -- mux-upload --config video-config.json

# With advanced options
npm run media-uploader -- mux-upload \
  --config video-config.json \
  --timeout 7200 \
  --retry 5 \
  --verbose \
  --progress
```

**Options:**

- `--config <path>`: **Required** - JSON configuration file
- `--debug`: Enable detailed debug logging
- `--timeout <seconds>`: Upload timeout (default: 3600)
- `--retry <count>`: Retry attempts on failure (default: 3)
- `--dry-run`: Validate configuration without uploading
- `--progress`: Show upload progress bar (default: enabled)
- `--no-progress`: Disable progress display
- `--verbose`: Detailed output
- `--quiet`: Errors only

#### 📝 **mux-subtitle-upload** (Subtitle Upload)

Uploads subtitle files to existing Mux video assets via S3 temporary storage.

```bash
# Basic subtitle upload
npm run media-uploader -- mux-subtitle-upload --config subtitle-config.json

# With cleanup options
npm run media-uploader -- mux-subtitle-upload \
  --config subtitle-config.json \
  --cleanup-delay 180 \
  --verbose
```

**Options:**

- `--config <path>`: **Required** - JSON configuration file
- `--debug`: Enable detailed debug logging
- `--retry <count>`: Retry attempts (default: 3)
- `--dry-run`: Validate without uploading
- `--verbose`: Detailed output
- `--quiet`: Errors only
- `--no-cleanup`: Skip S3 cleanup after upload
- `--cleanup-delay <minutes>`: S3 cleanup delay (default: 120)

#### 🖼️ **picture-upload** (Image Upload)

Uploads images to S3 storage and creates corresponding records in the Kyool backend API.

```bash
# Basic picture upload
npm run media-uploader -- picture-upload --config picture-config.json

# With validation
npm run media-uploader -- picture-upload \
  --config picture-config.json \
  --dry-run \
  --verbose
```

**Options:**

- `--config <path>`: **Required** - JSON configuration file
- `--verbose`: Detailed output
- `--dry-run`: Validate configuration without uploading

#### 🚀 **one-media-complete-upload** (Complete Workflow)

Executes a complete media processing workflow from folder analysis to final upload.

```bash
# Complete media processing
npm run media-uploader -- complete-upload \
  --config workflow-config.json \
  --folder /path/to/media

# Validation run
npm run media-uploader -- complete-upload \
  --config workflow-config.json \
  --folder /path/to/media \
  --dry-run \
  --verbose
```

**Options:**

- `--config <path>`: **Required** - JSON workflow configuration
- `--folder <path>`: **Required** - Media folder path
- `--verbose`: Detailed processing output
- `--dry-run`: Validate and scan without processing

### Configuration Files

Each tool requires JSON configuration files with specific structures:

#### Video Upload Configuration

```json
{
  "mux": {
    "token_id": "your-mux-token-id",
    "token_secret": "your-mux-token-secret"
  },
  "videos": [
    {
      "file_path": "/path/to/video.mp4",
      "title": "Video Title",
      "description": "Video description"
    }
  ]
}
```

#### Subtitle Upload Configuration

```json
{
  "mux": {
    "token_id": "your-mux-token-id",
    "token_secret": "your-mux-token-secret"
  },
  "s3": {
    "bucket": "your-s3-bucket",
    "region": "us-east-1"
  },
  "subtitles": [
    {
      "asset_id": "mux-asset-id",
      "file_path": "/path/to/subtitle.srt",
      "language": "en",
      "name": "English"
    }
  ]
}
```

#### Picture Upload Configuration

```json
{
  "s3": {
    "bucket": "your-s3-bucket",
    "region": "us-east-1"
  },
  "api": {
    "base_url": "http://localhost:8000",
    "token": "your-api-token"
  },
  "pictures": [
    {
      "file_path": "/path/to/image.jpg",
      "title": "Image Title",
      "description": "Image description"
    }
  ]
}
```

### Examples

#### Complete Media Processing Workflow

```bash
# 1. Analyze media folder structure
npm run media-uploader -- analyze /content/new-series \
  --output analysis.json \
  --export-for-upload

# 2. Upload videos to Mux
npm run media-uploader -- mux-upload \
  --config video-upload-config.json \
  --verbose

# 3. Upload subtitles to Mux assets
npm run media-uploader -- mux-subtitle-upload \
  --config subtitle-config.json

# 4. Upload promotional images
npm run media-uploader -- picture-upload \
  --config images-config.json

# 5. Or run complete workflow in one command
npm run media-uploader -- complete-upload \
  --config complete-workflow.json \
  --folder /content/new-series
```

#### Batch Processing with Validation

```bash
# Always validate first
npm run media-uploader -- complete-upload \
  --config batch-config.json \
  --folder /media/batch-content \
  --dry-run

# Then process if validation passes
npm run media-uploader -- complete-upload \
  --config batch-config.json \
  --folder /media/batch-content \
  --verbose
```

### Logging and Monitoring

All tools provide comprehensive logging:

- **Console Output**: Real-time progress and status
- **Log Files**: Detailed logs in `apps/media-uploader/logs/`
- **Progress Tracking**: Upload progress bars and percentage completion
- **Error Handling**: Automatic retries with exponential backoff

### Troubleshooting

Common issues and solutions:

1. **Configuration Errors**:

   ```bash
   # Use dry-run to validate configs
   npm run media-uploader -- [command] --config config.json --dry-run
   ```

2. **Upload Failures**:

   ```bash
   # Increase timeout and retries
   npm run media-uploader -- mux-upload \
     --config config.json \
     --timeout 7200 \
     --retry 5
   ```

3. **File Association Issues**:
   ```bash
   # Lower association threshold
   npm run media-uploader -- analyze /path/to/media \
     --min-score 40 \
     --verbose
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

#### Frontend Backoffice (apps/backoffice/.env)

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

#### Frontend (apps/web/.env et apps/web/.env.production)

```bash
VITE_BACKEND_URL=https://api.dev.kyool.fr
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

## 📊 Recent Updates (August-September 2025)

- ✅ Comprehensive documentation overhaul
- ✅ Enhanced API endpoints for all content types
- ✅ React Admin backoffice implementation
- ✅ Mobile app authentication system
- ✅ Excel import/export functionality
- ✅ Enhanced file upload system
- ✅ Video processing integration
- ✅ Complete testing coverage
- ✅ **Media Uploader CLI Tool** - Integrated comprehensive media processing and upload system

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
