import { initApiClient } from 'share';

// Initialize the shared API client for backoffice
export const initializeApi = () => {
  initApiClient({
    baseURL: 'http://localhost:8000',
    onAuthError: () => {
      // Handle auth errors by redirecting to login
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
  });
};