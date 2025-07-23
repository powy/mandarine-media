# Media Platform Backend Specification

## Project Overview

A media platform backend for organizing and serving video content (movies, TV shows, short dramas) and web-comics. The platform follows a single-tenant architecture with a focus on scalability, cloud-agnostic design, and efficient content delivery through caching strategies.

## Technology Stack

### Backend Core
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL 
- **ORM:** SQLAlchemy with Alembic migrations
- **Validation:** Pydantic
- **Containerization:** Docker
- **Settings Management:** pydantic-settings

### Cloud Infrastructure (AWS)
- **Compute:** AWS EC2 → AWS Fargate (scalability-based migration)
- **API Gateway:** AWS API Gateway
- **File Storage:** Amazon S3 + Mux (video hosting)
- **Serverless:** AWS Lambda (admin tasks, list generation)

### Authentication & Security
- **Phase 1:** FastAPI OAuth2 + JWT (local development)
- **Phase 2:** External service integration wrapper
- **File Protection:** Encryption + DRM (future requirement)

### Frontend (Reference)
- **Web:** React.js
- **Mobile:** React Native

## Core Data Models

### Media Description
Core metadata for all media content:
- Title, season, episode information
- Author, director, cast details  
- Synopsis, genre, tags
- Release dates, ratings
- Localization fields (multiple languages)

### Media File
Physical file management:
- File location (S3, Mux, local)
- Upload status (pending, processing, ready, failed)
- File type (video, web-comic images)
- Technical metadata (resolution, duration, file size)
- Thumbnail references

### User Management
- **Web Admin:** Full platform management
- **Content Manager:** Media CRUD operations
- **User:** Read-only access with subscription levels
- **Subscription Levels:** Different content access tiers

## API Design

### REST Endpoints (CRUD Operations)
```
Authentication:
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

Media Management (Admin/Content Manager):
GET    /api/media/descriptions
POST   /api/media/descriptions
GET    /api/media/descriptions/{id}
PUT    /api/media/descriptions/{id}
DELETE /api/media/descriptions/{id}

POST   /api/media/files/upload
GET    /api/media/files
POST   /api/media/files/{file_id}/link/{description_id}

Admin Helper Endpoints:
GET    /api/admin/files/unlinked
GET    /api/admin/descriptions/unlinked
```

### JSON Static Content (Cached Lists)
```
Content Discovery (Public):
GET    /cache/categories/{category}.json
GET    /cache/trending/daily.json
GET    /cache/recommendations/{user_id}.json
GET    /cache/featured/homepage.json
```

## Configuration Management

### Environment Files
- `.env.local` - Local development
- `.env.staging` - Staging environment  
- `.env.production` - Production deployment
- `.env.test` - Testing environment

### Required Environment Variables
```bash
# Environment Selection
ENVIRONMENT=local|staging|production|test

# Database
DATABASE_URL=postgresql://user:pass@host:port/db
DATABASE_POOL_SIZE=5

# File Storage
S3_BUCKET_NAME=media-platform-files
S3_REGION=us-east-1
MUX_TOKEN_ID=your_mux_token
MUX_TOKEN_SECRET=your_mux_secret

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Authentication
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# External Services
EXTERNAL_AUTH_SERVICE_URL=https://auth.example.com
```

## Development Phases

### Phase 1: Foundation (MVP)
**Goals:** Basic functionality for content management
- ✅ FastAPI project setup with Docker
- ✅ PostgreSQL database with SQLAlchemy models
- ✅ Local JWT authentication system
- ✅ Basic CRUD operations for media descriptions
- ✅ Simple file upload to local storage/S3
- ✅ Admin interface for content management
- ✅ Basic CORS configuration
- ✅ Environment-based configuration management

### Phase 2: Content Delivery
**Goals:** Efficient content serving and caching
- ✅ JSON static file generation for media lists
- ✅ Category and subcategory organization
- ✅ S3 integration for file storage
- ✅ Basic file linking system
- ✅ Cache invalidation strategies
- ✅ Multi-language content support preparation

### Phase 3: Media Processing
**Goals:** Professional media handling
- ✅ Mux integration for video hosting
- ✅ Background job processing (threads initially)
- ✅ File validation pipeline (basic)
- ✅ Multiple storage backend support
- ✅ Thumbnail management system

### Phase 4: Production Scaling
**Goals:** Production-ready deployment
- ✅ External authentication service integration
- ✅ AWS Lambda for admin tasks
- ✅ Enhanced monitoring and logging
- ✅ Advanced file validation
- ✅ DRM and encryption implementation

## Architecture Decisions

### File Storage Strategy
- **Development:** Local storage + S3 testing
- **Production:** S3 (static files) + Mux (video streaming)
- **Web-comics:** Image sequences stored in S3
- **Thumbnails:** Pre-generated, stored separately

### Caching Strategy
- **Static JSON files** for frequently accessed lists
- **CDN distribution** for global performance
- **Cache invalidation** on content updates
- **Background regeneration** via Lambda functions

### Authentication Flow
```
1. User login → JWT token issued
2. Token validation on protected routes
3. Role-based access control (RBAC)
4. Subscription level enforcement
5. External service integration (Phase 4)
```

### Background Processing
- **Phase 1-3:** Threading for simple tasks
- **Phase 4:** Migration to AWS Lambda/SQS
- **File uploads:** Immediate basic processing
- **Heavy tasks:** Queued for background execution

## Quality Assurance

### Testing Strategy
- **Unit Tests:** Core business logic
- **Integration Tests:** API endpoints
- **Database Tests:** Model relationships and migrations
- **Docker Tests:** Container-based testing environment
- **Environment Isolation:** Separate test database

### Code Quality
- **Type Hints:** Full Python type annotation
- **Pydantic Validation:** Request/response validation
- **Error Handling:** Comprehensive exception management
- **Logging:** Structured logging for debugging
- **Documentation:** Auto-generated API docs via FastAPI

## Deployment Strategy

### Local Development
```bash
# Single command setup
docker-compose up --build

# Automatic migrations and seed data
# CORS enabled for local frontend development
# Hot reload for development efficiency
```

### Cloud Deployment
- **Infrastructure as Code:** Terraform/CloudFormation
- **Container Registry:** AWS ECR
- **Auto-scaling:** Based on CPU/memory metrics
- **Blue-green deployments:** Zero-downtime updates
- **Health checks:** Application and database monitoring

## Future Considerations

### Monitoring & Analytics (Phase 5+)
- User behavior tracking
- Content consumption analytics
- Performance monitoring
- Business intelligence dashboard

### Advanced Features (Phase 6+)
- Content recommendation engine
- Advanced search capabilities
- Multi-tenant architecture option
- Real-time notifications
- Advanced DRM and content protection

## Security Requirements

### Data Protection
- **Database encryption** at rest
- **API rate limiting** to prevent abuse
- **Input validation** for all endpoints
- **File type validation** for uploads
- **HTTPS enforcement** in production

### Access Control
- **Role-based permissions** (Admin, Content Manager, User)
- **Subscription-based content access**
- **JWT token security** with refresh mechanism
- **CORS policy** enforcement
- **API key management** for external services

---

## Quick Start Commands

```bash
# Clone and setup
git clone <repository>
cd media-platform-backend

# Environment setup
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Run tests
docker-compose -f docker-compose.test.yml up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

This specification provides a clear roadmap for both automated development tools and human developers, ensuring consistent implementation across all development phases.