export const config = {
  environment: 'staging',
  apiBaseUrl: 'http://203.0.113.10',
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