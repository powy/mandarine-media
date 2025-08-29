import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authTokenStorage } from '../utils/storage';
import { isTokenExpired } from '../utils/token-utils';

// Configuration interface for platform-specific settings
interface ApiConfig {
  baseURL: string;
  onAuthError?: () => void;
}

let apiConfig: ApiConfig = {
  baseURL: 'http://localhost:8000/api/v1',  // Default with /api/v1 prefix
};

// Initialize API configuration
export const initApiClient = (config: ApiConfig): void => {
  apiConfig = { ...apiConfig, ...config };
  apiClient.defaults.baseURL = config.baseURL;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Enhanced logging for debugging
    console.log('🔍 API Client: Making request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullUrl: `${config.baseURL}${config.url}`,
      params: config.params,
      timestamp: new Date().toISOString()
    });
    
    try {
      const token = await authTokenStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 API Client: Auth token added to request');
      } else {
        console.warn('⚠️ API Client: No auth token found for request:', config.url);
      }
    } catch (error) {
      console.warn('❌ API Client: Failed to get token from storage:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ API Client: Request interceptor error:', error);
    return Promise.reject(error);
  }
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
  (response: AxiosResponse) => {
    // Log successful responses for debugging
    console.log('✅ API Client: Response received:', {
      status: response.status,
      url: response.config?.url,
      method: response.config?.method?.toUpperCase(),
      dataSize: typeof response.data === 'object' ? Object.keys(response.data).length : 'N/A',
      timestamp: new Date().toISOString()
    });
    return response;
  },
  async (error) => {
    console.error('❌ API Client: Error intercepted:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      errorData: error.response?.data,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    });
    
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
        const currentToken = await authTokenStorage.getAccessToken();
        
        if (currentToken && isTokenExpired(currentToken)) {
          // Try to refresh the token
          const refreshToken = await authTokenStorage.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await apiClient.post('/auth/refresh', {
            refresh_token: refreshToken,
          });

          // Store new tokens
          await authTokenStorage.setAccessToken(response.data.access_token);
          if (response.data.refresh_token) {
            await authTokenStorage.setRefreshToken(response.data.refresh_token);
          }

          const newAccessToken = response.data.access_token;
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