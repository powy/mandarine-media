import { BACKEND_URL } from '@env';

export const config = {
  environment: 'development',
  apiBaseUrl: BACKEND_URL || 'http://localhost:8000',
  apiVersion: 'v1',
  auth: {
    tokenKey: 'alpha_access_token',
    refreshTokenKey: 'alpha_refresh_token'
  },
  debug: {
    enableApiLogging: true,
    enableStateLogging: true
  }
};