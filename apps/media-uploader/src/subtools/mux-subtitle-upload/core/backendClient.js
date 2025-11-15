/**
 * Backend API Client
 * Handles authentication and API calls to the backend server
 *
 * Pure functions for backend interactions - no config files
 * Extracted from subtitle-specific-upload/services/muxService.js
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
 * Fetch media description from backend
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {string} token - JWT access token
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<Object>} Media description data
 *
 * @throws {Error} If fetch fails or media description not found
 */
export async function fetchMediaDescription(baseUrl, mediaDescriptionId, token, timeout = 10000) {
  try {
    const response = await axios.get(
      `${baseUrl}/api/v1/media-descriptions/${mediaDescriptionId}`,
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
    if (error.response) {
      throw new Error(
        `Failed to fetch media description: ${error.response.data?.detail || error.response.statusText}`
      );
    }
    throw new Error(`Failed to fetch media description: ${error.message}`);
  }
}

/**
 * Fetch video file from backend
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} videoFileId - Video file UUID
 * @param {string} token - JWT access token
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<Object>} Video file data
 *
 * @throws {Error} If fetch fails or video file not found
 */
export async function fetchVideoFile(baseUrl, videoFileId, token, timeout = 10000) {
  try {
    const response = await axios.get(
      `${baseUrl}/api/v1/video-files/${videoFileId}`,
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
      throw new Error(`Video file not found: ${videoFileId}`);
    }
    if (error.response) {
      throw new Error(
        `Failed to fetch video file: ${error.response.data?.detail || error.response.statusText}`
      );
    }
    throw new Error(`Failed to fetch video file: ${error.message}`);
  }
}

/**
 * Fetch media description and extract video file ID
 * Convenience function combining fetch + extraction
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {string} token - JWT access token
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<string>} Video file ID
 *
 * @throws {Error} If video file ID not found in media description
 */
export async function getVideoFileIdFromMediaDescription(baseUrl, mediaDescriptionId, token, timeout = 10000) {
  const mediaDescription = await fetchMediaDescription(baseUrl, mediaDescriptionId, token, timeout);

  const videoFileId = mediaDescription.main_video_file_id ||
                     mediaDescription.video_file_id ||
                     mediaDescription.file_id;

  if (!videoFileId) {
    throw new Error(
      `No video file ID found in media description ${mediaDescriptionId}. ` +
      `Available fields: ${Object.keys(mediaDescription).join(', ')}`
    );
  }

  return videoFileId;
}

/**
 * Fetch video file and extract Mux asset ID
 * Convenience function combining fetch + extraction
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} videoFileId - Video file UUID
 * @param {string} token - JWT access token
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<string>} Mux asset ID
 *
 * @throws {Error} If Mux asset ID not found in video file
 */
export async function getMuxAssetIdFromVideoFile(baseUrl, videoFileId, token, timeout = 10000) {
  const videoFile = await fetchVideoFile(baseUrl, videoFileId, token, timeout);

  const assetId = videoFile.mux_asset_id || videoFile.asset_id;

  if (!assetId) {
    throw new Error(
      `No Mux asset ID found in video file ${videoFileId}. ` +
      `Available fields: ${Object.keys(videoFile).join(', ')}`
    );
  }

  return assetId;
}

/**
 * Fetch Mux asset ID from media description (complete chain)
 * Convenience function: mediaDescription → videoFile → assetId
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} mediaDescriptionId - Media description UUID
 * @param {string} token - JWT access token
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<string>} Mux asset ID
 *
 * @throws {Error} If any step in the chain fails
 */
export async function getMuxAssetIdFromMediaDescription(baseUrl, mediaDescriptionId, token, timeout = 10000) {
  // Step 1: Get video file ID from media description
  const videoFileId = await getVideoFileIdFromMediaDescription(baseUrl, mediaDescriptionId, token, timeout);

  // Step 2: Get Mux asset ID from video file
  const assetId = await getMuxAssetIdFromVideoFile(baseUrl, videoFileId, token, timeout);

  return assetId;
}


/**
 * Fetch all seasons from backend
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT access token
 * @param {Object} [params] - Query parameters
 * @param {number} [params.skip=0] - Number of items to skip
 * @param {number} [params.limit=1000] - Max number of items to return
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<Array>} Array of seasons
 *
 * @throws {Error} If fetch fails
 */
export async function fetchSeasons(baseUrl, token, params = {}, timeout = 10000) {
  const queryParams = new URLSearchParams({
    skip: params.skip || 0,
    limit: params.limit || 100
  });

  const url = `${baseUrl}/api/v1/seasons?${queryParams}`;

  try {
    console.log(`[fetchSeasons] Requesting: ${url}`);

    const response = await axios.get(
      url,
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
    // Log full error details for debugging
    console.error('[fetchSeasons] Error details:', {
      message: error.message,
      code: error.code,
      url: url,
      hasResponse: !!error.response,
      hasRequest: !!error.request
    });

    if (error.response) {
      // HTTP error response from server
      const errorDetail = error.response.data?.detail
        ? (typeof error.response.data.detail === 'string'
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail))
        : error.response.statusText;

      throw new Error(
        `Failed to fetch seasons (${error.response.status}): ${errorDetail}`
      );
    } else if (error.request) {
      // Request was made but no response received (network error)
      const errorCode = error.code || 'UNKNOWN';
      throw new Error(
        `Failed to fetch seasons - no response from server (${errorCode}): ${error.message}. URL: ${url}`
      );
    } else {
      // Error setting up the request
      const errorMsg = error.message || JSON.stringify(error, Object.getOwnPropertyNames(error));
      throw new Error(`Failed to fetch seasons - request setup error: ${errorMsg}`);
    }
  }
}

/**
 * Fetch ALL seasons from backend with automatic pagination
 * This function loops through all pages and returns all seasons
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT access token
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<Array>} Array of all seasons
 *
 * @throws {Error} If fetch fails
 */
export async function fetchAllSeasons(baseUrl, token, timeout = 10000) {
  const allSeasons = [];
  let skip = 0;
  const limit = 100; // Maximum allowed by API

  console.log('[fetchAllSeasons] Starting to fetch all seasons...');

  while (true) {
    const response = await fetchSeasons(baseUrl, token, { skip, limit }, timeout);

    // Handle both direct array and paginated response
    const seasonsData = Array.isArray(response) ? response : (response.data || response);
    const seasonsBatch = Array.isArray(seasonsData) ? seasonsData : [];

    allSeasons.push(...seasonsBatch);

    console.log(`[fetchAllSeasons] Fetched ${allSeasons.length} seasons so far...`);

    // Stop if we got fewer items than the limit (last page)
    if (seasonsBatch.length < limit) {
      break;
    }

    skip += limit;

    // Safety limit to prevent infinite loops
    if (skip > 10000) {
      console.warn('[fetchAllSeasons] Safety limit reached (10000 items)');
      break;
    }
  }

  console.log(`[fetchAllSeasons] Completed. Total seasons: ${allSeasons.length}`);
  return allSeasons;
}

/**
 * Fetch ALL media descriptions from backend with automatic pagination
 * This function loops through all pages and returns all media descriptions
 * while preserving filter parameters
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT access token
 * @param {Object} [params] - Query parameters (filters preserved during pagination)
 * @param {string} [params.season_id] - Filter by season ID
 * @param {string} [params.media_type] - Filter by media type (e.g., 'video')
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
  if (params.media_type) {
    console.log(`[fetchAllMediaDescriptions] Filtering by media_type: ${params.media_type}`);
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

/**
 * Fetch media descriptions from backend
 *
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT access token
 * @param {Object} [params] - Query parameters
 * @param {number} [params.skip=0] - Number of items to skip
 * @param {number} [params.limit=1000] - Max number of items to return
 * @param {string} [params.season_id] - Filter by season ID
 * @param {string} [params.media_type] - Filter by media type (e.g., 'video')
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
      // Properly serialize error details
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


export default {
  authenticateBackend,
  fetchMediaDescription,
  fetchVideoFile,
  getVideoFileIdFromMediaDescription,
  getMuxAssetIdFromVideoFile,
  getMuxAssetIdFromMediaDescription,
  fetchSeasons,
  fetchAllSeasons,
  fetchMediaDescriptions,
  fetchAllMediaDescriptions
};
