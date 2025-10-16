/**
 * LowDB Database Layer for Task Management
 * Handles all database operations for the service-server
 * Using LowDB for pure JavaScript, no C++ dependencies
 */

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaskDatabase {
  constructor(dbPath = null) {
    if (!dbPath) {
      // Use configured data directory from CONFIG
      const dataDir = CONFIG.PATHS.DATA_DIR;
      fs.ensureDirSync(dataDir);
      dbPath = path.join(dataDir, 'tasks.json');
    } else {
      // Ensure directory exists for provided path
      fs.ensureDirSync(path.dirname(dbPath));
    }

    this.dbPath = dbPath;
    this.adapter = new JSONFile(dbPath);
    this.db = new Low(this.adapter, { tasks: [], nextId: 1 });
    this.initialized = false;
  }

  /**
   * Initialize database - must be called before use
   */
  async initialize() {
    if (this.initialized) return;

    await this.db.read();

    // Initialize default data structure if file is empty
    if (!this.db.data) {
      this.db.data = { tasks: [], nextId: 1 };
      await this.db.write();
    }

    // Ensure tasks array exists
    if (!this.db.data.tasks) {
      this.db.data.tasks = [];
    }

    // Ensure nextId exists
    if (!this.db.data.nextId) {
      const maxId = this.db.data.tasks.reduce((max, task) => Math.max(max, task.id || 0), 0);
      this.db.data.nextId = maxId + 1;
    }

    this.initialized = true;
    console.log('Database initialized successfully');
  }

  /**
   * Ensure database is initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Create a new task
   * @param {string} type - Task type
   * @param {object} parameters - Task parameters
   * @param {string} logFile - Log file path
   * @returns {number} Task ID
   */
  async createTask(type, parameters, logFile) {
    await this._ensureInitialized();

    const taskId = this.db.data.nextId++;
    const task = {
      id: taskId,
      type,
      status: 'queued',
      parameters: JSON.stringify(parameters),
      log_file: logFile,
      pid: null,
      created_at: Date.now(),
      started_at: null,
      completed_at: null,
      error_message: null,
      progress: 0
    };

    this.db.data.tasks.push(task);
    await this.db.write();

    return taskId;
  }

  /**
   * Update task status
   * @param {number} taskId - Task ID
   * @param {string} status - New status
   * @param {object} updates - Additional fields to update
   */
  async updateTaskStatus(taskId, status, updates = {}) {
    await this._ensureInitialized();

    const task = this.db.data.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.status = status;

    if (status === 'processing' && !updates.started_at) {
      task.started_at = Date.now();
    }

    if (['success', 'failed', 'canceled', 'partial'].includes(status) && !updates.completed_at) {
      task.completed_at = Date.now();
    }

    if (updates.pid !== undefined) {
      task.pid = updates.pid;
    }

    if (updates.error_message !== undefined) {
      task.error_message = updates.error_message;
    }

    if (updates.progress !== undefined) {
      task.progress = updates.progress;
    }

    await this.db.write();
  }

  /**
   * Get task by ID
   * @param {number} taskId - Task ID
   * @returns {object|null} Task object
   */
  async getTask(taskId) {
    await this._ensureInitialized();

    const task = this.db.data.tasks.find(t => t.id === taskId);
    if (!task) return null;

    // Parse parameters if they're a string
    const taskCopy = { ...task };
    if (taskCopy.parameters && typeof taskCopy.parameters === 'string') {
      try {
        taskCopy.parameters = JSON.parse(taskCopy.parameters);
      } catch (e) {
        // If parsing fails, leave as is
      }
    }

    return taskCopy;
  }

  /**
   * List all tasks with optional filtering
   * @param {object} filters - Filter options
   * @returns {array} Array of tasks
   */
  async listTasks(filters = {}) {
    await this._ensureInitialized();

    let tasks = [...this.db.data.tasks];

    // Filter by status
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        tasks = tasks.filter(t => filters.status.includes(t.status));
      } else {
        tasks = tasks.filter(t => t.status === filters.status);
      }
    }

    // Filter by type
    if (filters.type) {
      tasks = tasks.filter(t => t.type === filters.type);
    }

    // Sort by created_at DESC
    tasks.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    // Apply limit
    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    // Parse parameters JSON
    return tasks.map(task => {
      const taskCopy = { ...task };
      if (taskCopy.parameters && typeof taskCopy.parameters === 'string') {
        try {
          taskCopy.parameters = JSON.parse(taskCopy.parameters);
        } catch (e) {
          // If parsing fails, leave as is
        }
      }
      return taskCopy;
    });
  }

  /**
   * Delete a task
   * @param {number} taskId - Task ID
   */
  async deleteTask(taskId) {
    await this._ensureInitialized();

    const index = this.db.data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      this.db.data.tasks.splice(index, 1);
      await this.db.write();
    }
  }

  /**
   * Get running tasks (processing or queued)
   * @returns {array} Array of running tasks
   */
  async getRunningTasks() {
    return this.listTasks({ status: ['queued', 'processing'] });
  }

  /**
   * Get finished tasks
   * @returns {array} Array of finished tasks
   */
  async getFinishedTasks() {
    return this.listTasks({ status: ['success', 'failed', 'canceled', 'partial'] });
  }

  /**
   * Mark orphaned processing tasks as canceled (for startup cleanup)
   */
  async cleanupOrphanedTasks() {
    await this._ensureInitialized();

    let changedCount = 0;
    const now = Date.now();

    for (const task of this.db.data.tasks) {
      if (task.status === 'processing' || task.status === 'queued') {
        task.status = 'canceled';
        task.completed_at = now;
        task.error_message = 'Server restarted while task was running';
        changedCount++;
      }
    }

    if (changedCount > 0) {
      await this.db.write();
      console.log(`Cleaned up ${changedCount} orphaned tasks`);
    }

    return changedCount;
  }

  /**
   * Get task count by status
   * @returns {object} Status counts
   */
  async getTaskStats() {
    await this._ensureInitialized();

    const stats = {
      total: this.db.data.tasks.length,
      queued: 0,
      processing: 0,
      success: 0,
      failed: 0,
      canceled: 0,
      partial: 0
    };

    for (const task of this.db.data.tasks) {
      if (stats[task.status] !== undefined) {
        stats[task.status]++;
      }
    }

    return stats;
  }

  /**
   * Close database connection (for compatibility, LowDB doesn't need closing)
   */
  close() {
    // LowDB doesn't require explicit closing
    this.initialized = false;
  }
}

export default TaskDatabase;
