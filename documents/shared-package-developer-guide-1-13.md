# Kyool Media Shared Package Developer Guide

**Version**: API 1.13 Compatible
**Last Updated**: January 13, 2025
**Package**: `@kyool-media/share`

## Table of Contents

1. [Quick Start & Setup](#quick-start--setup)
2. [API Functions Reference](#api-functions-reference)
3. [React Hooks Guide](#react-hooks-guide)
4. [Utility Functions](#utility-functions)
5. [TypeScript Types & Interfaces](#typescript-types--interfaces)
6. [Authentication & Storage](#authentication--storage)
7. [Platform Configuration](#platform-configuration)
8. [Best Practices & Examples](#best-practices--examples)
9. [Migration Guide](#migration-guide)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start & Setup

### Installation

The shared package is already configured in the monorepo. Import what you need:

```typescript
// Essential imports
import {
  authApi,
  mediaApi,
  initApiClient,
  initAuthStorage,
  useAuth,
  MediaDescription,
  VideoFile
} from '@kyool-media/share';
```

### Basic Configuration

```typescript
// In your app initialization (React Web/React Native)
import { initApiClient, initAuthStorage } from '@kyool-media/share';

// Initialize API client
initApiClient({
  baseURL: 'https://api.kyool.com/api/v1', // or your backend URL
  onAuthError: () => {
    // Handle auth errors (redirect to login, etc.)
    console.log('Authentication error, redirecting to login');
  }
});

// Initialize storage (platform-specific)
initAuthStorage({
  platform: 'web' // or 'native'
});
```

---

## API Functions Reference

### 1. Authentication API (`authApi`)

```typescript
import { authApi } from '@kyool-media/share';

// Login
const tokens = await authApi.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const user = await authApi.getCurrentUser();

// Logout
await authApi.logout();

// Check authentication status
const isAuthenticated = await authApi.isAuthenticated();
```

### 2. Media Descriptions API (`mediaApi`)

#### Basic CRUD Operations
```typescript
import { mediaApi, MediaDescription } from '@kyool-media/share';

// List media descriptions with filtering
const response = await mediaApi.getMediaDescriptions({
  skip: 0,
  limit: 20,
  media_type: 'video',
  is_featured: true
});

// Get single media description
const media = await mediaApi.getMediaDescription('media-uuid');

// Create new media description
const newMedia = await mediaApi.createMediaDescription({
  file_number: 1001,
  episode_title: 'New Episode',
  media_type: 'video',
  program_id: 'program-uuid',
  season_id: 'season-uuid',
  is_featured: true
});

// Update media description (full update)
const updatedMedia = await mediaApi.updateMediaDescription('media-uuid', {
  episode_title: 'Updated Title',
  descriptive_summary_text: 'New summary'
});

// Partial update (API 1.13)
const patchedMedia = await mediaApi.patchMediaDescription('media-uuid', {
  is_featured: false
});

// Delete media description
await mediaApi.deleteMediaDescription('media-uuid');
```

#### API 1.13 New Features - Text-to-UUID Conversion
```typescript
// Create media from text inputs (auto-creates relationships)
const mediaFromText = await mediaApi.createMediaDescriptionFromText({
  episode_title: 'Adventure Begins',
  media_type: 'video',
  program_name: 'Adventure Series',      // Auto-creates/finds program
  season_name: 'Season 1',              // Auto-creates/finds season
  actor_names: ['John Actor', 'Jane Actress'], // Auto-creates/finds actors
  director_names: ['Famous Director'],   // Auto-creates/finds directors
  theme_names: ['Action', 'Adventure'],  // Auto-creates/finds themes
  available_country_names: ['United States', 'Canada'],
  image_1920_1080_filename: 'poster.jpg' // References existing image
});
```

#### Relationship Management (API 1.13)
```typescript
// Using relationship arrays for create/update
const mediaWithRelationships = await mediaApi.createMediaDescription({
  episode_title: 'Episode with Cast',
  media_type: 'video',
  // Relationship arrays (for requests)
  actor_ids: ['actor-uuid-1', 'actor-uuid-2'],
  director_ids: ['director-uuid'],
  origin_country_ids: ['country-uuid'],
  media_theme_ids: ['theme-uuid-1', 'theme-uuid-2'],
  audience_category_ids: ['category-uuid']
});

// Response includes relationship objects
const media = await mediaApi.getMediaDescription('media-uuid');
// media.actors = [{ id: 'uuid', stage_name_roman: 'John Actor' }, ...]
// media.directors = [{ id: 'uuid', stage_name_roman: 'Famous Director' }, ...]
// media.origin_countries = [{ id: 'uuid', name: 'United States' }, ...]
```

### 3. Video Files API

#### Basic Video Management
```typescript
import { mediaApi, VideoFile } from '@kyool-media/share';

// List video files
const videos = await mediaApi.getVideoFiles({ skip: 0, limit: 20 });

// Get single video file
const video = await mediaApi.getVideoFile('video-uuid');

// Update video file
const updatedVideo = await mediaApi.updateVideoFile('video-uuid', {
  encoding_status: 'completed',
  duration_seconds: 3600
});
```

#### API 1.13 Advanced Video Features
```typescript
// Two-step upload process
const metadata = await mediaApi.createVideoFileMetadata({
  file_name: 'video.mp4'
});
// metadata.upload_url contains the upload endpoint

// Upload file to existing metadata
const uploadResult = await mediaApi.uploadFileToExistingMetadata(
  metadata.id,
  videoFile
);

// Generate playback token (for secure viewing)
const playbackToken = await mediaApi.generatePlaybackToken('video-uuid', 60);
// playbackToken.playback_url contains the secure playback URL

// Generate DRM token (for premium content)
const drmToken = await mediaApi.generateDrmToken('video-uuid', 120, 'drm-key-123');

// Complete video data from Mux
const completedVideo = await mediaApi.completeFromMux('video-uuid');

// Audio language management
await mediaApi.addAudioLanguage('video-uuid', 'language-uuid');
await mediaApi.updateAllAudioLanguages('video-uuid', ['lang1-uuid', 'lang2-uuid']);

// Test video playback
const testResult = await mediaApi.testVideoFilePlayback('video-uuid');
if (testResult.success) {
  console.log('Video plays correctly:', testResult.playback_url);
}
```

### 4. Media Showcases API (NEW - API 1.13)

```typescript
import { mediaShowcasesApi, MediaShowcase } from '@kyool-media/share';

// List showcases with filtering
const showcases = await mediaShowcasesApi.getMediaShowcases({
  showcase_type: 'featured',
  is_active: true,
  skip: 0,
  limit: 10
});

// Create new showcase
const newShowcase = await mediaShowcasesApi.createMediaShowcase({
  title: 'New Releases This Week',
  description: 'Latest content added to the platform',
  showcase_type: 'new_releases',
  is_active: true,
  display_order: 1
});

// Update showcase
const updatedShowcase = await mediaShowcasesApi.updateMediaShowcase('showcase-uuid', {
  title: 'Updated Title',
  is_active: false
});

// Get showcase with related media
const showcase = await mediaShowcasesApi.getMediaShowcase('showcase-uuid');
// showcase.media_descriptions contains related media items
```

### 5. User Management API

#### Basic User Operations
```typescript
import { usersApi, User } from '@kyool-media/share';

// List users (admin only)
const users = await usersApi.getUsers({
  skip: 0,
  limit: 20,
  is_active: true
});

// Get current user
const currentUser = await usersApi.getCurrentUser();

// Update user
const updatedUser = await usersApi.updateUser('user-uuid', {
  full_name: 'Updated Name'
});
```

#### API 1.13 Subscription Management
```typescript
// Add subscription plan to user
await usersApi.addSubscriptionPlan('user-uuid', 'plan-uuid');

// Remove subscription plan
await usersApi.removeSubscriptionPlan('user-uuid', 'plan-uuid');

// Update all user subscription plans
await usersApi.updateAllSubscriptionPlans('user-uuid', ['plan1-uuid', 'plan2-uuid']);
```

### 6. Other API Modules

#### Programs & Seasons
```typescript
import { programsApi, seasonsApi } from '@kyool-media/share';

// Create program
const program = await programsApi.createProgram({
  program_name: 'New Series',
  general_media_description_id: 'media-uuid' // optional
});

// Create season (API 1.13 - program_id now optional)
const season = await seasonsApi.createSeason({
  season_name: 'Season 1',
  season_number: 1,
  program_id: 'program-uuid' // optional in API 1.13
});
```

#### People Management
```typescript
import { personsApi } from '@kyool-media/share';

// Create person (API 1.13 format)
const person = await personsApi.createPerson({
  stage_name_roman: 'John Actor',
  stage_name_local: '존 액터', // optional
  real_name_roman: 'John Smith',
  biography_text: 'Renowned actor...',
  birth_date: '1985-03-15',
  country_of_origin_id: 'country-uuid'
});
```

---

## React Hooks Guide

### 1. Authentication Hook (`useAuth`)

```typescript
import { useAuth } from '@kyool-media/share';

function LoginComponent() {
  const { user, login, logout, isAuthenticated, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@test.com', password: 'pass123' });
      console.log('Login successful');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.full_name}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 2. Video Upload Hook (`useVideoUpload`)

```typescript
import { useVideoUpload } from '@kyool-media/share';

function VideoUploadComponent() {
  const {
    uploadVideo,
    uploadProgress,
    isUploading,
    error,
    resetUpload
  } = useVideoUpload();

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadVideo(file, {
        media_description_id: 'optional-media-uuid'
      });
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => e.files?.[0] && handleFileUpload(e.files[0])}
      />
      {isUploading && (
        <div>
          <p>Uploading: {uploadProgress}%</p>
          <button onClick={resetUpload}>Cancel</button>
        </div>
      )}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### 3. Description Reports Hook (`useDescriptionReports`)

```typescript
import { useDescriptionReports } from '@kyool-media/share';

function ReportsComponent() {
  const {
    reports,
    loading,
    error,
    fetchReports,
    fetchReportsByBatch
  } = useDescriptionReports();

  useEffect(() => {
    fetchReports({ skip: 0, limit: 20 });
  }, []);

  return (
    <div>
      {loading && <p>Loading reports...</p>}
      {error && <p>Error: {error}</p>}
      <ul>
        {reports.map(report => (
          <li key={report.id}>
            {report.title} - {report.success_associated_file ? '✅' : '❌'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4. Bulk Descriptions Hook (`useBulkDescriptions`)

```typescript
import { useBulkDescriptions } from '@kyool-media/share';

function BulkUploadComponent() {
  const {
    createBulkDescriptions,
    isLoading,
    progress,
    results,
    error
  } = useBulkDescriptions();

  const handleBulkCreate = async (descriptions: MediaDescriptionCreate[]) => {
    try {
      const result = await createBulkDescriptions(descriptions);
      console.log(`Created ${result.created_count} descriptions`);
    } catch (error) {
      console.error('Bulk creation failed:', error);
    }
  };

  return (
    <div>
      {isLoading && <p>Processing {progress.current}/{progress.total}...</p>}
      {results && (
        <div>
          <p>✅ Created: {results.created_count}</p>
          <p>❌ Failed: {results.failed_count}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Utility Functions

### 1. Storage Utilities

```typescript
import {
  authTokenStorage,
  initStorage,
  webStorage,
  nativeStorage
} from '@kyool-media/share';

// Cross-platform storage initialization
initStorage({ platform: 'web' }); // or 'native'

// Token management (automatic in most cases)
await authTokenStorage.setAccessToken('token-here');
const token = await authTokenStorage.getAccessToken();
await authTokenStorage.clearAll();

// Platform-specific storage (if needed)
if (Platform.OS === 'web') {
  await webStorage.setItem('key', 'value');
} else {
  await nativeStorage.setItem('key', 'value');
}
```

### 2. Excel Parser

```typescript
import { parseExcelToMediaDescriptions } from '@kyool-media/share';

function ExcelUploadComponent() {
  const handleFileUpload = async (file: File) => {
    try {
      const result = await parseExcelToMediaDescriptions(file);

      if (result.errors.length > 0) {
        console.warn('Parsing errors:', result.errors);
      }

      // result.data contains array of MediaDescriptionCreate objects
      console.log('Parsed descriptions:', result.data);
    } catch (error) {
      console.error('Excel parsing failed:', error);
    }
  };

  return (
    <input
      type="file"
      accept=".xlsx,.xls"
      onChange={(e) => e.files?.[0] && handleFileUpload(e.files[0])}
    />
  );
}
```

### 3. Video Processing Utilities

```typescript
import { validateVideoFile, getVideoMetadata } from '@kyool-media/share';

// Validate video file before upload
const isValid = await validateVideoFile(file);
if (!isValid.valid) {
  console.error('Invalid video:', isValid.errors);
  return;
}

// Extract video metadata
const metadata = await getVideoMetadata(file);
console.log('Duration:', metadata.duration);
console.log('Resolution:', `${metadata.width}x${metadata.height}`);
```

### 4. Region & Access Control

```typescript
import { validateRegionAccess, checkContentAccess } from '@kyool-media/share';

// Check if content is available in user's region
const regionAccess = await validateRegionAccess('media-uuid', 'US');
if (!regionAccess.available) {
  console.log('Content not available in this region');
}

// Check user's subscription access to content
const hasAccess = await checkContentAccess('media-uuid', user.subscription_plans);
if (!hasAccess) {
  console.log('Upgrade subscription to access this content');
}
```

---

## TypeScript Types & Interfaces

### Core Entities

```typescript
import {
  MediaDescription,
  VideoFile,
  Program,
  Season,
  PublicPerson,
  MediaShowcase,
  User
} from '@kyool-media/share';

// MediaDescription with API 1.13 features
interface MediaDescription {
  id: string;
  episode_title: string;
  media_type: 'video' | 'excerpt' | 'trailer' | 'webtoon' | 'season' | 'program';
  content_status: 'draft' | 'published' | 'archived' | 'scheduled';

  // API 1.13 Relationship arrays (for create/update)
  actor_ids?: string[];
  director_ids?: string[];
  media_theme_ids?: string[];

  // API 1.13 Relationship objects (in responses)
  actors?: PublicPersonSimple[];
  directors?: PublicPersonSimple[];
  media_themes?: MediaThemeSimple[];
}

// VideoFile with API 1.13 enhancements
interface VideoFile {
  id: string;
  file_name: string;
  upload_status: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed';
  encoding_status: 'pending' | 'processing' | 'completed' | 'failed';

  // API 1.13 Technical metadata
  video_codec?: string;
  audio_codec?: string;
  file_format?: string;
  drm_protection?: boolean;
  playback_policy?: string;
}
```

### API Response Types

```typescript
import {
  PaginatedResponse,
  MediaDescriptionListResponse,
  PlaybackTokenResponse,
  BulkMediaDescriptionResponse
} from '@kyool-media/share';

// Generic pagination
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
    page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// API 1.13 specific responses
interface PlaybackTokenResponse {
  success: boolean;
  token: string;
  playback_url: string;
  expires_in_minutes: number;
  expires_at: number;
}
```

---

## Authentication & Storage

### Authentication Flow

```typescript
// 1. Initialize authentication
import { initApiClient, initAuthStorage } from '@kyool-media/share';

initAuthStorage({ platform: 'web' });
initApiClient({
  baseURL: process.env.REACT_APP_API_URL,
  onAuthError: () => {
    // Redirect to login page
    window.location.href = '/login';
  }
});

// 2. Login process
import { authApi } from '@kyool-media/share';

const handleLogin = async (email: string, password: string) => {
  try {
    const tokens = await authApi.login({ email, password });
    // Tokens are automatically stored
    console.log('Login successful');
  } catch (error) {
    console.error('Login failed:', error.message);
  }
};

// 3. Authentication state management with React Hook
import { useAuth } from '@kyool-media/share';

function App() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <Dashboard user={user} />
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
```

### Token Management

```typescript
import { authTokenStorage, isTokenExpired } from '@kyool-media/share';

// Check token status
const token = await authTokenStorage.getAccessToken();
if (token && isTokenExpired(token)) {
  console.log('Token expired, refreshing...');
  // Refresh is handled automatically by the API client
}

// Manual token operations (rarely needed)
await authTokenStorage.setAccessToken('new-token');
await authTokenStorage.setRefreshToken('refresh-token');
await authTokenStorage.clearAll(); // Logout
```

---

## Platform Configuration

### React Web Configuration

```typescript
// src/index.tsx or App.tsx
import { initApiClient, initAuthStorage } from '@kyool-media/share';

// Initialize for web
initAuthStorage({ platform: 'web' });
initApiClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  onAuthError: () => {
    // Handle auth errors
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
});
```

### React Native Configuration

```typescript
// App.tsx or index.js
import { initApiClient, initAuthStorage } from '@kyool-media/share';
import { NavigationContainer } from '@react-navigation/native';

// Initialize for React Native
initAuthStorage({ platform: 'native' });
initApiClient({
  baseURL: __DEV__
    ? 'http://localhost:8000/api/v1'
    : 'https://api.kyool.com/api/v1',
  onAuthError: () => {
    // Navigate to login screen
    // Note: This should be handled through your navigation system
    console.log('Authentication error - redirect to login');
  }
});
```

### Environment Variables

```bash
# .env (React Web)
REACT_APP_API_URL=https://api.kyool.com/api/v1
REACT_APP_STORAGE_PREFIX=kyool_

# React Native configuration in app config or constants file
export const CONFIG = {
  API_URL: __DEV__ ? 'http://localhost:8000/api/v1' : 'https://api.kyool.com/api/v1',
  STORAGE_PREFIX: 'kyool_'
};
```

---

## Best Practices & Examples

### 1. Error Handling Patterns

```typescript
import { mediaApi } from '@kyool-media/share';

// Proper error handling with types
const fetchMediaWithErrorHandling = async (id: string) => {
  try {
    const media = await mediaApi.getMediaDescription(id);
    return media;
  } catch (error: any) {
    // API errors follow standard format: { detail: string }
    if (error.response?.status === 404) {
      console.error('Media not found');
      return null;
    } else if (error.response?.status === 401) {
      console.error('Authentication required');
      // Handle auth error
    } else {
      console.error('Unexpected error:', error.response?.data?.detail || error.message);
    }
    throw error;
  }
};
```

### 2. Pagination Patterns

```typescript
import { useState, useEffect } from 'react';
import { mediaApi, MediaDescription } from '@kyool-media/share';

function MediaListComponent() {
  const [media, setMedia] = useState<MediaDescription[]>([]);
  const [pagination, setPagination] = useState({ page: 1, hasNext: true });
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !pagination.hasNext) return;

    setLoading(true);
    try {
      const response = await mediaApi.getMediaDescriptions({
        skip: (pagination.page - 1) * 20,
        limit: 20
      });

      setMedia(prev => [...prev, ...response.data]);
      setPagination({
        page: response.pagination.page + 1,
        hasNext: response.pagination.has_next
      });
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div>
      {media.map(item => (
        <div key={item.id}>{item.episode_title}</div>
      ))}
      {pagination.hasNext && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### 3. Advanced Filtering

```typescript
import { mediaApi } from '@kyool-media/share';

// Complex filtering example
const searchMedia = async (filters: {
  query?: string;
  mediaType?: string;
  featured?: boolean;
  programId?: string;
}) => {
  const response = await mediaApi.getMediaDescriptions({
    skip: 0,
    limit: 50,
    media_type: filters.mediaType,
    is_featured: filters.featured,
    program_id: filters.programId,
    // Note: text search would be implemented on the backend
    search: filters.query
  });

  return response.data;
};
```

### 4. File Upload with Progress

```typescript
import { useVideoUpload } from '@kyool-media/share';

function AdvancedVideoUpload() {
  const { uploadVideo, uploadProgress, isUploading, error } = useVideoUpload();

  const handleUpload = async (file: File, mediaId?: string) => {
    try {
      // Option 1: Direct upload with media association
      if (mediaId) {
        const result = await uploadVideo(file, {
          media_description_id: mediaId
        });
        console.log('Upload completed:', result);
        return;
      }

      // Option 2: Two-step upload for better control
      const metadata = await mediaApi.createVideoFileMetadata({
        file_name: file.name
      });

      const uploadResult = await mediaApi.uploadFileToExistingMetadata(
        metadata.id,
        file
      );

      console.log('Two-step upload completed:', uploadResult);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      {/* File input component */}
      {isUploading && (
        <div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0' }}>
            <div
              style={{
                width: `${uploadProgress}%`,
                backgroundColor: '#4CAF50',
                height: '20px'
              }}
            />
          </div>
          <p>{uploadProgress}% uploaded</p>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
```

---

## Migration Guide

### From Previous API Versions to API 1.13

#### 1. Relationship Field Updates

```typescript
// OLD (deprecated but still works)
const oldMedia = await mediaApi.createMediaDescription({
  episode_title: 'New Episode',
  actors_id_list: ['actor1', 'actor2'],  // Deprecated
  directors_id_list: ['director1']        // Deprecated
});

// NEW (API 1.13 recommended)
const newMedia = await mediaApi.createMediaDescription({
  episode_title: 'New Episode',
  actor_ids: ['actor1', 'actor2'],        // New format
  director_ids: ['director1']             // New format
});

// Response now includes relationship objects
// newMedia.actors = [{ id: 'actor1', stage_name_roman: 'John Actor' }, ...]
```

#### 2. Video File Status Updates

```typescript
// Video file status is now more granular
interface VideoFile {
  // OLD: Simple boolean or basic status
  // NEW: Detailed status tracking
  upload_status: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed';
  encoding_status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

#### 3. New Media Showcase System

```typescript
// Replace old category-based systems with new showcases
import { mediaShowcasesApi } from '@kyool-media/share';

// Create curated content collections
const showcase = await mediaShowcasesApi.createMediaShowcase({
  title: 'Featured Content',
  showcase_type: 'featured',
  is_active: true
});
```

### Breaking Changes to Watch For

1. **Season Model**: `program_id` is now optional in API 1.13
2. **Country Model**: Added required `sigle` field for country codes
3. **Person Model**: Enhanced with API 1.13 fields (`stage_name_local`, `biography_text`, etc.)
4. **Deprecated Fields**: Legacy relationship fields marked with `@deprecated`

---

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```typescript
// Problem: Token expired or invalid
// Solution: Check token and reinitialize if needed
import { authTokenStorage, isTokenExpired } from '@kyool-media/share';

const token = await authTokenStorage.getAccessToken();
if (!token || isTokenExpired(token)) {
  // Redirect to login
  console.log('Token invalid, please login again');
}
```

#### 2. Storage Issues
```typescript
// Problem: Platform-specific storage not working
// Solution: Ensure proper initialization
import { initAuthStorage } from '@kyool-media/share';

// For React Web
initAuthStorage({ platform: 'web' });

// For React Native
initAuthStorage({ platform: 'native' });
```

#### 3. Type Errors
```typescript
// Problem: TypeScript errors with new API 1.13 types
// Solution: Update imports and use correct interfaces
import {
  MediaDescription,        // Updated interface
  VideoFile,              // Updated interface
  MediaShowcase,          // New in API 1.13
  PlaybackTokenResponse   // New in API 1.13
} from '@kyool-media/share';
```

#### 4. Upload Failures
```typescript
// Problem: Video uploads failing
// Solution: Check file size and format
const validateBeforeUpload = (file: File) => {
  const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];

  if (file.size > maxSize) {
    throw new Error('File too large (max 5GB)');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file format');
  }
};
```

### Debug Mode

```typescript
// Enable detailed logging for development
if (process.env.NODE_ENV === 'development') {
  // API client already includes detailed logging
  console.log('Shared package in debug mode');
}
```

### Performance Optimization

```typescript
// Use pagination effectively
const loadDataEfficiently = async () => {
  // Load small batches instead of large datasets
  const response = await mediaApi.getMediaDescriptions({
    skip: 0,
    limit: 20  // Start small
  });

  return response.data;
};

// Cache frequently accessed data
const cache = new Map();
const getCachedMedia = async (id: string) => {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const media = await mediaApi.getMediaDescription(id);
  cache.set(id, media);
  return media;
};
```

---

## API Reference Summary

### Complete Function List

#### Authentication
- `authApi.login(credentials)` - User login
- `authApi.logout()` - User logout
- `authApi.getCurrentUser()` - Get current user
- `authApi.isAuthenticated()` - Check auth status

#### Media Management
- `mediaApi.getMediaDescriptions(filters)` - List media
- `mediaApi.getMediaDescription(id)` - Get single media
- `mediaApi.createMediaDescription(data)` - Create media
- `mediaApi.updateMediaDescription(id, data)` - Update media (full)
- `mediaApi.patchMediaDescription(id, data)` - Update media (partial) 🆕
- `mediaApi.deleteMediaDescription(id)` - Delete media
- `mediaApi.createMediaDescriptionFromText(data)` - Text-to-UUID creation 🆕

#### Video Processing
- `mediaApi.getVideoFiles(filters)` - List videos
- `mediaApi.getVideoFile(id)` - Get single video
- `mediaApi.createVideoFile(data)` - Create video
- `mediaApi.updateVideoFile(id, data)` - Update video
- `mediaApi.generatePlaybackToken(id, minutes)` - Generate playback token 🆕
- `mediaApi.generateDrmToken(id, minutes, keyId)` - Generate DRM token 🆕
- `mediaApi.completeFromMux(id)` - Complete from Mux 🆕
- `mediaApi.addAudioLanguage(videoId, langId)` - Add audio language 🆕

#### Showcases (NEW)
- `mediaShowcasesApi.getMediaShowcases(filters)` - List showcases 🆕
- `mediaShowcasesApi.createMediaShowcase(data)` - Create showcase 🆕
- `mediaShowcasesApi.updateMediaShowcase(id, data)` - Update showcase 🆕
- `mediaShowcasesApi.deleteMediaShowcase(id)` - Delete showcase 🆕

#### User Management
- `usersApi.getCurrentUser()` - Get current user
- `usersApi.getUsers(filters)` - List users
- `usersApi.addSubscriptionPlan(userId, planId)` - Add subscription 🆕
- `usersApi.removeSubscriptionPlan(userId, planId)` - Remove subscription 🆕

🆕 = New in API 1.13

---

**For additional support or questions, please refer to the API documentation or contact the development team.**