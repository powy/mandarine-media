export const config = {
  environment: 'staging',
  apiBaseUrl: 'https://api-staging.kyool.com',
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