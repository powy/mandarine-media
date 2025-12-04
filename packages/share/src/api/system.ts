import axios from 'axios';
import { apiClient } from './client';

/**
 * System info response from root endpoint
 */
export interface SystemInfo {
  message: string; // e.g., "KYOOL Media Platform API v1.10.0"
}

/**
 * Health status response
 */
export interface HealthStatus {
  status: string; // e.g., "healthy"
}

/**
 * Server version response from /api/v1/system/version
 */
export interface ServerVersion {
  version: string; // e.g., "1.10.0"
}

/**
 * Runtime check result
 */
export interface RuntimeCheck {
  status: 'ok' | 'error' | 'not_configured';
  message: string;
}

/**
 * Environment variables response from /api/v1/system/env-vars (admin only)
 */
export interface EnvVarsResponse {
  environment_variables: Record<string, any>;
  runtime_checks: {
    database: RuntimeCheck;
    s3: RuntimeCheck;
    mux: RuntimeCheck;
  };
  sensitive_fields_excluded: string[];
}

/**
 * Get system version information from root endpoint
 * Note: This endpoint is at root level, not under /api/v1
 * Public - no authentication required
 */
export const getSystemInfo = async (): Promise<SystemInfo> => {
  // Get base URL without /api/v1 suffix
  const baseUrl = apiClient.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
  const response = await axios.get<SystemInfo>(`${baseUrl}/`);
  return response.data;
};

/**
 * Check backend health status
 * Note: This endpoint is at root level, not under /api/v1
 * Public - no authentication required
 */
export const getHealthStatus = async (): Promise<HealthStatus> => {
  const baseUrl = apiClient.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
  const response = await axios.get<HealthStatus>(`${baseUrl}/health`);
  return response.data;
};

/**
 * Get server version from /api/v1/system/version
 * Public - no authentication required
 */
export const getServerVersion = async (): Promise<ServerVersion> => {
  const response = await apiClient.get<ServerVersion>('/system/version');
  return response.data;
};

/**
 * Get environment variables and runtime checks
 * Admin only - requires authentication with admin privileges
 */
export const getEnvVars = async (): Promise<EnvVarsResponse> => {
  const response = await apiClient.get<EnvVarsResponse>('/system/env-vars');
  return response.data;
};

/**
 * Extract version number from system info message
 * Example: "KYOOL Media Platform API v1.10.0" -> "1.10.0"
 *
 * @param message The system info message
 * @returns The version number or "unknown" if not found
 */
export const parseVersionFromMessage = (message: string): string => {
  const versionMatch = message.match(/v([\d.]+)/);
  return versionMatch ? versionMatch[1] : 'unknown';
};
