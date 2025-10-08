// Task status types
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Main task interface
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

// Health check response interface
export interface HealthData {
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

// Generic query result interface (similar to React Query)
export interface UseQueryResult<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
}

// Upload task configuration
export interface UploadTaskConfig {
  configPath: string;
  folderPath: string;
  taskType: string;
}

// Server response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TaskResponse extends ApiResponse<Task> {}
export interface TasksResponse extends ApiResponse<Task[]> {}
export interface HealthResponse extends ApiResponse<HealthData> {}