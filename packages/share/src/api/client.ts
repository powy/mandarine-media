import axios, { AxiosInstance } from 'axios';

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
  (config) => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem('access_token');
      } catch (storageError) {
        console.warn('Failed to remove token from storage:', storageError);
      }
      
      // Call platform-specific auth error handler
      if (apiConfig.onAuthError) {
        apiConfig.onAuthError();
      }
    }
    return Promise.reject(error);
  }
);