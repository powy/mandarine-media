/**
 * API Client for Service-Server Communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011/api';

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Generic fetch wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async checkHealth() {
    return this.request('/health');
  }

  /**
   * Create a new task
   * @param {string} type - Task type
   * @param {object} parameters - Task parameters
   */
  async createTask(type, parameters) {
    return this.request('/task/create', {
      method: 'POST',
      body: JSON.stringify({ type, parameters })
    });
  }

  /**
   * List all tasks
   * @param {object} filters - Filter options (status, type, limit)
   */
  async listTasks(filters = {}) {
    const queryParams = new URLSearchParams();

    if (filters.status) {
      queryParams.append('status', Array.isArray(filters.status) ? filters.status.join(',') : filters.status);
    }
    if (filters.type) {
      queryParams.append('type', filters.type);
    }
    if (filters.limit) {
      queryParams.append('limit', filters.limit);
    }

    const query = queryParams.toString();
    const endpoint = query ? `/task/list?${query}` : '/task/list';

    return this.request(endpoint);
  }

  /**
   * Get running tasks
   */
  async getRunningTasks() {
    return this.listTasks({ status: ['queued', 'processing'] });
  }

  /**
   * Get finished tasks
   */
  async getFinishedTasks() {
    return this.listTasks({ status: ['success', 'failed', 'canceled', 'partial'] });
  }

  /**
   * Get specific task status
   * @param {number} taskId - Task ID
   */
  async getTaskStatus(taskId) {
    return this.request(`/task/${taskId}/status`);
  }

  /**
   * Get task log content
   * @param {number} taskId - Task ID
   * @param {number} offset - Byte offset to start reading from
   */
  async getTaskLog(taskId, offset = 0) {
    return this.request(`/task/${taskId}/log?offset=${offset}`);
  }

  /**
   * Stop/cancel a task
   * @param {number} taskId - Task ID
   */
  async stopTask(taskId) {
    return this.request(`/task/${taskId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get task statistics
   */
  async getTaskStats() {
    return this.request('/task/stats');
  }
}

// Export singleton instance
const apiClient = new APIClient();
export default apiClient;
export { APIClient };
