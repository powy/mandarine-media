# KYOOL Media Platform API Usage Guide
**Date:** August 19, 2025  
**Version:** API v1.0  
**Base URL:** `http://localhost:8000/api/v1`

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [TypeScript Share Package](#typescript-share-package)
4. [React Hooks Integration](#react-hooks-integration)
5. [Core Endpoints](#core-endpoints)
6. [Media Management](#media-management)
7. [File Upload System](#file-upload-system)
8. [Content Organization](#content-organization)
9. [Utilities and Helpers](#utilities-and-helpers)
10. [Code Examples](#code-examples)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)

## Getting Started

### Prerequisites
- Backend server running on `http://localhost:8000`
- Valid user account with appropriate permissions
- HTTP client (curl, Postman, or programming language HTTP library)

### API Base Information
```
Base URL: http://localhost:8000/api/v1
Content-Type: application/json
Authentication: Bearer Token (JWT)
```

### Health Check
```bash
curl -X GET "http://localhost:8000/health"
# Response: {"status": "healthy"}
```

## Authentication

### 1. Login to Get Access Token
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@kyool.com&password=admin123"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Using the Access Token
Include the token in all subsequent requests:
```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer your_access_token_here"
```

### 3. Token Expiration
- Default expiration: 30 minutes
- Get a new token when current one expires
- No refresh token mechanism (re-login required)

## TypeScript Share Package

The KYOOL Media platform provides a comprehensive TypeScript library (`share` package) that centralizes all API communication and provides React hooks, utilities, and types for both React.js and React Native applications.

### Installation and Setup

The package is managed by NX and installed automatically as a local dependency.

```typescript
import { initApiClient } from 'share';

// Required configuration at application startup
initApiClient({
  baseURL: 'http://localhost:8000', // Your API server URL
  onAuthError: () => {
    // Handle authentication errors
    // Redirect to login, for example
  }
});
```

### Optional Storage Configuration

```typescript
import { initStorage } from 'share';

// For React Native with AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
initStorage(AsyncStorage);

// For React.js, uses localStorage by default
```

### API Modules Overview

The share package contains **14 API modules** with **80+ functions** covering:

- **Authentication** (`authApi`): Login/logout, user management
- **Media** (`mediaApi`): Media descriptions, video files, popular content
- **Programs** (`programsApi`): Program management
- **Seasons** (`seasonsApi`): Season management
- **Countries** (`countriesApi`): Country data
- **Territories** (`territoriesApi`): Territory management
- **Languages** (`languagesApi`): Language support
- **Pictures** (`picturesApi`): Image management
- **Persons** (`personsApi`): Celebrity/person profiles
- **Category Lists** (`categoryListsApi`): Content categorization
- **Content Lists** (`contentListsApi`): Content organization
- **Video File Reports** (`videoFileReportsApi`): Upload/processing reports

### Basic API Usage Examples

```typescript
import { authApi, mediaApi, programsApi } from 'share';

// Authentication
const tokens = await authApi.login({ 
  email: 'user@example.com', 
  password: 'password' 
});

// Check authentication status
const isAuth = await authApi.isAuthenticated();
const user = await authApi.getCurrentUser();

// Media operations
const mediaList = await mediaApi.getMediaDescriptions({
  skip: 0,
  limit: 20,
  media_type: 'video',
  is_featured: true
});

// Create new media description
const newMedia = await mediaApi.createMediaDescription({
  file_number: 1,
  episode_title: 'Episode 1',
  media_type: 'video',
  description: 'Episode description...'
});

// Program management
const programs = await programsApi.getAll({ skip: 0, limit: 20 });
const program = await programsApi.create({
  program_name: 'New Program',
  general_media_description: 'Program description...'
});
```

## React Hooks Integration

The share package provides **5 specialized React hooks** for seamless integration:

### 1. useAuth - Authentication Management

```typescript
import { useAuth } from 'share';

function LoginComponent() {
  const { 
    user,           // Current user or null
    isAuthenticated, // Authentication status
    isLoadingUser,   // Loading state
    isLoggingIn,     // Login in progress
    login,           // Login function
    logout,          // Logout function
    loginError       // Login error
  } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
    } catch (error) {
      console.error('Login error:', loginError);
    }
  };

  if (isLoadingUser) return <div>Loading...</div>;
  
  return (
    <div>
      {isAuthenticated ? (
        <div>
          Hello {user?.full_name}!
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin} disabled={isLoggingIn}>
          {isLoggingIn ? 'Logging in...' : 'Login'}
        </button>
      )}
    </div>
  );
}
```

### 2. useBulkDescriptions - Excel Import

```typescript
import { useBulkDescriptions } from 'share';

function BulkUploadComponent() {
  const {
    parseExcelFile,        // Parse Excel file
    createBulkDescriptions, // Create descriptions in bulk
    generateTemplate,       // Generate Excel template
    loading,               // Loading state
    error,                 // Error state
    lastResult             // Last operation result
  } = useBulkDescriptions();

  const handleFileUpload = async (file: File) => {
    try {
      // 1. Parse the file
      const parseResult = await parseExcelFile(file);
      
      if (parseResult.errors.length > 0) {
        console.warn('Parse errors:', parseResult.errors);
      }

      // 2. Create descriptions
      const bulkResult = await createBulkDescriptions(parseResult.data);
      console.log(`${bulkResult.created_count} descriptions created`);
    } catch (err) {
      console.error('Error:', error);
    }
  };

  const downloadTemplate = () => {
    const template = generateTemplate();
    const url = URL.createObjectURL(template);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_media_descriptions.xlsx';
    link.click();
  };

  return (
    <div>
      <button onClick={downloadTemplate}>
        Download Excel Template
      </button>
      
      <input 
        type="file" 
        accept=".xlsx,.xls,.csv"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
      />
      
      {loading && <p>Processing...</p>}
      {error && <p>Error: {error}</p>}
      
      {lastResult && (
        <div>
          <p>✅ {lastResult.created_count} created</p>
          <p>❌ {lastResult.failed_count} failed</p>
        </div>
      )}
    </div>
  );
}
```

### 3. useVideoUpload - Video Upload with Progress

```typescript
import { useVideoUpload } from 'share';

function VideoUploadComponent() {
  const {
    state,    // Complete state { isUploading, progress, error, videoFile }
    upload,   // Upload function
    reset     // Reset state
  } = useVideoUpload();

  const handleUpload = async (file: File, mediaId?: string) => {
    await upload({
      file,
      media_description_id: mediaId,
      upload_method: 'new_upload'
    });
  };

  return (
    <div>
      <input 
        type="file" 
        accept="video/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={state.isUploading}
      />
      
      {state.isUploading && (
        <div>
          <p>Upload in progress... {Math.round(state.progress)}%</p>
          <progress value={state.progress} max={100} />
        </div>
      )}
      
      {state.error && (
        <p style={{color: 'red'}}>Error: {state.error}</p>
      )}
      
      {state.videoFile && (
        <p style={{color: 'green'}}>
          ✅ File uploaded: {state.videoFile.file_name}
        </p>
      )}
      
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### 4. useDescriptionReports - Reports with Pagination

```typescript
import { useDescriptionReports } from 'share';

function ReportsComponent() {
  const {
    reports,     // List of reports
    loading,     // Loading state
    error,       // Error state
    pagination,  // Pagination info
    refresh,     // Refresh function
    loadPage     // Load specific page
  } = useDescriptionReports({
    limit: 10,
    autoRefresh: true,
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      
      <div>
        {reports.map(report => (
          <div key={report.id}>
            <h3>{report.title}</h3>
            <p>Success: {report.success_associated_file ? '✅' : '❌'}</p>
            <small>{report.timestamp}</small>
          </div>
        ))}
      </div>
      
      <div>
        Page {pagination.page} of {pagination.total_pages}
        <button 
          onClick={() => loadPage(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          Previous
        </button>
        <button 
          onClick={() => loadPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.total_pages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### 5. useVideoPlayback - Video Playback Testing

```typescript
import { useVideoPlayback } from 'share';

function VideoTestComponent({ videoFileId }: { videoFileId: string }) {
  const {
    state,         // State { isLoading, result, error }
    testPlayback,  // Test function
    reset          // Reset state
  } = useVideoPlayback();

  return (
    <div>
      <button 
        onClick={() => testPlayback(videoFileId)}
        disabled={state.isLoading}
      >
        {state.isLoading ? 'Testing...' : 'Test Playback'}
      </button>
      
      {state.result && (
        <div>
          {state.result.success ? (
            <div>
              ✅ Playback available
              {state.result.playback_url && (
                <a href={state.result.playback_url} target="_blank">
                  Watch Video
                </a>
              )}
            </div>
          ) : (
            <p>❌ Failed: {state.result.error_message}</p>
          )}
        </div>
      )}
      
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## Core Endpoints

### User Management

#### Get Current User Information
```bash
GET /api/v1/users/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@kyool.com",
  "full_name": "John Doe",
  "is_active": true,
  "is_admin": false,
  "creation_date_utc": "2025-08-19T10:00:00Z"
}
```

#### Create New User (Admin Only)
```bash
POST /api/v1/users/
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "newuser@kyool.com",
  "password": "securepassword123",
  "full_name": "New User",
  "is_active": true,
  "is_admin": false
}
```

#### Update User (Admin Only)
```bash
PUT /api/v1/users/{user_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "full_name": "Updated Name",
  "is_active": true
}
```

## Media Management

### 1. Media Descriptions

#### List Media Descriptions
```bash
GET /api/v1/media-descriptions
Authorization: Bearer {token}
```

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Number of records to return (default: 20, max: 100)
- `media_type`: Filter by media type (video, webtoon, trailer, teaser, excerpt)
- `category_id`: Filter by category ID
- `status`: Filter by content status (draft, published, archived, scheduled)
- `is_featured`: Filter by featured status (true/false)
- `is_premium`: Filter by premium status (true/false)

**Example with Filters:**
```bash
curl -X GET "http://localhost:8000/api/v1/media-descriptions?media_type=video&is_featured=true&limit=10" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "file_number": 12345,
      "episode_title": "Amazing Episode 1",
      "media_type": "video",
      "content_status": "published",
      "is_featured": true,
      "creation_date_utc": "2025-08-19T10:00:00Z",
      "duration_seconds": 3600,
      "view_count": 1500
    }
  ],
  "total": 150,
  "page": 1,
  "size": 10,
  "pages": 15
}
```

#### Create Media Description
```bash
POST /api/v1/media-descriptions
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_number": 12346,
  "episode_title": "New Episode",
  "media_type": "video",
  "file_name": "episode_02.mp4",
  "episode_number": 2,
  "descriptive_summary_text": "This is a new episode",
  "synopsis_text": "Episode synopsis here",
  "production_year": 2025,
  "duration_seconds": 3600,
  "is_premium_content": false,
  "is_featured": false,
  "content_status": "draft"
}
```

#### Update Media Description
```bash
PUT /api/v1/media-descriptions/{media_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "episode_title": "Updated Episode Title",
  "content_status": "published",
  "is_featured": true
}
```

#### Get Single Media Description
```bash
GET /api/v1/media-descriptions/{media_id}
Authorization: Bearer {token}
```

#### Delete Media Description
```bash
DELETE /api/v1/media-descriptions/{media_id}
Authorization: Bearer {token}
```

### 2. Programs

#### List Programs
```bash
GET /api/v1/programs
Authorization: Bearer {token}
```

#### Create Program
```bash
POST /api/v1/programs
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Amazing Series",
  "description": "A fantastic series about adventures",
  "genre": "Adventure",
  "release_date": "2025-01-01",
  "status": "active"
}
```

### 3. Seasons

#### List Seasons
```bash
GET /api/v1/seasons?program_id={program_id}
Authorization: Bearer {token}
```

#### Create Season
```bash
POST /api/v1/seasons
Authorization: Bearer {token}
Content-Type: application/json

{
  "program_id": "123e4567-e89b-12d3-a456-426614174000",
  "season_number": 1,
  "title": "Season 1",
  "description": "First season of the series",
  "release_date": "2025-01-01"
}
```

## File Upload System

### 1. Upload Single File

#### Upload Video File
```bash
POST /api/v1/upload/single
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: [video file]
- media_type: "video"
- custom_filename: "optional_custom_name.mp4"
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/upload/single" \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/video.mp4" \
  -F "media_type=video" \
  -F "custom_filename=my_video.mp4"
```

**Response:**
```json
{
  "success": true,
  "file_url": "http://localhost:8000/files/video/2025/08/19/my_video.mp4",
  "file_size": 104857600,
  "content_type": "video/mp4",
  "metadata": {
    "selected_backend": "local",
    "upload_timestamp": "2025-08-19T10:30:00Z"
  }
}
```

#### Upload Webtoon Images
```bash
POST /api/v1/upload/multiple
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- files: [multiple image files]
- media_type: "webtoon"
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/upload/multiple" \
  -H "Authorization: Bearer {token}" \
  -F "files=@/path/to/page1.jpg" \
  -F "files=@/path/to/page2.jpg" \
  -F "media_type=webtoon"
```

### 2. Upload Configuration Info
```bash
GET /api/v1/upload/backends
Authorization: Bearer {token}
```

**Response:**
```json
{
  "available_backends": ["local", "s3"],
  "media_type_config": {
    "video": {"backend": "local"},
    "webtoon": {"backend": "local"},
    "trailer": {"backend": "local"}
  }
}
```

## Content Organization

### 1. Categories

#### List Category Lists
```bash
GET /api/v1/category-lists
Authorization: Bearer {token}
```

#### Create Category List
```bash
POST /api/v1/category-lists
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Action Movies",
  "description": "Action-packed movies and shows",
  "is_active": true
}
```

### 2. Content Lists

#### List Content Lists
```bash
GET /api/v1/content-lists
Authorization: Bearer {token}
```

#### Create Content List
```bash
POST /api/v1/content-lists
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Featured This Week",
  "description": "Top content for this week",
  "content_type": "featured",
  "media_description_ids": [
    "123e4567-e89b-12d3-a456-426614174000",
    "789e0123-e89b-12d3-a456-426614174000"
  ],
  "is_active": true
}
```

### 3. Countries and Languages

#### List Countries
```bash
GET /api/v1/countries
Authorization: Bearer {token}
```

#### List Languages  
```bash
GET /api/v1/languages
Authorization: Bearer {token}
```

### 4. Additional Endpoints from Share Package

#### Featured and Trending Media
```bash
# Get featured media
GET /api/v1/media/featured?skip=0&limit=10
Authorization: Bearer {token}

# Get trending media  
GET /api/v1/media/trending?skip=0&limit=10
Authorization: Bearer {token}

# Like media
POST /api/v1/media/{media_id}/like
Authorization: Bearer {token}

# Share media
POST /api/v1/media/{media_id}/share
Authorization: Bearer {token}
```

#### Video File Operations
```bash
# Get video files
GET /api/v1/video-files?limit=10
Authorization: Bearer {token}

# Create video file with existing URL
POST /api/v1/video-files/existing-url
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_name": "video.mp4",
  "external_url": "https://example.com/video.mp4",
  "media_description_id": "media-123"
}

# Test video file playback
POST /api/v1/video-files/{file_id}/test-playback
Authorization: Bearer {token}
```

#### Public Persons (Celebrities)
```bash
# Get public persons
GET /api/v1/public-persons?skip=0&limit=20
Authorization: Bearer {token}

# Create public person
POST /api/v1/public-persons
Authorization: Bearer {token}
Content-Type: application/json

{
  "stage_name_roman": "John Doe",
  "profession_list": ["actor", "director"]
}

# Search persons by name
GET /api/v1/public-persons/search?name=John
Authorization: Bearer {token}
```

#### Category List Items
```bash
# Get category list items
GET /api/v1/category-lists/{list_id}/items
Authorization: Bearer {token}

# Create category list item
POST /api/v1/category-lists/{list_id}/items
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Item Title",
  "media_description_id": "media-123",
  "display_order": 1
}

# Get category list JSON (for client display)
GET /api/v1/category-lists/{list_name}/json
Authorization: Bearer {token}
```

#### Video File Reports
```bash
# Get all video file reports
GET /api/v1/video-file-reports?skip=0&limit=20&event=upload
Authorization: Bearer {token}

# Get reports for specific video file
GET /api/v1/video-file-reports/video-file/{video_file_id}
Authorization: Bearer {token}
```

#### Bulk Operations
```bash
# Bulk create media descriptions
POST /api/v1/media-descriptions/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "descriptions": [
    {
      "file_number": 1,
      "episode_title": "Episode 1",
      "media_type": "video"
    },
    {
      "file_number": 2,
      "episode_title": "Episode 2", 
      "media_type": "video"
    }
  ]
}
```

## Utilities and Helpers

The share package provides several utility classes and functions for common operations:

### ExcelParser - File Processing

Utility class for parsing Excel/CSV files and converting them to structured data.

```typescript
import { ExcelParser } from 'share';

// Parse a file
const result = await ExcelParser.parseFile(file);

if (result.errors.length > 0) {
  console.log('Errors found:', result.errors);
}

console.log('Parsed data:', result.data); // MediaDescriptionCreate[]

// Generate a template
const template = ExcelParser.generateTemplate();
// Downloads a template.xlsx file with correct columns
```

**Supported columns:**
- file_number, episode_title, media_type
- program_name, season_number, episode_number  
- description, synopsis, production_year
- duration_seconds, original_language
- And many more according to MediaDescription schema

### Storage Abstraction

Cross-platform storage system (localStorage/AsyncStorage).

```typescript
import { initStorage, tokenStorage, getStorage } from 'share';

// Configuration (React Native)
import AsyncStorage from '@react-native-async-storage/async-storage';
initStorage(AsyncStorage);

// Token management
await tokenStorage.setToken('my_token');
const token = await tokenStorage.getToken();
await tokenStorage.removeToken();

// Generic storage
const storage = getStorage();
await storage.setItem('key', 'value');
const value = await storage.getItem('key');
```

### Validation with Zod

Robust validation system with Zod for all data types.

```typescript
import { 
  validateEmail, 
  validatePassword, 
  validateVideoFile,
  getValidationErrors,
  mediaDescriptionSchema 
} from 'share';

// Simple validation
const isValidEmail = validateEmail('test@example.com'); // true
const isValidPassword = validatePassword('123456'); // false (too short)

// Video file validation
const fileValidation = validateVideoFile(file);
if (!fileValidation.isValid) {
  console.error(fileValidation.error);
}

// Full schema validation
const errors = getValidationErrors(mediaDescriptionSchema, {
  file_number: 'invalid', // Should be number
  episode_title: '', // Required
  media_type: 'invalid' // Should be 'video' | 'webtoon' etc.
});

console.log(errors);
// { file_number: 'Expected number', episode_title: 'Required', ... }
```

**Available schemas:**
- `emailSchema`, `passwordSchema`
- `loginSchema`, `registerSchema`
- `mediaDescriptionSchema`, `videoFileSchema`
- And more...

### VideoUploadManager - Advanced Upload

Advanced class for managing all aspects of video upload.

```typescript
import { VideoUploadManager, formatFileSize, formatDuration } from 'share';

// Create manager with progress callback
const uploadManager = new VideoUploadManager((progress) => {
  console.log(`Progress: ${progress.percentage}%`);
  console.log(`Speed: ${formatFileSize(progress.bytesPerSecond)}/s`);
});

// Upload new file
const videoFile = await uploadManager.upload({
  file: file,
  media_description_id: 'media-123',
  upload_method: 'new_upload'
});

// Upload with existing URL
const videoFile2 = await uploadManager.uploadWithExistingUrl({
  file_name: 'video.mp4',
  external_url: 'https://example.com/video.mp4',
  media_description_id: 'media-456'
});

// Formatting utilities
console.log(formatFileSize(1024 * 1024)); // "1.00 MB"
console.log(formatDuration(3661)); // "1h 1m 1s"
```

### TypeScript Types

The share package exports **50+ TypeScript interfaces** covering all API aspects:

```typescript
import { 
  User, 
  MediaDescription, 
  VideoFile, 
  Program, 
  Season,
  MediaFilters,
  PaginationInfo 
} from 'share';

// User interface
interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

// Media description interface
interface MediaDescription {
  id: string;
  creation_date_utc: string;
  file_number: number;
  episode_title: string;
  media_type: 'video' | 'webtoon' | 'trailer' | 'teaser' | 'excerpt';
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  descriptive_summary_text?: string;
  synopsis_text?: string;
  duration_seconds?: number;
  // ... many more fields
}

// Video file interface
interface VideoFile {
  id: string;
  media_description_id?: string;
  file_name?: string;
  file_url?: string;
  upload_method: 'new_upload' | 'existing_url';
  upload_status: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed';
  encoding_status: string;
  // ... technical fields, Mux integration, etc.
}
```

## Code Examples

### React Application with Share Package

```typescript
// App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApiClient } from 'share';

// Configuration
initApiClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  onAuthError: () => {
    window.location.href = '/login';
  }
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

// Main component with hooks
function MainApp() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { parseExcelFile } = useBulkDescriptions();
  
  return (
    <div>
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={logout} />
      ) : (
        <LoginForm onLogin={login} />
      )}
    </div>
  );
}
```

### React Native Application

```typescript
// App.tsx
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initApiClient, initStorage } from 'share';

// Configuration for React Native
initApiClient({
  baseURL: 'https://api.kyool.com',
  onAuthError: () => {
    // Navigate to login screen
  }
});

initStorage(AsyncStorage); // Important for React Native

// The rest is identical to React.js
```

### Complete Integration Example

```typescript
import { 
  authApi, 
  mediaApi, 
  useAuth, 
  useVideoUpload,
  useBulkDescriptions,
  MediaDescription 
} from 'share';

function MediaManagementDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { upload: uploadVideo, state: uploadState } = useVideoUpload();
  const { 
    parseExcelFile, 
    createBulkDescriptions,
    generateTemplate 
  } = useBulkDescriptions();

  const [mediaList, setMediaList] = React.useState<MediaDescription[]>([]);

  React.useEffect(() => {
    if (isAuthenticated) {
      loadMediaList();
    }
  }, [isAuthenticated]);

  const loadMediaList = async () => {
    try {
      const response = await mediaApi.getMediaDescriptions({
        skip: 0,
        limit: 20,
        media_type: 'video'
      });
      setMediaList(response.items);
    } catch (error) {
      console.error('Failed to load media:', error);
    }
  };

  const handleVideoUpload = async (file: File) => {
    await uploadVideo({
      file,
      upload_method: 'new_upload'
    });
  };

  const handleBulkImport = async (file: File) => {
    const parseResult = await parseExcelFile(file);
    if (parseResult.errors.length === 0) {
      await createBulkDescriptions(parseResult.data);
      loadMediaList(); // Refresh list
    }
  };

  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <h1>Welcome, {user?.full_name}</h1>
      
      {/* Video Upload */}
      <section>
        <h2>Upload Video</h2>
        <input 
          type="file" 
          accept="video/*"
          onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
        />
        {uploadState.isUploading && (
          <div>Upload: {Math.round(uploadState.progress)}%</div>
        )}
      </section>

      {/* Bulk Import */}
      <section>
        <h2>Bulk Import</h2>
        <button onClick={() => {
          const template = generateTemplate();
          const url = URL.createObjectURL(template);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'template.xlsx';
          link.click();
        }}>
          Download Template
        </button>
        <input 
          type="file" 
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && handleBulkImport(e.target.files[0])}
        />
      </section>

      {/* Media List */}
      <section>
        <h2>Media List</h2>
        {mediaList.map(media => (
          <div key={media.id}>
            <h3>{media.episode_title}</h3>
            <p>Type: {media.media_type}</p>
            <p>File: {media.file_number}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

### Python Example (using requests)

```python
import requests
import json

class KyoolAPI:
    def __init__(self, base_url="http://localhost:8000/api/v1"):
        self.base_url = base_url
        self.token = None
    
    def login(self, username, password):
        """Login and store access token"""
        url = f"{self.base_url}/auth/login"
        data = {
            "username": username,
            "password": password
        }
        response = requests.post(url, data=data)
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            return True
        return False
    
    def get_headers(self):
        """Get headers with authorization"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def get_media_descriptions(self, **filters):
        """Get media descriptions with optional filters"""
        url = f"{self.base_url}/media-descriptions"
        response = requests.get(url, headers=self.get_headers(), params=filters)
        return response.json()
    
    def create_media_description(self, data):
        """Create new media description"""
        url = f"{self.base_url}/media-descriptions"
        response = requests.post(url, headers=self.get_headers(), json=data)
        return response.json()
    
    def upload_file(self, file_path, media_type):
        """Upload a file"""
        url = f"{self.base_url}/upload/single"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        with open(file_path, 'rb') as file:
            files = {'file': file}
            data = {'media_type': media_type}
            response = requests.post(url, headers=headers, files=files, data=data)
        
        return response.json()

# Usage example
api = KyoolAPI()
if api.login("admin@kyool.com", "admin123"):
    # Get featured videos
    featured_videos = api.get_media_descriptions(
        media_type="video", 
        is_featured=True, 
        limit=10
    )
    print(f"Found {featured_videos['total']} featured videos")
    
    # Create new media description
    new_media = {
        "file_number": 99999,
        "episode_title": "API Test Episode",
        "media_type": "video",
        "content_status": "draft"
    }
    result = api.create_media_description(new_media)
    print(f"Created media with ID: {result['id']}")
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class KyoolAPI {
    constructor(baseURL = 'http://localhost:8000/api/v1') {
        this.baseURL = baseURL;
        this.token = null;
    }
    
    async login(username, password) {
        try {
            const response = await axios.post(`${this.baseURL}/auth/login`, 
                new URLSearchParams({
                    username: username,
                    password: password
                })
            );
            this.token = response.data.access_token;
            return true;
        } catch (error) {
            console.error('Login failed:', error.response?.data);
            return false;
        }
    }
    
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    async getMediaDescriptions(filters = {}) {
        try {
            const response = await axios.get(`${this.baseURL}/media-descriptions`, {
                headers: this.getHeaders(),
                params: filters
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching media descriptions:', error.response?.data);
            throw error;
        }
    }
    
    async uploadFile(filePath, mediaType) {
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('media_type', mediaType);
            
            const response = await axios.post(`${this.baseURL}/upload/single`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${this.token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Upload failed:', error.response?.data);
            throw error;
        }
    }
}

// Usage
async function example() {
    const api = new KyoolAPI();
    
    if (await api.login('admin@kyool.com', 'admin123')) {
        // Get all video content
        const videos = await api.getMediaDescriptions({ media_type: 'video' });
        console.log(`Found ${videos.total} videos`);
        
        // Upload a file
        const uploadResult = await api.uploadFile('./video.mp4', 'video');
        console.log('Upload successful:', uploadResult.file_url);
    }
}
```

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Invalid or missing authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Validation Error | Input validation failed |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "detail": "Error description",
  "error_code": "VALIDATION_ERROR",
  "field_errors": {
    "email": ["Invalid email format"],
    "password": ["Password too short"]
  }
}
```

### Common Errors and Solutions

#### 1. Authentication Errors
```json
{
  "detail": "Could not validate credentials"
}
```
**Solution:** Check token validity and re-login if expired

#### 2. Validation Errors
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```
**Solution:** Ensure all required fields are provided with correct types

#### 3. Permission Errors
```json
{
  "detail": "Insufficient permissions"
}
```
**Solution:** Use admin credentials for admin-only endpoints

## Best Practices

### 1. Authentication
- Store tokens securely (environment variables or secure storage)
- Implement token refresh logic in production
- Never log or expose access tokens
- Handle token expiration gracefully

### 2. Error Handling
- Always check response status codes
- Implement retry logic for transient errors
- Log errors appropriately for debugging
- Provide user-friendly error messages

### 3. Performance
- Use pagination for large datasets (`skip` and `limit` parameters)
- Implement client-side caching where appropriate
- Use appropriate filters to reduce data transfer
- Monitor API response times

### 4. File Uploads
- Validate file types on client side
- Show upload progress for large files
- Handle upload failures gracefully
- Check file size limits before uploading

### 5. API Versioning
- Always use versioned endpoints (`/api/v1/`)
- Plan for future API versions
- Monitor deprecated endpoints
- Test with different API versions

### 6. Share Package Integration
- Always configure `initApiClient()` at application startup
- Use `initStorage()` for React Native applications  
- Leverage React hooks for state management
- Utilize TypeScript types for better development experience
- Take advantage of built-in validation and error handling
- Use utilities like ExcelParser for complex operations

### 7. Dependencies
When using the share package, ensure these peer dependencies are installed:

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0", 
  "@tanstack/react-query": "^5.0.0"
}
```

For React Native, also include:
```json
{
  "@react-native-async-storage/async-storage": "^1.19.0"
}
```

## Rate Limits and Quotas

**Current Status:** No rate limiting implemented

**Recommended Approach:**
- Implement respectful request patterns
- Avoid concurrent requests to same endpoint
- Use appropriate delays between requests
- Monitor response times and adjust accordingly

## API Documentation

### Interactive API Documentation
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### API Schema
- **OpenAPI JSON:** `http://localhost:8000/api/v1/openapi.json`

## Support and Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure backend server is running
   - Check correct port (8000)
   - Verify network connectivity

2. **CORS Errors**
   - Configure CORS origins in backend settings
   - Check request headers
   - Use correct content types

3. **Database Errors**
   - Ensure database is accessible
   - Check database credentials
   - Verify migrations are applied

### Debugging Tips
- Enable verbose logging in HTTP client
- Check server logs for detailed error information
- Use interactive API documentation for testing
- Validate JSON schemas before sending requests

---

**Last Updated:** August 19, 2025  
**API Version:** v1.0  
**Contact:** Technical Team