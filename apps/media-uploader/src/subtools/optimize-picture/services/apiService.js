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
   * Get a picture by ID
   * @param {string} pictureId - UUID of the picture
   * @returns {Promise<Object>} - Picture data
   */
  async getPicture(pictureId) {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      const response = await this.axiosInstance.get(`/api/v1/pictures/${pictureId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.authenticate();
        const response = await this.axiosInstance.get(`/api/v1/pictures/${pictureId}`);
        return response.data;
      } else if (error.response?.status === 404) {
        throw new Error(`Picture not found: ${pictureId}`);
      } else {
        throw new Error(`Failed to get picture: ${error.message}`);
      }
    }
  }

  /**
   * Update a picture record
   * @param {string} pictureId - UUID of the picture
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated picture
   */
  async updatePicture(pictureId, updateData) {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      const response = await this.axiosInstance.put(`/api/v1/pictures/${pictureId}`, updateData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.authenticate();
        const response = await this.axiosInstance.put(`/api/v1/pictures/${pictureId}`, updateData);
        return response.data;
      } else {
        this._handleApiError(error, 'update picture');
      }
    }
  }

  /**
   * Get a media description by ID
   * @param {string} mediaDescriptionId - UUID of the media description
   * @returns {Promise<Object>} - Media description data
   */
  async getMediaDescription(mediaDescriptionId) {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      const response = await this.axiosInstance.get(`/api/v1/media-descriptions/${mediaDescriptionId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.authenticate();
        const response = await this.axiosInstance.get(`/api/v1/media-descriptions/${mediaDescriptionId}`);
        return response.data;
      } else if (error.response?.status === 404) {
        throw new Error(`Media description not found: ${mediaDescriptionId}`);
      } else {
        throw new Error(`Failed to get media description: ${error.message}`);
      }
    }
  }

  /**
   * Handle API errors with detailed messages
   * @private
   */
  _handleApiError(error, operation) {
    if (error.response) {
      let errorDetail;
      if (error.response.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorDetail = error.response.data.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join('; ');
        } else {
          errorDetail = error.response.data.detail;
        }
      } else {
        errorDetail = error.response.statusText;
      }
      throw new Error(`Failed to ${operation}: ${error.response.status} - ${errorDetail}`);
    } else {
      throw new Error(`Failed to ${operation}: ${error.message}`);
    }
  }
}
