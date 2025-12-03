/**
 * Core functions for Media Diagnostic Tool
 * Pure functions for verifying MediaDescription diagnostics
 */

import {
  authenticateBackend,
  verifyMediaDescription,
  fetchSeason,
  fetchAllMediaDescriptions
} from './utils/httpClient.js';

/**
 * Log message with timestamp if verbose mode is enabled
 * @param {string} message - Message to log
 * @param {boolean} verbose - Whether verbose mode is enabled
 */
function log(message, verbose) {
  if (verbose) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] INFO: ${message}`);
  }
}

/**
 * Function 1: Verify single media description with direct credentials
 *
 * @param {Object} config
 * @param {string} config.baseUrl - Backend base URL
 * @param {string} config.username - Username
 * @param {string} config.password - Password
 * @param {string} config.mediaDescriptionId - MediaDescription UUID
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @param {number} [config.timeout=30000] - Request timeout in ms
 * @returns {Promise<Object>} { id, diagnostics, is_ready, errors }
 * @throws {Error} If validation fails or API call fails
 */
export async function verifyMediaDescriptionDirect(config) {
  const { baseUrl, username, password, mediaDescriptionId, verbose = false, timeout = 30000 } = config;

  // Validate required parameters
  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }
  if (!username) {
    throw new Error('username is required');
  }
  if (!password) {
    throw new Error('password is required');
  }
  if (!mediaDescriptionId) {
    throw new Error('mediaDescriptionId is required');
  }

  log('Authenticating with backend...', verbose);
  const token = await authenticateBackend({ baseUrl, username, password, timeout: 10000 });
  log('Successfully authenticated', verbose);

  log(`Verifying MediaDescription ${mediaDescriptionId}...`, verbose);
  const result = await verifyMediaDescription(baseUrl, mediaDescriptionId, token, timeout);
  log(`Diagnostics: ${result.diagnostics}`, verbose);

  return result;
}

/**
 * Function 3: Verify season (general description + all episodes) with direct credentials
 *
 * @param {Object} config
 * @param {string} config.baseUrl - Backend base URL
 * @param {string} config.username - Username
 * @param {string} config.password - Password
 * @param {string} config.seasonId - Season UUID
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @param {boolean} [config.continueOnError=true] - Continue on individual episode errors
 * @param {number} [config.timeout=30000] - Request timeout in ms
 * @returns {Promise<Object>} { seasonId, generalResult, episodeResults, summary }
 * @throws {Error} If validation fails or API call fails
 */
export async function verifySeasonDirect(config) {
  const {
    baseUrl,
    username,
    password,
    seasonId,
    verbose = false,
    continueOnError = true,
    timeout = 30000
  } = config;

  // Validate required parameters
  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }
  if (!username) {
    throw new Error('username is required');
  }
  if (!password) {
    throw new Error('password is required');
  }
  if (!seasonId) {
    throw new Error('seasonId is required');
  }

  log('Authenticating with backend...', verbose);
  const token = await authenticateBackend({ baseUrl, username, password, timeout: 10000 });
  log('Successfully authenticated', verbose);

  log(`Fetching Season ${seasonId}...`, verbose);
  const season = await fetchSeason(baseUrl, seasonId, token);
  log(`Season found: ${season.season_name || 'Unknown'}`, verbose);

  let generalResult = null;

  // Verify general MediaDescription if it exists
  if (season.general_media_description_id) {
    log(`Verifying general MediaDescription ${season.general_media_description_id}...`, verbose);
    try {
      generalResult = await verifyMediaDescription(
        baseUrl,
        season.general_media_description_id,
        token,
        timeout
      );
      log(`General diagnostics: ${generalResult.diagnostics}`, verbose);
    } catch (error) {
      if (continueOnError) {
        log(`Error verifying general MediaDescription: ${error.message}`, verbose);
        generalResult = {
          id: season.general_media_description_id,
          diagnostics: `error: ${error.message}`,
          is_ready: false,
          errors: [error.message]
        };
      } else {
        throw error;
      }
    }
  } else {
    log('No general MediaDescription found for this season', verbose);
  }

  // Fetch all episodes for this season
  log(`Fetching episodes for season ${seasonId}...`, verbose);
  const episodes = await fetchAllMediaDescriptions(baseUrl, token, { season_id: seasonId });
  log(`Found ${episodes.length} episodes`, verbose);

  const episodeResults = [];
  let readyCount = 0;
  let errorCount = 0;

  // Verify each episode sequentially
  for (const episode of episodes) {
    log(`Verifying episode ${episode.id} (${episode.episode_title || 'Untitled'})...`, verbose);
    try {
      const result = await verifyMediaDescription(baseUrl, episode.id, token, timeout);
      episodeResults.push({
        id: episode.id,
        episode_title: episode.episode_title,
        episode_number: episode.episode_number,
        diagnostics: result.diagnostics,
        is_ready: result.is_ready,
        errors: result.errors
      });

      if (result.is_ready) {
        readyCount++;
      } else {
        errorCount++;
      }

      log(`  - Episode diagnostics: ${result.diagnostics}`, verbose);
    } catch (error) {
      if (continueOnError) {
        log(`  - Error: ${error.message}`, verbose);
        episodeResults.push({
          id: episode.id,
          episode_title: episode.episode_title,
          episode_number: episode.episode_number,
          diagnostics: `error: ${error.message}`,
          is_ready: false,
          errors: [error.message]
        });
        errorCount++;
      } else {
        throw error;
      }
    }
  }

  const summary = {
    totalEpisodes: episodes.length,
    readyEpisodes: readyCount,
    errorEpisodes: errorCount,
    generalReady: generalResult ? generalResult.is_ready : null
  };

  log(`Season verification complete. Ready: ${readyCount}/${episodes.length}`, verbose);

  return {
    seasonId,
    generalResult,
    episodeResults,
    summary
  };
}

/**
 * Function 5: Batch verify all non-ready MediaDescriptions
 *
 * @param {Object} config
 * @param {string} config.baseUrl - Backend base URL
 * @param {string} config.username - Username
 * @param {string} config.password - Password
 * @param {boolean} [config.verbose=false] - Verbose logging
 * @param {boolean} [config.continueOnError=true] - Continue on individual errors
 * @param {number} [config.limit=1000] - Max items to process
 * @param {number} [config.timeout=30000] - Request timeout in ms
 * @returns {Promise<Object>} { nonReadyResults, nonReadyPendingResults, summary }
 * @throws {Error} If validation fails or API call fails
 */
export async function verifyBatchNonReady(config) {
  const {
    baseUrl,
    username,
    password,
    verbose = false,
    continueOnError = true,
    limit = 1000,
    timeout = 30000
  } = config;

  // Validate required parameters
  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }
  if (!username) {
    throw new Error('username is required');
  }
  if (!password) {
    throw new Error('password is required');
  }

  log('Authenticating with backend...', verbose);
  const token = await authenticateBackend({ baseUrl, username, password, timeout: 10000 });
  log('Successfully authenticated', verbose);

  log('Fetching all MediaDescriptions...', verbose);
  const allMediaDescriptions = await fetchAllMediaDescriptions(baseUrl, token);
  log(`Total MediaDescriptions fetched: ${allMediaDescriptions.length}`, verbose);

  // List a) Filter: diagnostics !== "ready"
  const nonReadyList = allMediaDescriptions.filter(md => md.diagnostics !== 'ready');
  log(`MediaDescriptions with diagnostics !== "ready": ${nonReadyList.length}`, verbose);

  // List b) Filter from list a): diagnostics !== "pending" (i.e., not ready AND not pending)
  const nonReadyPendingList = nonReadyList.filter(md => md.diagnostics !== 'pending');
  log(`MediaDescriptions not ready and not pending: ${nonReadyPendingList.length}`, verbose);

  // Apply limit if specified
  const limitedNonReadyList = limit ? nonReadyList.slice(0, limit) : nonReadyList;
  const limitedNonReadyPendingList = limit ? nonReadyPendingList.slice(0, limit) : nonReadyPendingList;

  const nonReadyResults = [];
  const nonReadyPendingResults = [];

  // Process list a) sequentially
  log(`Processing ${limitedNonReadyList.length} non-ready MediaDescriptions...`, verbose);
  for (const md of limitedNonReadyList) {
    log(`Verifying MediaDescription ${md.id} (${md.episode_title || 'Untitled'})...`, verbose);
    try {
      const result = await verifyMediaDescription(baseUrl, md.id, token, timeout);
      nonReadyResults.push({
        id: md.id,
        episode_title: md.episode_title,
        diagnostics: result.diagnostics,
        is_ready: result.is_ready,
        errors: result.errors
      });
      log(`  - Diagnostics: ${result.diagnostics}`, verbose);
    } catch (error) {
      if (continueOnError) {
        log(`  - Error: ${error.message}`, verbose);
        nonReadyResults.push({
          id: md.id,
          episode_title: md.episode_title,
          diagnostics: `error: ${error.message}`,
          is_ready: false,
          errors: [error.message]
        });
      } else {
        throw error;
      }
    }
  }

  // Process list b) sequentially
  log(`Processing ${limitedNonReadyPendingList.length} non-ready-pending MediaDescriptions...`, verbose);
  for (const md of limitedNonReadyPendingList) {
    log(`Verifying MediaDescription ${md.id} (${md.episode_title || 'Untitled'})...`, verbose);
    try {
      const result = await verifyMediaDescription(baseUrl, md.id, token, timeout);
      nonReadyPendingResults.push({
        id: md.id,
        episode_title: md.episode_title,
        diagnostics: result.diagnostics,
        is_ready: result.is_ready,
        errors: result.errors
      });
      log(`  - Diagnostics: ${result.diagnostics}`, verbose);
    } catch (error) {
      if (continueOnError) {
        log(`  - Error: ${error.message}`, verbose);
        nonReadyPendingResults.push({
          id: md.id,
          episode_title: md.episode_title,
          diagnostics: `error: ${error.message}`,
          is_ready: false,
          errors: [error.message]
        });
      } else {
        throw error;
      }
    }
  }

  // Calculate summary statistics
  const nowReady = nonReadyResults.filter(r => r.is_ready).length;
  const stillErrors = nonReadyResults.filter(r => !r.is_ready).length;

  const summary = {
    totalNonReady: limitedNonReadyList.length,
    totalNonReadyPending: limitedNonReadyPendingList.length,
    nowReady,
    stillErrors
  };

  log(`Batch verification complete. Now ready: ${nowReady}, Still errors: ${stillErrors}`, verbose);

  return {
    nonReadyResults,
    nonReadyPendingResults,
    summary
  };
}

export default {
  verifyMediaDescriptionDirect,
  verifySeasonDirect,
  verifyBatchNonReady
};
