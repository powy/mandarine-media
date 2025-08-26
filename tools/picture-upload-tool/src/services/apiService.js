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
      const response = await this.axiosInstance.post('/api/v1/auth/access-token', {
        username: this.username,
        password: this.password
      }, {
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
        throw new Error(`API request failed: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`);
      } else {
        throw new Error(`API request failed: ${error.message}`);
      }
    }
  }
}

/**
 * Standalone function to create a picture record via API
 * @param {string} photoUrl - URL of the uploaded picture
 * @param {Object} metadata - Picture metadata
 * @param {Object} apiConfig - API configuration object
 * @returns {Promise<Object>} - Created picture record
 */
export async function createPictureRecord(photoUrl, metadata, apiConfig) {
  const apiService = new ApiService(apiConfig);
  
  const pictureData = {
    photo_url: photoUrl,
    file_name: metadata.fileName,
    file_size_bytes: metadata.fileSizeBytes,
    width: metadata.width,
    height: metadata.height,
    alt_text: metadata.altText || null
  };

  return await apiService.createPicture(pictureData);
}