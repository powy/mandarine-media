# Kyool Media Backoffice

## Overview

The Kyool Media Backoffice is a comprehensive admin portal for managing all aspects of the Kyool media platform. Built as part of an Nx monorepo, it provides a professional interface for content management, user administration, and system configuration.

## Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.x
- **Styling**: TailwindCSS with custom components
- **State Management**: React Query for server state
- **Forms**: React Hook Form with validation
- **Routing**: React Router DOM
- **Testing**: Vitest with React Testing Library
- **Monorepo**: Nx workspace with shared packages

### Project Structure
```
apps/backoffice/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Generic components (DataTable, Forms, etc.)
│   │   ├── features/        # Feature-specific components
│   │   ├── forms/           # Form components for data models
│   │   └── layout/          # Layout components (Header, Sidebar, etc.)
│   ├── pages/               # Page components organized by feature
│   │   ├── media/           # Media management pages
│   │   ├── persons/         # Public persons management
│   │   ├── users/           # User management
│   │   ├── programs/        # Programs management
│   │   ├── video-files/     # Video file management
│   │   └── ...              # Other feature pages
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   └── __tests__/           # Test files
└── project.json             # Nx project configuration
```

## Core Features

### 1. Content Management System

#### Media Descriptions Management
- **Comprehensive CRUD Operations**: Create, read, update, and delete media content
- **Advanced Data Table**: Sortable columns, pagination, filtering, and global search
- **Rich Form Interface**: 50+ fields organized in logical sections
- **Field Categories**:
  - Basic Info (title, type, description, duration)
  - Metadata (synopsis, keywords, SEO)
  - Media Assets (thumbnails, trailer URLs)
  - Relationships (categories, persons, subscriptions)
  - Publishing (status, scheduling, visibility)
  - Analytics (view counts, engagement metrics)

#### Video Files Management
- **File Asset Tracking**: Manage video files and their technical specifications
- **Encoding Status Monitoring**: Track video processing and encoding status
- **Technical Specifications**: Codec, resolution, bitrate, and format management
- **Media Linking**: Associate video files with media descriptions
- **CDN Integration**: Content distribution management

#### Program Management
- **Program CRUD Operations**: Manage TV shows, series, and program collections
- **Season Management**: Organize content by seasons and episodes
- **Metadata Management**: Comprehensive program information tracking

### 2. People & User Management

#### Public Persons Management
- **Talent Database**: Manage actors, directors, and other public figures
- **Dual-Language Support**: Korean (Hangul) and Roman name fields
- **Professional Information**: Agency, debut year, profession tracking
- **Biography Management**: Profile descriptions and social media links
- **Advanced Search**: Filter by profession, agency, gender, and status

#### User Management
- **Admin Portal Access**: Manage backoffice user accounts
- **Role-Based Access**: Admin and user role management
- **Authentication**: JWT-based secure authentication
- **User Activity**: Track login history and account status

### 3. System Administration

#### Category Management
- **Audience Categories**: Content rating and classification system
- **Category Lists**: Hierarchical category organization
- **Metadata Management**: Category descriptions and attributes

#### Analytics & Reporting
- **Content Analytics**: View trends, popular content analysis
- **User Engagement**: User interaction metrics
- **System Health**: Performance monitoring and encoding statistics
- **Dashboard Overview**: Key metrics and recent activity feed

## User Interface Design

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo + User Info + Logout                     │
├─────────────────────────────────────────────────────────┤
│                    │                                    │
│   Left Sidebar     │        Main Content Area          │
│     (Menu)         │                                    │
│                    │                                    │
│  📁 Content        │  ┌─────────────────────────────┐   │
│  • Media           │  │                             │   │
│  • Videos          │  │     List View / Form        │   │
│  • Programs        │  │                             │   │
│                    │  └─────────────────────────────┘   │
│  👥 People         │                                    │
│  • Public Persons │                                    │
│  • Users           │                                    │
│                    │                                    │
│  ⚙️ System         │                                    │
│  • Categories      │                                    │
│  • Analytics       │                                    │
└─────────────────────────────────────────────────────────┘
```

### Navigation Menu Structure
- **Content Management**
  - 📺 Media Descriptions
  - 🎬 Video Files
  - 📺 Programs
  - 📊 Content Analytics

- **People & Users**
  - ⭐ Public Persons (Talent)
  - 👤 Users

- **System**
  - 🏷️ Categories
  - 📈 Analytics Dashboard

### Component Architecture

#### Common Components
- **DataTable**: Professional data table with sorting, filtering, pagination
- **FormLayout**: Standardized form container with validation
- **StatusBadge**: Visual status indicators
- **ConfirmDialog**: Confirmation dialogs for destructive actions
- **PageHeader**: Consistent page headers with actions

#### Feature Components
- **MediaList**: Advanced media content listing with filters
- **MediaFilters**: Comprehensive filtering interface
- **BulkDescriptionUpload**: Bulk content upload functionality
- **DescriptionReportsList**: Content reporting interface

## Technical Implementation

### Backend Integration
- **Shared Package**: All API calls centralized in `share` package
- **Authentication**: JWT token-based authentication with auto-refresh
- **Error Handling**: Comprehensive HTTP error handling with user feedback
- **Type Safety**: Full TypeScript integration with backend schemas

### API Endpoints Integration
- **Media Descriptions**: Full CRUD with advanced filtering
- **Video Files**: File management with encoding status tracking
- **Public Persons**: Talent database with dual-language support
- **Users**: User management with role-based access
- **Programs**: Program and season management
- **Categories**: Category and classification management

### Data Management
- **React Query**: Server state management with caching
- **Form Handling**: React Hook Form with validation
- **Real-time Updates**: Optimistic updates with error rollback
- **Pagination**: Efficient large dataset handling

### Quality Assurance

#### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API integration testing
- **E2E Tests**: Critical user flow testing
- **Test Coverage**: Comprehensive test coverage for core features

#### Code Quality
- **TypeScript**: Strict type checking throughout
- **ESLint**: Code style consistency
- **Error Boundaries**: Graceful error handling
- **Loading States**: Professional loading indicators
- **Validation**: Real-time form validation with user feedback

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev:backoffice

# Run tests
npm run test:backoffice

# Build for production
npm run build:backoffice
```

### Environment Configuration
- **Development**: `http://localhost:3001`
- **Backend API**: `http://localhost:8000`
- **Authentication**: JWT token storage in localStorage

### Default Credentials
- **Email**: admin@kyool.com
- **Password**: admin123

## Current Status

### Implemented Features ✅
- Complete authentication system with JWT
- Professional layout with sidebar navigation
- Media Descriptions management (full CRUD)
- Public Persons management (full CRUD)
- User management system
- Programs management
- Category Lists management
- Professional data tables with sorting/filtering
- Comprehensive form components
- Error handling and user feedback
- Responsive design for desktop and tablet

### Production Ready Components ✅
- All core CRUD operations functional
- Professional UI components
- Backend API integration
- Form validation and error handling
- Authentication and security
- Test infrastructure established

### Legacy Components (Need Refactoring) ⚠️
Some sections still use monolithic components and need extraction into the modular architecture:
- Languages management
- Countries management  
- Territories management
- Pictures management
- Description Reports (partially migrated)
- Video File Reports

## Deployment & Operations

### Build Process
- Nx orchestrated build with dependency management
- Optimized Vite build for production
- TypeScript compilation with strict checking
- Asset optimization and code splitting

### Performance Features
- Code splitting by feature
- Lazy loading for large datasets
- Optimistic UI updates
- Efficient caching with React Query
- Virtual scrolling for large tables

### Security Features
- JWT-based authentication
- Role-based access control
- CSRF protection
- Input sanitization
- Secure form handling

## Future Enhancements

### Planned Features
- Advanced analytics dashboard
- Bulk operations interface
- Content scheduling system
- File upload with progress tracking
- Advanced search with suggestions
- Audit trail for all changes
- Real-time notifications
- Export functionality for reports

### Architecture Improvements
- Complete migration from legacy components
- Enhanced caching strategies
- Progressive Web App (PWA) features
- Advanced error boundary implementation
- Performance monitoring integration

---

**Status**: Production Ready - Core features implemented with professional UI/UX
**Maintainers**: Development Team
**Last Updated**: July 2025