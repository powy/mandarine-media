# packages/share Usage Guide

**Package:** `packages/share`  
**Version:** 1.0.0  
**Date:** 2025-08-19  
**Target Audience:** Developers working on Kyool Media platform

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
3. [Authentication](#authentication)
4. [API Usage](#api-usage)
5. [React Hooks](#react-hooks)
6. [Storage Management](#storage-management)
7. [Validation](#validation)
8. [Platform-Specific Setup](#platform-specific-setup)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Quick Start

### Basic Setup (Web App)

```typescript
// 1. Initialize the API client and storage
import { initApiClient, initAuthStorage, WebAuthStorage } from 'share';

// Initialize storage
const authStorage = new WebAuthStorage();
initAuthStorage(authStorage);

// Initialize API client
initApiClient({
  baseURL: 'https://api.kyool-media.com',
  onAuthError: () => {
    // Handle auth errors (redirect to login, etc.)
    window.location.href = '/login';
  }
});

// 2. Set up React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}

// 3. Use authentication
import { useAuth } from 'share';

function LoginComponent() {
  const { login, isAuthenticated, user } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  if (isAuthenticated) {
    return <div>Welcome, {user?.full_name}!</div>;
  }
  
  return <button onClick={handleLogin}>Login</button>;
}
```

---

## Installation & Setup

### Dependencies

The shared package requires these peer dependencies:

```json
{
  "peerDependencies": {
    "@tanstack/react-query": "^5.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

### Platform-Specific Dependencies

**React Native Projects:**
```bash
npm install @react-native-async-storage/async-storage react-native-keychain
```

**Web Projects:**
No additional dependencies required (uses localStorage).

---

## Authentication

### 1. Setting Up Authentication

```typescript
import { 
  initApiClient, 
  initAuthStorage, 
  WebAuthStorage,     // For web
  NativeAuthStorage   // For React Native
} from 'share';

// Web setup
const webAuthStorage = new WebAuthStorage();
initAuthStorage(webAuthStorage);

// React Native setup
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const nativeAuthStorage = new NativeAuthStorage(AsyncStorage, Keychain);
initAuthStorage(nativeAuthStorage);

// Initialize API client
initApiClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  onAuthError: () => {
    // Handle authentication errors
    // Redirect to login or show auth error
  }
});
```

### 2. Using the useAuth Hook

```typescript
import { useAuth } from 'share';

function AuthComponent() {
  const {
    // State
    user,
    isAuthenticated,
    isLoadingUser,
    isLoggingIn,
    isRegistering,
    initialCheckComplete,
    
    // Actions
    login,
    logout,
    register,
    
    // Errors
    loginError,
    registerError,
    
    // Computed values
    isAdmin,
    isActive,
  } = useAuth();

  // Login
  const handleLogin = async () => {
    try {
      await login({
        email: 'user@example.com',
        password: 'password123'
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Register (admin only)
  const handleRegister = async () => {
    try {
      await register({
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User'
      });
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.full_name}!</p>
          <p>Admin: {isAdmin ? 'Yes' : 'No'}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={handleLogin} disabled={isLoggingIn}>
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3. Direct API Usage (Without Hooks)

```typescript
import { authApi } from 'share';

// Login
const tokens = await authApi.login({
  email: 'user@example.com',
  password: 'password123'
});

// Check authentication status
const isAuth = await authApi.isAuthenticated();

// Get current user
const user = await authApi.getCurrentUser();

// Get cached user (faster, no API call)
const cachedUser = await authApi.getCachedUser();

// Logout
await authApi.logout();
```

---

## API Usage

### 1. Media API

```typescript
import { mediaApi, MediaDescription, VideoFile } from 'share';

// Get media descriptions with filters
const mediaList = await mediaApi.getMediaDescriptions({
  skip: 0,
  limit: 20,
  media_type: 'video',
  is_featured: true
});

// Get specific media description
const media = await mediaApi.getMediaDescription('media-id');

// Create new media description
const newMedia = await mediaApi.createMediaDescription({
  file_number: 1,
  episode_title: 'Episode 1',
  media_type: 'video',
  descriptive_summary_text: 'Description here'
});

// Update media description
const updatedMedia = await mediaApi.updateMediaDescription('media-id', {
  episode_title: 'Updated Title'
});

// Delete media description
await mediaApi.deleteMediaDescription('media-id');

// Get video files for media
const videoFiles = await mediaApi.getVideoFilesByMediaDescription('media-id');

// Bulk create media descriptions
const bulkResult = await mediaApi.bulkCreateMediaDescriptions({
  descriptions: [
    {
      file_number: 1,
      episode_title: 'Episode 1',
      media_type: 'video'
    },
    {
      file_number: 2,
      episode_title: 'Episode 2',
      media_type: 'video'
    }
  ]
});
```

### 2. User Management API

```typescript
import { usersApi, User } from 'share';

// Get users with filters
const users = await usersApi.getUsers({
  skip: 0,
  limit: 20,
  is_active: true,
  q: 'search query'
});

// Get specific user
const user = await usersApi.getUser('user-id');

// Create new user (admin only)
const newUser = await usersApi.createUser({
  email: 'newuser@example.com',
  password: 'password123',
  full_name: 'New User'
});

// Update user
const updatedUser = await usersApi.updateUser('user-id', {
  full_name: 'Updated Name',
  is_active: true
});

// Delete user
await usersApi.deleteUser('user-id');
```

### 3. Content Management API

```typescript
import { 
  categoryListsApi, 
  contentListsApi, 
  screenContentsApi,
  CategoryList,
  ContentList,
  ScreenContent 
} from 'share';

// Category Lists
const categoryLists = await categoryListsApi.getCategoryLists({
  skip: 0,
  limit: 10,
  is_active: true
});

const categoryList = await categoryListsApi.getCategoryList('list-id');

// Content Lists (v1.6+)
const contentLists = await contentListsApi.getContentLists({
  skip: 0,
  limit: 10,
  is_active: true,
  thumbnail_format: 'large_landscape'
});

const contentList = await contentListsApi.getContentList('list-id');

// Screen Contents
const screenContents = await screenContentsApi.getScreenContents({
  skip: 0,
  limit: 10,
  is_active: true,
  screen_type: 'homepage'
});

// Get JSON representation for frontend consumption
const screenJSON = await screenContentsApi.getScreenContentJSON('screen-id');
```

### 4. Lookup Data APIs

```typescript
import { 
  countriesApi, 
  languagesApi, 
  territoriesApi, 
  picturesApi,
  programsApi,
  seasonsApi,
  personsApi
} from 'share';

// Countries
const countries = await countriesApi.getCountries({ q: 'United' });
const country = await countriesApi.getCountry('country-id');

// Languages
const languages = await languagesApi.getLanguages();
const language = await languagesApi.getLanguage('language-id');

// Territories
const territories = await territoriesApi.getTerritories({
  country_id: 'country-id'
});

// Pictures
const pictures = await picturesApi.getPictures();
const picture = await picturesApi.getPicture('picture-id');

// Programs and Seasons
const programs = await programsApi.getPrograms();
const program = await programsApi.getProgram('program-id');

const seasons = await seasonsApi.getSeasons({ program_id: 'program-id' });
const season = await seasonsApi.getSeason('season-id');

// Public Persons
const persons = await personsApi.getPersons({
  profession: 'actor',
  q: 'search name'
});
const person = await personsApi.getPerson('person-id');
```

---

## React Hooks

### 1. Custom Data Fetching Hooks

```typescript
import { useBulkDescriptions, useDescriptionReports } from 'share';

// Bulk media descriptions hook
function BulkUploadComponent() {
  const {
    createBulkDescriptions,
    isCreating,
    error
  } = useBulkDescriptions();

  const handleBulkUpload = async (descriptions) => {
    try {
      const result = await createBulkDescriptions(descriptions);
      console.log(`Created ${result.created_count} descriptions`);
    } catch (error) {
      console.error('Bulk upload failed:', error);
    }
  };

  return (
    <div>
      <button 
        onClick={() => handleBulkUpload(descriptions)} 
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : 'Bulk Upload'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

// Description reports hook
function ReportsComponent() {
  const {
    data: reports,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage
  } = useDescriptionReports({
    limit: 20
  });

  if (isLoading) return <div>Loading reports...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {reports?.pages.map(page => 
        page.data.map(report => (
          <div key={report.id}>
            <h3>{report.title}</h3>
            <p>Success: {report.success_associated_file ? 'Yes' : 'No'}</p>
            <p>Date: {new Date(report.timestamp).toLocaleDateString()}</p>
          </div>
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          Load More
        </button>
      )}
    </div>
  );
}
```

### 2. Video Upload and Playback Hooks

```typescript
import { useVideoUpload, useVideoPlayback } from 'share';

// Video upload hook
function VideoUploadComponent() {
  const {
    uploadVideo,
    uploadProgress,
    isUploading,
    error
  } = useVideoUpload();

  const handleFileUpload = async (file: File, mediaDescriptionId: string) => {
    try {
      const videoFile = await uploadVideo(file, mediaDescriptionId);
      console.log('Upload completed:', videoFile);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="video/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'media-id');
        }}
        disabled={isUploading}
      />
      {isUploading && (
        <div>
          <p>Uploading... {Math.round(uploadProgress)}%</p>
          <progress value={uploadProgress} max={100} />
        </div>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

// Video playback hook
function VideoPlayerComponent({ videoId }: { videoId: string }) {
  const {
    videoUrl,
    isLoading,
    error,
    play,
    pause,
    seek,
    currentTime,
    duration,
    isPlaying
  } = useVideoPlayback(videoId);

  if (isLoading) return <div>Loading video...</div>;
  if (error) return <div>Error loading video: {error.message}</div>;

  return (
    <div>
      <video 
        src={videoUrl} 
        onTimeUpdate={(e) => {
          // Handle time updates
        }}
      />
      <div>
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span>{currentTime} / {duration}</span>
      </div>
    </div>
  );
}
```

---

## Storage Management

### 1. Basic Storage Usage

```typescript
import { getStorage, initStorage } from 'share';

// Initialize storage (web)
import { WebAuthStorage } from 'share';
const storage = new WebAuthStorage();
initStorage(storage);

// Use storage
const storage = getStorage();
await storage.setItem('key', 'value');
const value = await storage.getItem('key');
await storage.removeItem('key');
```

### 2. Enhanced Auth Storage

```typescript
import { 
  initAuthStorage, 
  authTokenStorage,
  WebAuthStorage,
  NativeAuthStorage 
} from 'share';

// Web setup
const webStorage = new WebAuthStorage();
initAuthStorage(webStorage);

// React Native setup
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const nativeStorage = new NativeAuthStorage(AsyncStorage, Keychain);
initAuthStorage(nativeStorage);

// Usage (works on both platforms)
await authTokenStorage.setAccessToken('token');
const token = await authTokenStorage.getAccessToken();

await authTokenStorage.setRefreshToken('refresh-token'); // Secure storage
const refreshToken = await authTokenStorage.getRefreshToken();

await authTokenStorage.setUser(JSON.stringify(userData));
const userJson = await authTokenStorage.getUser();

await authTokenStorage.clearAll(); // Clear all auth data
```

### 3. Custom Storage Implementation

```typescript
import { IAuthStorage, ISecureStorage } from 'share';

class CustomStorage implements IAuthStorage, ISecureStorage {
  async getItem(key: string): Promise<string | null> {
    // Your custom implementation
    return customStorageMethod.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    // Your custom implementation
    customStorageMethod.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    // Your custom implementation
    customStorageMethod.remove(key);
  }

  async clear(): Promise<void> {
    // Your custom implementation
    customStorageMethod.clearAll();
  }

  async setSecureItem(key: string, value: string): Promise<void> {
    // Your secure storage implementation
    secureStorageMethod.setSecure(key, value);
  }

  async getSecureItem(key: string): Promise<string | null> {
    // Your secure storage implementation
    return secureStorageMethod.getSecure(key);
  }

  async removeSecureItem(key: string): Promise<void> {
    // Your secure storage implementation
    secureStorageMethod.removeSecure(key);
  }
}

// Use your custom storage
const customStorage = new CustomStorage();
initAuthStorage(customStorage);
```

---

## Validation

### 1. Built-in Validation Schemas

```typescript
import { 
  loginSchema, 
  registerSchema, 
  mediaDescriptionSchema,
  videoFileSchema,
  getValidationErrors 
} from 'share';

// Validate login data
const loginData = { email: 'user@example.com', password: '123' };
const loginErrors = getValidationErrors(loginSchema, loginData);

if (Object.keys(loginErrors).length > 0) {
  console.error('Validation errors:', loginErrors);
  // { password: "Password must be at least 8 characters" }
}

// Validate media description
const mediaData = {
  title: '',
  description: 'Some description',
  // ... other fields
};
const mediaErrors = getValidationErrors(mediaDescriptionSchema, mediaData);
```

### 2. Individual Validation Functions

```typescript
import { 
  validateEmail, 
  validatePassword, 
  validateVideoFile,
  validateUrl,
  validateUUID 
} from 'share';

// Email validation
if (!validateEmail('user@example.com')) {
  console.error('Invalid email');
}

// Password validation
if (!validatePassword('password123')) {
  console.error('Invalid password');
}

// File validation
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const fileValidation = validateVideoFile(file);

if (!fileValidation.isValid) {
  console.error('File validation failed:', fileValidation.error);
}

// URL validation
if (!validateUrl('https://example.com')) {
  console.error('Invalid URL');
}

// UUID validation
if (!validateUUID('123e4567-e89b-12d3-a456-426614174000')) {
  console.error('Invalid UUID');
}
```

### 3. Custom Validation

```typescript
import { z } from 'zod';
import { getValidationErrors } from 'share';

// Create custom schema
const customSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(0, 'Age must be positive').max(120, 'Age must be reasonable'),
  email: z.string().email('Invalid email format'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
});

// Validate data
const data = {
  name: 'John',
  age: 25,
  email: 'john@example.com',
  tags: ['developer', 'react']
};

const errors = getValidationErrors(customSchema, data);
if (Object.keys(errors).length === 0) {
  console.log('Validation passed!');
} else {
  console.error('Validation errors:', errors);
}
```

---

## Platform-Specific Setup

### 1. React Web Application

```typescript
// src/main.tsx or src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApiClient, initAuthStorage, WebAuthStorage } from 'share';
import App from './App';

// Initialize storage
const authStorage = new WebAuthStorage();
initAuthStorage(authStorage);

// Initialize API client
initApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  onAuthError: () => {
    // Handle auth errors - redirect to login
    window.location.href = '/login';
  }
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

### 2. React Native Application

```typescript
// App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { 
  initApiClient, 
  initAuthStorage, 
  NativeAuthStorage 
} from 'share';
import { NavigationContainer } from '@react-navigation/native';
import YourAppNavigator from './src/navigation/AppNavigator';

// Initialize storage
const authStorage = new NativeAuthStorage(AsyncStorage, Keychain);
initAuthStorage(authStorage);

// Initialize API client
initApiClient({
  baseURL: __DEV__ 
    ? 'http://localhost:8000' 
    : 'https://api.kyool-media.com',
  onAuthError: () => {
    // Handle auth errors - navigate to login screen
    // This will depend on your navigation setup
    navigationRef.current?.navigate('Login');
  }
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <YourAppNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
```

### 3. Environment Configuration

```typescript
// config/api.ts (Web)
const config = {
  development: {
    baseURL: 'http://localhost:8000',
  },
  staging: {
    baseURL: 'https://staging-api.kyool-media.com',
  },
  production: {
    baseURL: 'https://api.kyool-media.com',
  }
};

export const apiConfig = config[process.env.NODE_ENV] || config.development;

// config/api.ts (React Native)
const config = {
  development: {
    baseURL: __DEV__ ? 'http://10.0.2.2:8000' : 'https://dev-api.kyool-media.com',
  },
  staging: {
    baseURL: 'https://staging-api.kyool-media.com',
  },
  production: {
    baseURL: 'https://api.kyool-media.com',
  }
};

export const apiConfig = config[__DEV__ ? 'development' : 'production'];
```

---

## Common Patterns

### 1. Protected Routes with Authentication

```typescript
// Web (React Router)
import { useAuth } from 'share';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingUser } = useAuth();
  
  if (isLoadingUser) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// React Native
import { useAuth } from 'share';

function useProtectedNavigation() {
  const { isAuthenticated, isLoadingUser } = useAuth();
  
  return {
    isAuthenticated,
    isLoadingUser,
    canAccess: isAuthenticated && !isLoadingUser
  };
}
```

### 2. Data Fetching with Loading States

```typescript
import { useQuery } from '@tanstack/react-query';
import { mediaApi } from 'share';

function MediaListComponent() {
  const {
    data: mediaList,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['media', 'list'],
    queryFn: () => mediaApi.getMediaDescriptions({
      limit: 20,
      media_type: 'video'
    }),
    enabled: true, // Only fetch when needed
  });

  if (isLoading) return <div>Loading media...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!mediaList?.data.length) return <div>No media found</div>;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {mediaList.data.map(media => (
        <div key={media.id}>
          <h3>{media.episode_title}</h3>
          <p>{media.descriptive_summary_text}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Form Handling with Validation

```typescript
import React, { useState } from 'react';
import { loginSchema, getValidationErrors, useAuth } from 'share';

function LoginForm() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const errors = getValidationErrors(loginSchema, formData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return; // Don't submit if validation fails
    }
    
    try {
      await login(formData);
      // Handle success (redirect, show message, etc.)
    } catch (error) {
      // Error is handled by useAuth hook
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange('email')}
        />
        {validationErrors.email && (
          <span style={{ color: 'red' }}>{validationErrors.email}</span>
        )}
      </div>
      
      <div>
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange('password')}
        />
        {validationErrors.password && (
          <span style={{ color: 'red' }}>{validationErrors.password}</span>
        )}
      </div>
      
      <button type="submit" disabled={isLoggingIn}>
        {isLoggingIn ? 'Logging in...' : 'Login'}
      </button>
      
      {loginError && (
        <div style={{ color: 'red' }}>
          Login failed: {loginError.message}
        </div>
      )}
    </form>
  );
}
```

### 4. Infinite Scrolling with Pagination

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { mediaApi } from 'share';

function InfiniteMediaList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['media', 'infinite'],
    queryFn: ({ pageParam = 0 }) => 
      mediaApi.getMediaDescriptions({
        skip: pageParam,
        limit: 20
      }),
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.length * 20;
      return totalFetched < lastPage.pagination.total 
        ? totalFetched 
        : undefined;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.data.map(media => (
            <div key={media.id}>
              <h3>{media.episode_title}</h3>
              <p>{media.descriptive_summary_text}</p>
            </div>
          ))}
        </div>
      ))}
      
      <div>
        <button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage
            ? 'Loading more...'
            : hasNextPage
            ? 'Load More'
            : 'Nothing more to load'}
        </button>
      </div>
    </div>
  );
}
```

### 5. Admin-Only Components

```typescript
import { useAuth } from 'share';

function AdminOnlyComponent({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  
  if (!isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }
  
  return <>{children}</>;
}

// Usage
function AdminPanel() {
  return (
    <AdminOnlyComponent>
      <h1>Admin Panel</h1>
      <UserManagement />
      <SystemSettings />
    </AdminOnlyComponent>
  );
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. **Storage Not Initialized Error**

```
Error: Storage not initialized. Call initStorage() first.
```

**Solution:**
```typescript
// Make sure to initialize storage before using any APIs
import { initAuthStorage, WebAuthStorage } from 'share';

const authStorage = new WebAuthStorage();
initAuthStorage(authStorage);
```

#### 2. **API Client Not Initialized Error**

```
Error: API client not initialized. Call initApiClient() first.
```

**Solution:**
```typescript
import { initApiClient } from 'share';

initApiClient({
  baseURL: 'https://your-api-url.com',
  onAuthError: () => {
    // Handle auth errors
  }
});
```

#### 3. **React Query Provider Missing**

```
Error: No QueryClient set, use QueryClientProvider to set one
```

**Solution:**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

#### 4. **Network Request Timeout**

```
Error: timeout of 120000ms exceeded
```

**Solution:**
```typescript
// Configure longer timeout in API client
initApiClient({
  baseURL: 'https://your-api-url.com',
  timeout: 60000, // 60 seconds
});
```

#### 5. **Authentication Token Expired**

```
Error: 401 Unauthorized
```

**Solution:**
The package handles token refresh automatically, but if issues persist:

```typescript
import { authApi } from 'share';

// Manually check authentication status
const isAuth = await authApi.isAuthenticated();
if (!isAuth) {
  // Redirect to login
  window.location.href = '/login';
}
```

#### 6. **React Native AsyncStorage Not Found**

```
Error: AsyncStorage not found
```

**Solution:**
```bash
npm install @react-native-async-storage/async-storage
```

For React Native 0.60+, also run:
```bash
cd ios && pod install
```

#### 7. **Cross-Platform Storage Issues**

**Problem:** Storage works on one platform but not another.

**Solution:**
```typescript
// Create platform-specific initialization
const initPlatformStorage = () => {
  if (Platform.OS === 'web') {
    const webStorage = new WebAuthStorage();
    initAuthStorage(webStorage);
  } else {
    const nativeStorage = new NativeAuthStorage(AsyncStorage, Keychain);
    initAuthStorage(nativeStorage);
  }
};

initPlatformStorage();
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Add to your app initialization
if (__DEV__ || process.env.NODE_ENV === 'development') {
  // Enable axios request/response logging
  apiClient.interceptors.request.use(request => {
    console.log('Starting Request:', request);
    return request;
  });

  apiClient.interceptors.response.use(
    response => {
      console.log('Response:', response);
      return response;
    },
    error => {
      console.log('Response Error:', error);
      return Promise.reject(error);
    }
  );
}
```

---

## Best Practices

### 1. **Error Handling**

```typescript
// Always handle errors properly
try {
  const result = await mediaApi.getMediaDescriptions();
  return result;
} catch (error) {
  // Log error for debugging
  console.error('Failed to fetch media:', error);
  
  // Show user-friendly message
  if (error.response?.status === 401) {
    // Handle authentication error
    redirectToLogin();
  } else if (error.response?.status >= 500) {
    // Handle server error
    showMessage('Server error. Please try again later.');
  } else {
    // Handle other errors
    showMessage('Something went wrong. Please try again.');
  }
  
  throw error; // Re-throw if needed
}
```

### 2. **Performance Optimization**

```typescript
// Use React Query for caching and background updates
const { data } = useQuery({
  queryKey: ['media', mediaId],
  queryFn: () => mediaApi.getMediaDescription(mediaId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// Prefetch data when user hovers
const prefetchMedia = (mediaId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['media', mediaId],
    queryFn: () => mediaApi.getMediaDescription(mediaId),
  });
};
```

### 3. **Type Safety**

```typescript
// Always use provided TypeScript types
import type { MediaDescription, User, PaginatedResponse } from 'share';

// Define component props properly
interface MediaCardProps {
  media: MediaDescription;
  onSelect: (media: MediaDescription) => void;
}

// Use proper generic types
const mediaList: PaginatedResponse<MediaDescription> = await mediaApi.getMediaDescriptions();
```

### 4. **Security**

```typescript
// Validate data before API calls
import { getValidationErrors, mediaDescriptionSchema } from 'share';

const handleSubmit = (data: unknown) => {
  const errors = getValidationErrors(mediaDescriptionSchema, data);
  if (Object.keys(errors).length > 0) {
    throw new Error('Invalid data');
  }
  
  // Safe to call API
  return mediaApi.createMediaDescription(data as MediaDescriptionCreate);
};

// Don't store sensitive data in regular storage
// Use secure storage for tokens, credentials
await authTokenStorage.setRefreshToken(token); // Uses secure storage
```

### 5. **Testing**

```typescript
// Mock the shared package in tests
jest.mock('share', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com', full_name: 'Test User' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
  mediaApi: {
    getMediaDescriptions: jest.fn().mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pages: 1, skip: 0, limit: 20 }
    }),
  },
}));
```

### 6. **Code Organization**

```typescript
// Create custom hooks for complex logic
function useMediaManagement() {
  const queryClient = useQueryClient();
  
  const createMedia = useMutation({
    mutationFn: mediaApi.createMediaDescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
  
  const updateMedia = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MediaDescription> }) =>
      mediaApi.updateMediaDescription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
  
  return { createMedia, updateMedia };
}
```

---

## Conclusion

The `packages/share` provides a comprehensive, type-safe, and platform-agnostic way to interact with the Kyool Media backend. By following this guide and the best practices outlined, you can efficiently build robust applications that leverage the full power of the shared package while maintaining code quality and security.

For more advanced usage patterns and API details, refer to the code review document and the actual TypeScript definitions in the package.

---

**Last Updated:** 2025-08-19  
**Package Version:** 1.0.0  
**Compatibility:** React 18.2.0, React Native 0.70+