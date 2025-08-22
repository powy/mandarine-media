import { initApiClient, initAuthStorage, WebAuthStorage } from 'share';

// Initialize the shared API client for backoffice
export const initializeApi = () => {
  // Initialize the web auth storage first
  const webStorage = new WebAuthStorage();
  initAuthStorage(webStorage);

  // Get the backend URL from environment variables
  const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  // Log the API configuration for debugging
  console.log('🔧 Backoffice API initialized with URL:', `${backendURL}/api/v1`);

  // Then initialize the API client
  // v1.9: Updated to include /api/v1 in base URL as per OpenAPI spec
  initApiClient({
    baseURL: `${backendURL}/api/v1`,
    onAuthError: () => {
      // Handle auth errors by redirecting to login
      // The auth system will automatically clear tokens
      window.location.href = '/login';
    }
  });
};