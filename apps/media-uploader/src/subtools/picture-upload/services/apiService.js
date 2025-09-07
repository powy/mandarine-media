import axios from 'axios';

export class ApiService {
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
    this.token = null;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Authenticate with the backend API
   * @returns {Promise<string>} - Authentication token
   */
  async authenticate() {
    try {
      // Create form data for OAuth2PasswordRequestForm (same as mux-upload)
      const formData = new URLSearchParams();
      formData.append('username', this.username);
      formData.append('password', this.password);
      
      const response = await this.axiosInstance.post('/api/v1/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        this.token = response.data.access_token;
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        return this.token;
      } else {
        throw new Error('No access token received from authentication');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Authentication failed: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`);
      } else {
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
  }

  /**
   * Create a picture record in the backend API
   * @param {Object} pictureData - Picture data object
   * @returns {Promise<Object>} - Created picture record
   */
  async createPicture(pictureData) {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.post('/api/v1/pictures', pictureData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token might be expired, try to re-authenticate
        await this.authenticate();
        const response = await this.axiosInstance.post('/api/v1/pictures', pictureData);
        return response.data;
      } else if (error.response) {
        let errorDetail;
        if (error.response.data?.detail) {
          // FastAPI validation errors often come in detail array
          if (Array.isArray(error.response.data.detail)) {
            errorDetail = error.response.data.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
          } else {
            errorDetail = error.response.data.detail;
          }
        } else if (typeof error.response.data === 'string') {
          errorDetail = error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorDetail = JSON.stringify(error.response.data);
        } else {
          errorDetail = error.response.statusText;
        }
        throw new Error(`API request failed: ${error.response.status} - ${errorDetail}`);
      } else {
        throw new Error(`API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Update a picture record in the backend API
   * @param {string} pictureId - ID of the picture record to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated picture record
   */
  async updatePicture(pictureId, updateData) {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.put(`/api/v1/pictures/${pictureId}`, updateData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token might be expired, try to re-authenticate
        await this.authenticate();
        const response = await this.axiosInstance.put(`/api/v1/pictures/${pictureId}`, updateData);
        return response.data;
      } else if (error.response) {
        let errorDetail;
        if (error.response.data?.detail) {
          // FastAPI validation errors often come in detail array
          if (Array.isArray(error.response.data.detail)) {
            errorDetail = error.response.data.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
          } else {
            errorDetail = error.response.data.detail;
          }
        } else if (typeof error.response.data === 'string') {
          errorDetail = error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorDetail = JSON.stringify(error.response.data);
        } else {
          errorDetail = error.response.statusText;
        }
        throw new Error(`API update failed: ${error.response.status} - ${errorDetail}`);
      } else {
        throw new Error(`API update failed: ${error.message}`);
      }
    }
  }
}

/**
 * Standalone function to create a picture record via API
 * @param {Object} pictureData - Picture data object
 * @param {Object} apiConfig - API configuration object
 * @returns {Promise<Object>} - Created picture record
 */
export async function createPictureRecord(pictureData, apiConfig) {
  const apiService = new ApiService(apiConfig);
  return await apiService.createPicture(pictureData);
}

/**
 * Standalone function to update a picture record via API
 * @param {string} pictureId - ID of the picture record to update
 * @param {Object} updateData - Data to update
 * @param {Object} apiConfig - API configuration object
 * @returns {Promise<Object>} - Updated picture record
 */
export async function updatePictureRecord(pictureId, updateData, apiConfig) {
  const apiService = new ApiService(apiConfig);
  return await apiService.updatePicture(pictureId, updateData);
}