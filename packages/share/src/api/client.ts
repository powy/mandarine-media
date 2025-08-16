import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authTokenStorage } from '../utils/storage';

// Configuration interface for platform-specific settings
interface ApiConfig {
  baseURL: string;
  onAuthError?: () => void;
}

let apiConfig: ApiConfig = {
  baseURL: 'http://localhost:8000',
};

// Initialize API configuration
export const initApiClient = (config: ApiConfig): void => {
  apiConfig = { ...apiConfig, ...config };
  apiClient.defaults.baseURL = config.baseURL;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await authTokenStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('API Client: No auth token found for request:', config.url);
      }
    } catch (error) {
      console.warn('Failed to get token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track refresh token requests to avoid multiple simultaneous requests
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor for auth errors with token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    console.log('API Client: Error intercepted:', error.response?.status, error.response?.data);
    console.log('API Client: Error URL:', error.config?.url);
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Import authApi here to avoid circular dependency
        const { authApi } = await import('./auth');
        const currentToken = await authTokenStorage.getAccessToken();
        
        if (currentToken && authApi.isTokenExpired(currentToken)) {
          // Try to refresh the token
          const newTokens = await authApi.refreshToken();
          const newAccessToken = newTokens.access_token;
          
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        
        // Clear tokens and call auth error handler
        try {
          await authTokenStorage.clearAll();
        } catch (storageError) {
          console.warn('Failed to clear tokens:', storageError);
        }
        
        if (apiConfig.onAuthError) {
          apiConfig.onAuthError();
        }
      } finally {
        isRefreshing = false;
      }
    } else if (error.response?.status === 401) {
      // If retry already attempted or no refresh available, clear tokens
      try {
        await authTokenStorage.clearAll();
      } catch (storageError) {
        console.warn('Failed to clear tokens:', storageError);
      }
      
      if (apiConfig.onAuthError) {
        apiConfig.onAuthError();
      }
    }
    
    return Promise.reject(error);
  }
);