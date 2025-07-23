# Kyool Media Monorepo

A modern monorepo setup for the Kyool Media platform with proper workspace management.

## Project Structure

```
kyool-media/
├── apps/
│   ├── mobile/                # React Native app
│   ├── web/                   # React.js public app  
│   └── backoffice/            # React.js admin portal
├── packages/
│   └── shared/                # Shared logic, types, backend interfaces
├── backend/                   # Backend server/API (Python - outside workspace)
├── docs/                      # Documentation
├── package.json               # Root package.json with workspace configuration
└── .gitignore                 # Comprehensive ignore rules
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Python 3.12+ (for backend)

### Installation

```bash
# Install all workspace dependencies
npm install

# This will automatically build the shared package
```

### Development

```bash
# Start all frontend development servers
npm run dev

# Start specific workspaces
npm run dev:web          # Web app only
npm run dev:backoffice   # Back-office only  
npm run dev:mobile       # Mobile app only
npm run dev:shared       # Shared package in watch mode
```

### Backend Development

The backend is a Python FastAPI application outside the npm workspace:

```bash
cd backend
source kyoolenv/bin/activate  # Activate Python virtual environment
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Available Scripts

### Root Level Scripts

```bash
# Development
npm run dev              # Start all development servers
npm run dev:web          # Start web app
npm run dev:backoffice   # Start back-office app
npm run dev:mobile       # Start mobile app
npm run dev:shared       # Start shared package in watch mode

# Building
npm run build            # Build all workspaces
npm run build:shared     # Build shared package only

# Testing
npm run test             # Run tests in all workspaces
npm run test:shared      # Run shared package tests
npm run test:backoffice  # Run back-office tests

# Code Quality
npm run lint             # Lint all workspaces
npm run type-check       # Type check all workspaces

# Maintenance
npm run clean            # Clean all build outputs and node_modules
npm run clean:deps       # Clean only node_modules
npm run clean:dist       # Clean only build outputs
npm run install:clean    # Clean and fresh install
```

## Workspace Configuration

### Shared Package (`packages/shared`)

Contains shared logic between all frontend applications:

- **API clients** for backend communication
- **Type definitions** for data models
- **Utility functions** for common operations
- **React hooks** for shared functionality
- **Components** (if any) used across apps

**Key Features:**
- Built with Vite and TypeScript
- Generates both ESM and CommonJS builds
- Peer dependencies for React to avoid version conflicts
- Hot reloading during development

### Applications

#### Web App (`apps/web`)
- React.js public-facing application
- Uses Vite for development and building
- Consumes shared package for backend integration

#### Back-office (`apps/backoffice`)
- React.js admin portal
- Advanced features for content management
- Uses shared package for API communication

#### Mobile App (`apps/mobile`)
- React Native application using Expo
- Cross-platform mobile development
- Shares business logic through shared package

## Dependency Management

### How It Works

1. **Shared Dependencies**: Common dependencies are hoisted to the root level
2. **Workspace Dependencies**: Apps depend on shared package using `"shared": "*"`
3. **Peer Dependencies**: React and related packages are peer dependencies in shared
4. **Automatic Builds**: Shared package builds automatically on install

### Adding Dependencies

```bash
# Add dependency to specific workspace
npm install package-name --workspace=web

# Add dev dependency to root
npm install --save-dev package-name

# Add dependency to shared package
npm install package-name --workspace=shared
```

## Backend Integration

The backend is a separate Python project that provides:

- **FastAPI** REST API
- **SQLAlchemy** database ORM
- **Authentication** with JWT
- **File uploads** and media processing

### API Integration

All backend API calls are centralized in the shared package:

```typescript
// In shared package
import { authApi, mediaApi, usersApi } from 'shared';

// Usage in apps
const user = await authApi.login(credentials);
const media = await mediaApi.getMediaDescriptions();
```

## Development Workflow

### 1. Starting Development

```bash
# Start everything
npm run dev

# Or start specific services
npm run dev:shared &        # Start shared package watch mode
npm run dev:backoffice &    # Start back-office
npm run dev:web             # Start web app
```

### 2. Making Changes

- **Shared Package Changes**: Automatically rebuild and update in consuming apps
- **App Changes**: Standard hot reloading for individual apps
- **Backend Changes**: Restart backend server manually

### 3. Building for Production

```bash
# Build all frontend applications
npm run build

# Builds happen in this order:
# 1. shared package (dependency for apps)
# 2. all apps in parallel
```

## Code Quality

### TypeScript

- All packages use TypeScript
- Shared type definitions in `packages/shared/src/types`
- Strict type checking enabled

### ESLint & Prettier

- Consistent code formatting across all workspaces
- Root-level configuration applied to all packages
- Automatic formatting on save (in most editors)

### Testing

- **Shared Package**: Vitest for unit tests
- **Back-office**: Vitest with React Testing Library
- **Integration**: Tests can import shared package functionality

## Troubleshooting

### Common Issues

1. **Build Failures**: Usually due to TypeScript errors in shared package
   ```bash
   npm run type-check:shared
   ```

2. **Dependency Issues**: Clean install often resolves
   ```bash
   npm run install:clean
   ```

3. **Hot Reloading**: Restart development servers
   ```bash
   npm run dev
   ```

### Performance Tips

- Use `npm run dev:shared` to watch shared package during development
- Build shared package after major changes: `npm run build:shared`
- Clean builds occasionally: `npm run clean && npm install`

## Architecture Benefits

### Single Source of Truth
- One package.json controls all workspace dependencies
- Consistent tooling and versions across all apps
- Centralized scripts and configuration

### Optimized Dependencies
- Dependency hoisting reduces duplicate packages
- Faster installs due to shared node_modules
- Smaller overall disk footprint

### Developer Experience
- Hot reloading across all packages
- Shared package changes immediately available
- Unified development commands

### Scalability
- Easy to add new apps or packages
- Shared business logic prevents duplication
- Consistent patterns across all applications

## Contributing

1. Follow the existing code style and conventions
2. Add tests for new functionality
3. Update documentation for significant changes
4. Use the shared package for cross-app functionality

## Documentation

- **Detailed Implementation**: See `docs/` directory
- **API Documentation**: Available in backend FastAPI docs
- **Component Docs**: In individual package README files

---

**Monorepo Status**: ✅ Optimized and Production Ready