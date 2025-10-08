import { useState, useEffect } from 'react';

// Types for the uploader tasks
export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  progress?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

interface HealthData {
  uptime: number;
  tasks: {
    total: number;
    running: number;
    pending: number;
    completed: number;
    failed: number;
  };
  memory?: {
    used: number;
    total: number;
  };
}

interface UseQueryResult<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
}

// Base server URL - could be configurable
const SERVER_BASE_URL = 'http://localhost:3039';
const API_BASE_URL = 'http://localhost:3039/api/v1';

// Custom hook to check uploader server health
export function useUploaderHealth(): UseQueryResult<HealthData> {
  const [data, setData] = useState<HealthData>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchHealth = async (isInitial = false) => {
      try {
        if (isInitial) {
          setIsLoading(true);
        }
        const response = await fetch(`${SERVER_BASE_URL}/health`);
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.statusText}`);
        }
        const healthData = await response.json();
        setData(healthData);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(undefined);
      } finally {
        if (isInitial) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchHealth(true);

    // Poll every 5 seconds
    interval = setInterval(() => fetchHealth(false), 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return { data, error, isLoading };
}

interface UseUploaderTasksParams {
  status?: string;
  limit?: number;
}

// Custom hook to get uploader tasks
export function useUploaderTasks(params?: UseUploaderTasksParams): UseQueryResult<Task[]> & { refetch: () => void } {
  const [data, setData] = useState<Task[]>([]);
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_BASE_URL}/tasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      const tasks = await response.json();
      setData(Array.isArray(tasks) ? tasks : []);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Initial fetch
    fetchTasks();

    // Poll every 2 seconds for task updates
    interval = setInterval(fetchTasks, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [params?.status, params?.limit]);

  return { data, error, isLoading, refetch: fetchTasks };
}

// Custom hook to cancel a specific task
export function useCancelTask() {
  const [isLoading, setIsLoading] = useState(false);

  const cancelTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to cancel task: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error cancelling task:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cancelTask,
    isLoading,
    isPending: isLoading, // React Query v5 compatibility
    mutate: cancelTask, // React Query mutation interface compatibility
  };
}

// Custom hook to cancel all tasks
export function useCancelAllTasks() {
  const [isLoading, setIsLoading] = useState(false);

  const cancelAllTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/cancel-all`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to cancel all tasks: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error cancelling all tasks:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cancelAllTasks,
    isLoading,
    isPending: isLoading, // React Query v5 compatibility
    mutate: cancelAllTasks, // React Query mutation interface compatibility
  };
}

// Custom hook to start a new upload task
export function useStartUploadTask() {
  const [isLoading, setIsLoading] = useState(false);

  const startUpload = async (config: {
    configPath: string;
    folderPath: string;
    taskType: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error(`Failed to start upload: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error starting upload task:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    startUpload,
    isLoading,
    isPending: isLoading, // React Query v5 compatibility
    mutate: startUpload, // React Query mutation interface compatibility
  };
}

// Utility function to sanitize paths by removing invisible Unicode control characters
function sanitizePath(path: string): string {
  if (!path) return path;

  // Remove invisible Unicode control characters (including Left-to-Right Mark U+202A)
  // This includes the range U+200B to U+202F which covers various invisible characters
  let sanitized = path
    .replace(/[\u200B-\u202F]/g, '') // Remove invisible Unicode control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .trim(); // Remove leading/trailing whitespace

  // Normalize Windows paths for JSON safety - convert backslashes to forward slashes
  // This prevents JSON parsing issues with escaped backslashes
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove any double slashes except for protocol prefixes
  sanitized = sanitized.replace(/([^:]\/)\/+/g, '$1');

  return sanitized;
}

// Utility function to safely escape JSON strings, especially Windows file paths
function safeJsonStringify(obj: any): string {
  try {
    // First pass: normalize any backslashes in paths for JSON compatibility
    const normalizedObj = JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'string' && (key.toLowerCase().includes('path') || key.toLowerCase().includes('file'))) {
        // For Windows paths, ensure proper escaping without double-escaping
        return value.replace(/\\/g, '/');
      }
      return value;
    }));

    // Second pass: create the final JSON string
    return JSON.stringify(normalizedObj);
  } catch (error) {
    console.error('JSON stringify error:', error);
    // Fallback: create a safe version with escaped paths
    const safeObj = { ...obj };
    Object.keys(safeObj).forEach(key => {
      if (typeof safeObj[key] === 'string' && (key.toLowerCase().includes('path') || key.toLowerCase().includes('file'))) {
        safeObj[key] = safeObj[key].replace(/\\/g, '/');
      }
    });
    return JSON.stringify(safeObj);
  }
}

// Generic hook for media uploader commands
function useUploaderCommand(command: string) {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (config: { configPath?: string; folderPath?: string; config?: { configPath: string }; [key: string]: any }) => {
    setIsLoading(true);
    try {
      // Handle both direct configPath and nested config.configPath patterns
      const normalizedConfig = {
        ...config,
        configPath: sanitizePath(config.configPath || config.config?.configPath || ''),
        folderPath: sanitizePath(config.folderPath || ''),
      };

      // Sanitize subtitle path if present
      if (normalizedConfig.subtitlePath) {
        normalizedConfig.subtitlePath = sanitizePath(normalizedConfig.subtitlePath);
      }

      // Remove the nested config object if it exists
      if (normalizedConfig.config) {
        delete normalizedConfig.config;
      }

      console.log(`Sending ${command} request:`, normalizedConfig);

      let requestBody;
      try {
        requestBody = safeJsonStringify(normalizedConfig);
        console.log(`${command} request body:`, requestBody);
      } catch (jsonError) {
        console.error('Failed to stringify request:', jsonError, normalizedConfig);
        throw new Error(`Invalid request data for ${command}: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'}`);
      }

      const response = await fetch(`${API_BASE_URL}/commands/${command}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (!response.ok) {
        let errorMessage = `Failed to execute ${command}: ${response.statusText}`;
        let errorDetails = '';
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = `${command} failed: ${errorData.message}`;
          }
          if (errorData.details) {
            errorDetails = ` (${errorData.details})`;
          }
          console.error(`${command} server error:`, errorData);
        } catch (e) {
          // If we can't parse error response, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorDetails = ` (${errorText.substring(0, 200)})`;
            }
          } catch (textError) {
            console.error('Could not parse error response:', textError);
          }
        }
        throw new Error(errorMessage + errorDetails);
      }

      const result = await response.json();
      console.log(`${command} success:`, result);
      return result;
    } catch (error) {
      console.error(`Error executing ${command}:`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    isPending: isLoading, // React Query v5 compatibility
    mutate: execute, // React Query mutation interface compatibility
  };
}

// Individual command hooks
export function useMediaAnalyzer() {
  return useUploaderCommand('media-analyzer');
}

export function useMuxUpload() {
  return useUploaderCommand('mux-upload');
}

export function usePictureUpload() {
  return useUploaderCommand('picture-upload');
}

export function useSubtitleUpload() {
  return useUploaderCommand('subtitle-upload');
}

export function useSingleUpload() {
  return useUploaderCommand('single-upload');
}

export function useBatchUpload() {
  return useUploaderCommand('batch-upload');
}

export function useParallelUpload() {
  return useUploaderCommand('parallel-upload');
}

export function useExcelPrepare() {
  return useUploaderCommand('excel-prepare');
}

export function useBatchExcelPrepare() {
  return useUploaderCommand('batch-excel-prepare');
}

export function useExcelBulkEdit() {
  return useUploaderCommand('excel-bulk-edit');
}

// Custom hook for single picture upload with format detection
export function useSinglePictureUpload() {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (config: {
    picturePath: string;
    folderPath: string;
    configPath?: string;
    [key: string]: any
  }) => {
    setIsLoading(true);
    try {
      const requestBody = {
        picturePath: config.picturePath,
        folderPath: config.folderPath,
        config: config.configPath ? { configPath: config.configPath } : config.config || {},
        options: {
          detectFormat: true,
          requireExcelId: true,
          ...config.options
        }
      };

      const response = await fetch(`${API_BASE_URL}/uploads/single-picture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Failed to upload single picture: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading single picture:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    isPending: isLoading,
    mutate: execute, // For compatibility with existing patterns
  };
}

// Custom hook for batch picture upload with subfolder association
export function useBatchPictureUpload() {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (config: {
    picturePath: string;
    parentFolderPath: string;
    configPath?: string;
    [key: string]: any
  }) => {
    setIsLoading(true);
    try {
      const requestBody = {
        picturePath: config.picturePath,
        parentFolderPath: config.parentFolderPath,
        config: config.configPath ? { configPath: config.configPath } : config.config || {},
        options: {
          detectFormat: true,
          requireExcelId: true,
          continueOnError: true,
          pattern: '0_desc',
          ...config.options
        }
      };

      const response = await fetch(`${API_BASE_URL}/uploads/batch-picture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Failed to upload batch picture: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading batch picture:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    isPending: isLoading,
    mutate: execute, // For compatibility with existing patterns
  };
}

// Custom hook for propagating season data to episodes
export function usePropagateSeasonData() {
  return useUploaderCommand('propagate-season-data');
}