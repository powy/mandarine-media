import { initApiClient, initAuthStorage, WebAuthStorage } from 'share';

// Initialize the shared API client for backoffice
export const initializeApi = () => {
  // Initialize the web auth storage first
  const webStorage = new WebAuthStorage();
  initAuthStorage(webStorage);

  // Then initialize the API client
  initApiClient({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    onAuthError: () => {
      // Handle auth errors by redirecting to login
      // The auth system will automatically clear tokens
      window.location.href = '/login';
    }
  });
};