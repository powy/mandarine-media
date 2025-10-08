/**
 * Task Manager
 * Manages task lifecycle, state tracking, and task registry
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export const TASK_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

export const TASK_TYPES = {
  MEDIA_ANALYZER: 'media-analyzer',
  MUX_UPLOAD: 'mux-upload',
  PICTURE_UPLOAD: 'picture-upload',
  SINGLE_PICTURE_UPLOAD: 'single-picture-upload',
  BATCH_PICTURE_UPLOAD: 'batch-picture-upload',
  EXCEL_PREPARATION: 'excel-preparation',
  BATCH_EXCEL_PREPARATION: 'batch-excel-preparation',
  SINGLE_UPLOAD: 'single-upload',
  BATCH_UPLOAD: 'batch-upload',
  PARALLEL_UPLOAD: 'parallel-upload',
  EXCEL_BULK_EDIT: 'excel-bulk-edit',
  MUX_SUBTITLE_UPLOAD: 'mux-subtitle-upload',
  SUBTITLE_SPECIFIC_UPLOAD: 'subtitle-specific-upload',
  PROPAGATE_SEASON_DATA: 'propagate-season-data'
};

class TaskInfo {
  constructor(type, request, options = {}) {
    this.id = uuidv4();
    this.type = type;
    this.status = TASK_STATES.PENDING;
    this.request = request;
    this.result = null;
    this.error = null;
    this.progress = 0;
    this.message = null;

    // Timestamps
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.startedAt = null;
    this.completedAt = null;

    // Process information
    this.processId = null;
    this.processInfo = null;

    // Options
    this.timeout = options.timeout || 43200000; // 12 hours default
    this.retryCount = options.retryCount || 0;
    this.maxRetries = options.maxRetries || 0;

    // Metadata
    this.metadata = options.metadata || {};
  }

  update(updates) {
    Object.assign(this, updates);
    this.updatedAt = new Date().toISOString();

    // Set completion timestamp when task finishes
    if ([TASK_STATES.COMPLETED, TASK_STATES.FAILED, TASK_STATES.CANCELLED].includes(this.status)) {
      this.completedAt = this.completedAt || new Date().toISOString();
    }

    // Set started timestamp when task starts running
    if (this.status === TASK_STATES.RUNNING && !this.startedAt) {
      this.startedAt = new Date().toISOString();
    }
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      progress: this.progress,
      message: this.message,
      result: this.result,
      error: this.error,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      processId: this.processId,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      metadata: this.metadata
    };
  }

  getDuration() {
    if (!this.startedAt) return null;

    const endTime = this.completedAt
      ? new Date(this.completedAt)
      : new Date();

    return endTime.getTime() - new Date(this.startedAt).getTime();
  }

  isFinished() {
    return [TASK_STATES.COMPLETED, TASK_STATES.FAILED, TASK_STATES.CANCELLED].includes(this.status);
  }

  isActive() {
    return [TASK_STATES.PENDING, TASK_STATES.RUNNING].includes(this.status);
  }
}

class TaskManager extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map(); // taskId -> TaskInfo
    this.maxTasks = 1000; // Maximum tasks to keep in memory
    this.cleanupInterval = null;

    this.startCleanup();
  }

  /**
   * Create a new task
   */
  createTask(type, request, options = {}) {
    if (!Object.values(TASK_TYPES).includes(type)) {
      throw new Error(`Invalid task type: ${type}`);
    }

    const task = new TaskInfo(type, request, options);
    this.tasks.set(task.id, task);

    this.emit('task:created', task);
    return task;
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Update task status and information
   */
  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const oldStatus = task.status;
    task.update(updates);

    // Emit status change events
    if (oldStatus !== task.status) {
      this.emit('task:statusChanged', task, oldStatus);
      this.emit(`task:${task.status}`, task);
    }

    this.emit('task:updated', task);
    return task;
  }

  /**
   * Mark task as started
   */
  startTask(taskId, processId = null) {
    return this.updateTask(taskId, {
      status: TASK_STATES.RUNNING,
      processId: processId,
      message: 'Task started'
    });
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId, result = null, message = 'Task completed successfully') {
    return this.updateTask(taskId, {
      status: TASK_STATES.COMPLETED,
      result: result,
      message: message,
      progress: 100
    });
  }

  /**
   * Mark task as failed
   */
  failTask(taskId, error, message = 'Task failed') {
    return this.updateTask(taskId, {
      status: TASK_STATES.FAILED,
      error: error instanceof Error ? error.message : error,
      message: message
    });
  }

  /**
   * Mark task as cancelled
   */
  cancelTask(taskId, message = 'Task cancelled') {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.isFinished()) {
      return task; // Already finished, nothing to cancel
    }

    return this.updateTask(taskId, {
      status: TASK_STATES.CANCELLED,
      message: message
    });
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId, progress, message = null) {
    const updates = { progress: Math.max(0, Math.min(100, progress)) };
    if (message) updates.message = message;

    return this.updateTask(taskId, updates);
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status) {
    return this.getAllTasks().filter(task => task.status === status);
  }

  /**
   * Get pending tasks
   */
  getPendingTasks() {
    return this.getTasksByStatus(TASK_STATES.PENDING);
  }

  /**
   * Get running tasks
   */
  getRunningTasks() {
    return this.getTasksByStatus(TASK_STATES.RUNNING);
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks() {
    return this.getTasksByStatus(TASK_STATES.COMPLETED);
  }

  /**
   * Get failed tasks
   */
  getFailedTasks() {
    return this.getTasksByStatus(TASK_STATES.FAILED);
  }

  /**
   * Get cancelled tasks
   */
  getCancelledTasks() {
    return this.getTasksByStatus(TASK_STATES.CANCELLED);
  }

  /**
   * Get tasks by type
   */
  getTasksByType(type) {
    return this.getAllTasks().filter(task => task.type === type);
  }

  /**
   * Get active tasks (pending or running)
   */
  getActiveTasks() {
    return this.getAllTasks().filter(task => task.isActive());
  }

  /**
   * Get finished tasks
   */
  getFinishedTasks() {
    return this.getAllTasks().filter(task => task.isFinished());
  }

  /**
   * Cancel all active tasks
   */
  cancelAllActiveTasks() {
    const activeTasks = this.getActiveTasks();
    const cancelledTasks = [];

    for (const task of activeTasks) {
      try {
        this.cancelTask(task.id, 'Bulk cancellation requested');
        cancelledTasks.push(task);
      } catch (error) {
        // Continue with other tasks
      }
    }

    return cancelledTasks;
  }

  /**
   * Remove task from registry
   */
  removeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.delete(taskId);
      this.emit('task:removed', task);
      return true;
    }
    return false;
  }

  /**
   * Clear all tasks
   */
  clearAllTasks() {
    const taskCount = this.tasks.size;
    this.tasks.clear();
    this.emit('tasks:cleared', taskCount);
    return taskCount;
  }

  /**
   * Clear finished tasks
   */
  clearFinishedTasks() {
    const finishedTasks = this.getFinishedTasks();
    let clearedCount = 0;

    for (const task of finishedTasks) {
      if (this.removeTask(task.id)) {
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Get task statistics
   */
  getStatistics() {
    const allTasks = this.getAllTasks();
    const stats = {
      total: allTasks.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      byType: {},
      avgDuration: 0,
      totalDuration: 0
    };

    let totalDuration = 0;
    let completedWithDuration = 0;

    for (const task of allTasks) {
      stats[task.status]++;

      // Count by type
      if (!stats.byType[task.type]) {
        stats.byType[task.type] = { total: 0, completed: 0, failed: 0 };
      }
      stats.byType[task.type].total++;
      if (task.status === TASK_STATES.COMPLETED) stats.byType[task.type].completed++;
      if (task.status === TASK_STATES.FAILED) stats.byType[task.type].failed++;

      // Calculate duration for completed tasks
      if (task.isFinished() && task.startedAt) {
        const duration = task.getDuration();
        if (duration) {
          totalDuration += duration;
          completedWithDuration++;
        }
      }
    }

    stats.totalDuration = totalDuration;
    stats.avgDuration = completedWithDuration > 0 ? Math.round(totalDuration / completedWithDuration) : 0;

    return stats;
  }

  /**
   * Start periodic cleanup of old finished tasks
   */
  startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up old tasks to prevent memory leaks
   */
  cleanup() {
    const allTasks = this.getAllTasks();

    if (allTasks.length <= this.maxTasks) return;

    // Sort tasks by completion time (oldest first)
    const finishedTasks = this.getFinishedTasks()
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

    // Remove oldest finished tasks to get under the limit
    const tasksToRemove = Math.max(0, allTasks.length - this.maxTasks);
    const removed = finishedTasks.slice(0, Math.min(tasksToRemove, finishedTasks.length));

    for (const task of removed) {
      this.removeTask(task.id);
    }

    if (removed.length > 0) {
      this.emit('tasks:cleanup', removed.length);
    }
  }

  /**
   * Destroy the task manager
   */
  destroy() {
    this.stopCleanup();
    this.clearAllTasks();
    this.removeAllListeners();
  }
}

export default TaskManager;