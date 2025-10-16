/**
 * React Hooks for Task Management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';

/**
 * Hook for polling task list
 * @param {number} interval - Polling interval in ms (default: 2000)
 */
export function useTasks(interval = 2000) {
  const [runningTasks, setRunningTasks] = useState([]);
  const [finishedTasks, setFinishedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    try {
      const [running, finished] = await Promise.all([
        apiClient.getRunningTasks(),
        apiClient.getFinishedTasks()
      ]);

      setRunningTasks(running.tasks || []);
      setFinishedTasks(finished.tasks || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchTasks();

    // Set up polling
    intervalRef.current = setInterval(fetchTasks, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTasks, interval]);

  return {
    runningTasks,
    finishedTasks,
    loading,
    error,
    refresh: fetchTasks
  };
}

/**
 * Hook for creating tasks
 */
export function useCreateTask() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const createTask = useCallback(async (type, parameters) => {
    setCreating(true);
    setError(null);

    try {
      const result = await apiClient.createTask(type, parameters);
      return result;
    } catch (err) {
      console.error('Failed to create task:', err);
      setError(err.message);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    createTask,
    creating,
    error,
    clearError: () => setError(null)
  };
}

/**
 * Hook for task log streaming
 * @param {number} taskId - Task ID to monitor
 * @param {number} interval - Polling interval in ms (default: 1000)
 */
export function useTaskLog(taskId, interval = 1000) {
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const offsetRef = useRef(0);
  const intervalRef = useRef(null);

  const fetchLog = useCallback(async () => {
    if (!taskId || isPaused) return;

    try {
      const result = await apiClient.getTaskLog(taskId, offsetRef.current);

      if (result.content) {
        setLog(prev => prev + result.content);
        offsetRef.current = result.offset;
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch log:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskId, isPaused]);

  useEffect(() => {
    if (!taskId) {
      setLog('');
      offsetRef.current = 0;
      setLoading(false);
      return;
    }

    // Reset state when taskId changes
    setLog('');
    offsetRef.current = 0;
    setLoading(true);

    // Initial fetch
    fetchLog();

    // Set up polling
    intervalRef.current = setInterval(fetchLog, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskId, fetchLog, interval]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const clearLog = useCallback(() => {
    setLog('');
  }, []);

  return {
    log,
    loading,
    error,
    isPaused,
    togglePause,
    clearLog
  };
}

/**
 * Hook for stopping a task
 */
export function useStopTask() {
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState(null);

  const stopTask = useCallback(async (taskId) => {
    setStopping(true);
    setError(null);

    try {
      const result = await apiClient.stopTask(taskId);
      return result;
    } catch (err) {
      console.error('Failed to stop task:', err);
      setError(err.message);
      throw err;
    } finally {
      setStopping(false);
    }
  }, []);

  return {
    stopTask,
    stopping,
    error,
    clearError: () => setError(null)
  };
}

/**
 * Hook for health check
 */
export function useHealth(interval = 30000) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const checkHealth = useCallback(async () => {
    try {
      const result = await apiClient.checkHealth();
      setHealth(result);
      setError(null);
    } catch (err) {
      console.error('Health check failed:', err);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up periodic check
    intervalRef.current = setInterval(checkHealth, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkHealth, interval]);

  return {
    health,
    error,
    isHealthy: health?.status === 'healthy'
  };
}
