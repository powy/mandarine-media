export const config = {
  environment: 'production',
  apiBaseUrl: 'https://api.kyool.com',
  apiVersion: 'v1',
  auth: {
    tokenKey: 'alpha_access_token',
    refreshTokenKey: 'alpha_refresh_token'
  },
  debug: {
    enableApiLogging: false,
    enableStateLogging: false
  }
};