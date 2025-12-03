/**
 * HTTP Client for Media Diagnostic Tool
 * Handles authentication and API calls to the backend server for diagnostic operations
 */

import axios from 'axios';

/**
 * Authenticate with backend and get JWT token
 *
 * @param {Object} params - Authentication parameters
 * @param {string} params.baseUrl - Backend base URL
 * @param {string} params.username - Username
 * @param {string} params.password - Password
 * @param {number} [params.timeout=10000] - Request timeout in ms
 * @returns {Promise<string>} JWT access token
 *
 * @throws {Error} If authentication fails
 */
export async function authenticateBackend({ baseUrl, username, password, timeout = 10000 }) {
  try {
    const loginData = new URLSearchParams();
    loginData.append('username', username);
    loginData.append('password', password);

    const response = await axios.post(
      `${baseUrl}/api/v1/auth/login`,
      loginData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout
      }
    );

    const token = response.data.access_token || response.data.token;

    if (!token) {
      throw new Error('No access token received from backend');
    }

    return token;

  } catch (error) {
    if (error.response) {
      throw new Error(
        `Backend authentication failed: ${error.response.data?.detail || error.response.statusText}`
      );
    }
    throw new Error(`Backend authentication failed: ${error.message}`);
  }
}

/**
 * Verify media description and run diagnostics
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {string} token - JWT access token
 * @param {number} [timeout=30000] - Request timeout in ms
 * @returns {Promise<Object>} Diagnostic result { id, diagnostics, is_ready, errors }
 *
 * @throws {Error} If verification fails or media description not found
 */
export async function verifyMediaDescription(baseUrl, mediaDescriptionId, token, timeout = 30000) {
  try {
    const response = await axios.post(
      `${baseUrl}/api/v1/media-descriptions/${mediaDescriptionId}/verify`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout
      }
    );

    return response.data;

  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Media description not found: ${mediaDescriptionId}`);
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication token expired or invalid');
    }
    if (error.response) {
      throw new Error(
        `Failed to verify media description: ${error.response.data?.detail || error.response.statusText}`
      );
    }
    throw new Error(`Failed to verify media description: ${error.message}`);
  }
}

/**
 * Fetch season by ID
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} seasonId - Season UUID
 * @param {string} token - JWT access token
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<Object>} Season data
 *
 * @throws {Error} If fetch fails or season not found
 */
export async function fetchSeason(baseUrl, seasonId, token, timeout = 10000) {
  try {
    const response = await axios.get(
      `${baseUrl}/api/v1/seasons/${seasonId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout
      }
    );

    return response.data;

  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Season not found: ${seasonId}`);
    }
    if (error.response) {
      throw new Error(
        `Failed to fetch season: ${error.response.data?.detail || error.response.statusText}`
      );
    }
    throw new Error(`Failed to fetch season: ${error.message}`);
  }
}

/**
 * Fetch media descriptions from backend
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT access token
 * @param {Object} [params] - Query parameters
 * @param {number} [params.skip=0] - Number of items to skip
 * @param {number} [params.limit=100] - Max number of items to return
 * @param {string} [params.season_id] - Filter by season ID
 * @param {string} [params.media_type] - Filter by media type
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<Array>} Array of media descriptions
 *
 * @throws {Error} If fetch fails
 */
export async function fetchMediaDescriptions(baseUrl, token, params = {}, timeout = 10000) {
  try {
    const queryParams = new URLSearchParams({
      skip: params.skip || 0,
      limit: params.limit || 100
    });

    // Add optional filters
    if (params.season_id) {
      queryParams.append('season_id', params.season_id);
    }
    if (params.media_type) {
      queryParams.append('media_type', params.media_type);
    }

    const response = await axios.get(
      `${baseUrl}/api/v1/media-descriptions?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout
      }
    );

    // Return the data array from the paginated response
    return response.data.data || response.data;

  } catch (error) {
    if (error.response) {
      const errorDetail = error.response.data?.detail
        ? (typeof error.response.data.detail === 'string'
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail))
        : error.response.statusText;

      throw new Error(
        `Failed to fetch media descriptions (${error.response.status}): ${errorDetail}`
      );
    }
    throw new Error(`Failed to fetch media descriptions: ${error.message}`);
  }
}

/**
 * Fetch ALL media descriptions from backend with automatic pagination
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT access token
 * @param {Object} [params] - Query parameters (filters preserved during pagination)
 * @param {string} [params.season_id] - Filter by season ID
 * @param {string} [params.media_type] - Filter by media type
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<Array>} Array of all media descriptions matching the filters
 *
 * @throws {Error} If fetch fails
 */
export async function fetchAllMediaDescriptions(baseUrl, token, params = {}, timeout = 10000) {
  const allMediaDescriptions = [];
  let skip = 0;
  const limit = 100; // Maximum allowed by API

  console.log('[fetchAllMediaDescriptions] Starting to fetch all media descriptions...');
  if (params.season_id) {
    console.log(`[fetchAllMediaDescriptions] Filtering by season_id: ${params.season_id}`);
  }

  while (true) {
    // Merge pagination params with filter params
    const requestParams = {
      ...params,
      skip,
      limit
    };

    const response = await fetchMediaDescriptions(baseUrl, token, requestParams, timeout);

    // Handle both direct array and paginated response
    const mediaDescData = Array.isArray(response) ? response : (response.data || response);
    const mediaDescBatch = Array.isArray(mediaDescData) ? mediaDescData : [];

    allMediaDescriptions.push(...mediaDescBatch);

    console.log(`[fetchAllMediaDescriptions] Fetched ${allMediaDescriptions.length} media descriptions so far...`);

    // Stop if we got fewer items than the limit (last page)
    if (mediaDescBatch.length < limit) {
      break;
    }

    skip += limit;

    // Safety limit to prevent infinite loops
    if (skip > 10000) {
      console.warn('[fetchAllMediaDescriptions] Safety limit reached (10000 items)');
      break;
    }
  }

  console.log(`[fetchAllMediaDescriptions] Completed. Total media descriptions: ${allMediaDescriptions.length}`);
  return allMediaDescriptions;
}

export default {
  authenticateBackend,
  verifyMediaDescription,
  fetchSeason,
  fetchMediaDescriptions,
  fetchAllMediaDescriptions
};
