import fs from 'fs-extra';
import path from 'path';
import chokidar from 'chokidar';

/**
 * ProgressTracker monitors progress files from worker processes
 * and provides real-time updates to the GUI
 */
export class ProgressTracker {
  constructor(progressDir) {
    this.progressDir = progressDir;
    this.watchers = new Map(); // taskId -> watcher
    this.callbacks = new Map(); // taskId -> callback function
    this.progressData = new Map(); // taskId -> latest progress data
    this.globalWatcher = null;

    this.initialize();
  }

  async initialize() {
    // Ensure progress directory exists
    await fs.ensureDir(this.progressDir);

    // Start global file watcher
    this.startGlobalWatcher();
  }

  /**
   * Start global watcher for all progress files
   */
  startGlobalWatcher() {
    const pattern = path.join(this.progressDir, '*.json');

    this.globalWatcher = chokidar.watch(pattern, {
      ignoreInitial: false,
      persistent: true,
      usePolling: false,
      interval: 1000,
      binaryInterval: 3000,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    this.globalWatcher.on('add', (filePath) => {
      this.handleFileChange(filePath, 'add');
    });

    this.globalWatcher.on('change', (filePath) => {
      this.handleFileChange(filePath, 'change');
    });

    this.globalWatcher.on('unlink', (filePath) => {
      this.handleFileChange(filePath, 'unlink');
    });

    this.globalWatcher.on('error', (error) => {
      console.error('Progress watcher error:', error);
    });

    console.log(`📊 Progress tracker watching: ${pattern}`);
  }

  /**
   * Handle file system changes
   * @param {string} filePath - Path to changed file
   * @param {string} event - Event type (add/change/unlink)
   */
  async handleFileChange(filePath, event) {
    try {
      const taskId = path.basename(filePath, '.json');

      if (event === 'unlink') {
        // File deleted
        this.progressData.delete(taskId);
        this.notifyCallback(taskId, null, 'deleted');
        return;
      }

      // Read and parse progress file
      const progressData = await this.readProgressFile(filePath);

      if (progressData) {
        this.progressData.set(taskId, progressData);
        this.notifyCallback(taskId, progressData, event);
      }

    } catch (error) {
      console.error(`Error handling progress file change: ${filePath}`, error.message);
    }
  }

  /**
   * Read and parse progress file
   * @param {string} filePath - Path to progress file
   * @returns {Object|null} Progress data
   */
  async readProgressFile(filePath) {
    try {
      const data = await fs.readJson(filePath);

      // Validate progress data structure
      if (this.validateProgressData(data)) {
        return data;
      } else {
        console.warn(`Invalid progress data structure in: ${filePath}`);
        return null;
      }

    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to read progress file: ${filePath}`, error.message);
      }
      return null;
    }
  }

  /**
   * Validate progress data structure
   * @param {Object} data - Progress data to validate
   * @returns {boolean} Whether data is valid
   */
  validateProgressData(data) {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.taskId === 'string' &&
      typeof data.folderPath === 'string'
    );
  }

  /**
   * Watch progress for a specific task
   * @param {string} taskId - Task ID to watch
   * @param {Function} callback - Callback function for progress updates
   */
  watchProgress(taskId, callback) {
    this.callbacks.set(taskId, callback);

    // If we already have progress data for this task, send it immediately
    const existingData = this.progressData.get(taskId);
    if (existingData) {
      callback(existingData, 'existing');
    }

    console.log(`👀 Watching progress for task: ${taskId}`);
  }

  /**
   * Stop watching progress for a specific task
   * @param {string} taskId - Task ID to stop watching
   */
  stopWatching(taskId) {
    this.callbacks.delete(taskId);
    console.log(`🛑 Stopped watching progress for task: ${taskId}`);
  }

  /**
   * Get current progress for a task
   * @param {string} taskId - Task ID
   * @returns {Object|null} Current progress data
   */
  getProgress(taskId) {
    return this.progressData.get(taskId) || null;
  }

  /**
   * Get progress for all tasks
   * @returns {Object} Map of taskId -> progress data
   */
  getAllProgress() {
    return Object.fromEntries(this.progressData);
  }

  /**
   * Get overall progress summary
   * @returns {Object} Overall progress statistics
   */
  getOverallProgress() {
    const allProgress = Array.from(this.progressData.values());

    if (allProgress.length === 0) {
      return {
        total: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        queued: 0,
        averagePercentage: 0,
        totalPercentage: 0
      };
    }

    const stats = {
      total: allProgress.length,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      queued: 0,
      averagePercentage: 0,
      totalPercentage: 0
    };

    let totalPercentage = 0;

    for (const progress of allProgress) {
      const status = progress.status || 'unknown';
      const percentage = progress.percentage || 0;

      switch (status) {
        case 'running':
        case 'initializing':
          stats.running++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'queued':
          stats.queued++;
          break;
      }

      totalPercentage += percentage;
    }

    stats.averagePercentage = Math.round(totalPercentage / stats.total);
    stats.totalPercentage = totalPercentage;

    return stats;
  }

  /**
   * Get tasks by status
   * @param {string} status - Status to filter by
   * @returns {Object[]} Tasks with specified status
   */
  getTasksByStatus(status) {
    const tasks = [];

    for (const [taskId, progressData] of this.progressData.entries()) {
      if (progressData.status === status) {
        tasks.push({
          taskId,
          ...progressData
        });
      }
    }

    return tasks;
  }

  /**
   * Check for stale progress files (no heartbeat for a while)
   * @param {number} maxAge - Maximum age in milliseconds (default: 30 seconds)
   * @returns {string[]} Array of stale task IDs
   */
  getStaleProcesses(maxAge = 30000) {
    const now = Date.now();
    const staleTaskIds = [];

    for (const [taskId, progressData] of this.progressData.entries()) {
      if (progressData.heartbeat) {
        const heartbeatTime = new Date(progressData.heartbeat).getTime();
        const age = now - heartbeatTime;

        if (age > maxAge && progressData.status === 'running') {
          staleTaskIds.push(taskId);
        }
      }
    }

    return staleTaskIds;
  }

  /**
   * Clean up progress data for completed/failed tasks
   * @param {number} maxAge - Maximum age for completed tasks in milliseconds
   */
  async cleanupOldProgress(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    const filesToRemove = [];

    try {
      const files = await fs.readdir(this.progressDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.progressDir, file);
        const taskId = path.basename(file, '.json');
        const progressData = this.progressData.get(taskId);

        // Check if task is completed/failed and old enough
        if (progressData &&
            ['completed', 'failed', 'cancelled'].includes(progressData.status)) {

          const lastUpdateTime = progressData.lastUpdate ?
            new Date(progressData.lastUpdate).getTime() : 0;

          if (now - lastUpdateTime > maxAge) {
            filesToRemove.push({ filePath, taskId });
          }
        }
      }

      // Remove old files
      for (const { filePath, taskId } of filesToRemove) {
        await fs.remove(filePath);
        this.progressData.delete(taskId);
        console.log(`🧹 Cleaned up old progress file: ${taskId}`);
      }

      if (filesToRemove.length > 0) {
        console.log(`🧹 Cleaned up ${filesToRemove.length} old progress files`);
      }

    } catch (error) {
      console.error('Failed to cleanup old progress files:', error.message);
    }
  }

  /**
   * Notify callback for task progress update
   * @param {string} taskId - Task ID
   * @param {Object|null} progressData - Progress data (null for deleted)
   * @param {string} event - Event type
   */
  notifyCallback(taskId, progressData, event) {
    const callback = this.callbacks.get(taskId);
    if (callback) {
      try {
        callback(progressData, event);
      } catch (error) {
        console.error(`Progress callback error for task ${taskId}:`, error.message);
      }
    }
  }

  /**
   * Set a global callback for all progress updates
   * @param {Function} callback - Global callback function
   */
  setGlobalCallback(callback) {
    this.globalCallback = callback;
  }

  /**
   * Export progress data to JSON file
   * @param {string} outputPath - Output file path
   */
  async exportProgress(outputPath) {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        summary: this.getOverallProgress(),
        tasks: this.getAllProgress()
      };

      await fs.writeJson(outputPath, data, { spaces: 2 });
      console.log(`📊 Progress data exported to: ${outputPath}`);

    } catch (error) {
      console.error('Failed to export progress data:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed statistics about running processes
   * @returns {Object} Detailed statistics
   */
  getDetailedStats() {
    const allProgress = Array.from(this.progressData.values());
    const now = Date.now();

    const stats = {
      total: allProgress.length,
      byStatus: {},
      byPhase: {},
      runTimes: {
        shortest: null,
        longest: null,
        average: 0
      },
      healthCheck: {
        healthy: 0,
        stale: 0,
        unknown: 0
      }
    };

    const runTimes = [];

    for (const progress of allProgress) {
      // Count by status
      const status = progress.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by phase
      const phase = progress.phase || 'unknown';
      stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

      // Calculate run times for completed tasks
      if (progress.startTime && status === 'completed') {
        const startTime = new Date(progress.startTime).getTime();
        const endTime = progress.endTime ?
          new Date(progress.endTime).getTime() : now;
        const runTime = endTime - startTime;
        runTimes.push(runTime);
      }

      // Health check
      if (progress.heartbeat && status === 'running') {
        const heartbeatAge = now - new Date(progress.heartbeat).getTime();
        if (heartbeatAge < 30000) { // 30 seconds
          stats.healthCheck.healthy++;
        } else {
          stats.healthCheck.stale++;
        }
      } else if (status === 'running') {
        stats.healthCheck.unknown++;
      }
    }

    // Calculate run time statistics
    if (runTimes.length > 0) {
      stats.runTimes.shortest = Math.min(...runTimes);
      stats.runTimes.longest = Math.max(...runTimes);
      stats.runTimes.average = runTimes.reduce((a, b) => a + b, 0) / runTimes.length;
    }

    return stats;
  }

  /**
   * Shutdown the progress tracker
   */
  async shutdown() {
    console.log('🛑 Shutting down ProgressTracker...');

    // Close global watcher
    if (this.globalWatcher) {
      await this.globalWatcher.close();
    }

    // Clear watchers and callbacks
    this.watchers.clear();
    this.callbacks.clear();
    this.progressData.clear();

    console.log('✅ ProgressTracker shutdown complete');
  }
}