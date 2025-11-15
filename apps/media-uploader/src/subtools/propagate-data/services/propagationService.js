import axios from 'axios';
import chalk from 'chalk';

export class PropagationService {
  constructor(config, logger = null) {
    this.config = config;
    this.logger = logger || console;
  }

  /**
   * Helper function to check if a value is empty
   */
  isEmpty(value) {
    return !value ||
           value === '' ||
           value === null ||
           value === undefined ||
           (Array.isArray(value) && value.length === 0);
  }

  /**
   * Authenticate with backend and get JWT token
   */
  async authenticateWithBackend() {
    try {
      const loginUrl = `${this.config.backend.baseUrl}/api/v1/auth/login`;

      this.logger.info(`Authenticating with backend: ${loginUrl}`);

      const loginData = new URLSearchParams();
      loginData.append('username', this.config.backend.username);
      loginData.append('password', this.config.backend.password);

      const response = await axios.post(loginUrl, loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.access_token) {
        this.logger.info('Successfully authenticated with backend');
        return response.data.access_token;
      } else {
        throw new Error(`Login failed - invalid response: ${JSON.stringify(response.data)}`);
      }

    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
  }

  /**
   * PRIVATE: Authenticate and get JWT token
   * @private
   */
  async _authenticateAndGetToken() {
    return await this.authenticateWithBackend();
  }

  /**
   * PRIVATE: Fetch season media description by ID
   * @private
   */
  async _fetchSeasonMediaDescription(seasonMediaDescriptionId, token) {
    console.log(chalk.gray(`Fetching season media description: ${seasonMediaDescriptionId}`));
    const seasonResponse = await axios.get(
      `${this.config.backend.baseUrl}/api/v1/media-descriptions/${seasonMediaDescriptionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const season = seasonResponse.data;

    if (!season) {
      throw new Error(`Season not found: ${seasonMediaDescriptionId}`);
    }

    console.log(chalk.green(`✅ Found season: ${season.episode_title || season.id}`));
    return season;
  }

  /**
   * PRIVATE: Resolve season media description to actual season entity ID
   * @private
   */
  async _resolveSeasonEntity(seasonMediaDescriptionId, season, token) {
    let actualSeasonId = seasonMediaDescriptionId;

    if (season.media_type === 'season') {
      console.log(chalk.gray('Season MediaDescription detected, resolving to Season entity...'));

      try {
        const seasonsResponse = await axios.get(
          `${this.config.backend.baseUrl}/api/v1/seasons`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const allSeasons = Array.isArray(seasonsResponse.data)
          ? seasonsResponse.data
          : seasonsResponse.data.data || [];

        console.log(chalk.gray(`Fetched ${allSeasons.length} seasons from API`));
        if (allSeasons.length > 0) {
          console.log(chalk.gray('First season structure:'));
          console.log(chalk.gray(JSON.stringify(allSeasons[0], null, 2)));
        }
        console.log(chalk.gray(`Looking for season with general_media_description_id = ${seasonMediaDescriptionId}`));

        const matchingSeason = allSeasons.find(
          s => s.general_media_description_id === seasonMediaDescriptionId
        );

        if (matchingSeason) {
          actualSeasonId = matchingSeason.id;
          console.log(chalk.green(`✅ Resolved to Season entity: ${matchingSeason.season_name || actualSeasonId}`));
        } else {
          if (allSeasons.length > 0) {
            console.log(chalk.yellow('Available season IDs and their general_media_description_ids:'));
            allSeasons.forEach(s => {
              console.log(chalk.yellow(`  Season: ${s.season_name || s.id}`));
              console.log(chalk.yellow(`    ID: ${s.id}`));
              console.log(chalk.yellow(`    general_media_description_id: ${s.general_media_description_id || 'NOT SET'}`));
            });
          }
          throw new Error(
            `Season entity not found for MediaDescription ID: ${seasonMediaDescriptionId}. ` +
            `Fetched ${allSeasons.length} seasons but none matched.`
          );
        }
      } catch (error) {
        // Log detailed error information for debugging
        const url = `${this.config.backend.baseUrl}/api/v1/seasons`;
        console.error(chalk.red('[_resolveSeasonEntity] Error details:'), {
          message: error.message,
          code: error.code,
          url: url,
          hasResponse: !!error.response,
          hasRequest: !!error.request
        });

        if (error.response) {
          console.log(chalk.red(`API Error: ${error.response.status} ${error.response.statusText}`));
          console.log(chalk.red(`Response: ${JSON.stringify(error.response.data, null, 2)}`));
          throw new Error(`Failed to resolve Season entity (${error.response.status}): ${error.response.statusText}`);
        } else if (error.request) {
          // Request was made but no response received (network error)
          const errorCode = error.code || 'UNKNOWN';
          throw new Error(
            `Failed to resolve Season entity - no response from server (${errorCode}): ${error.message}. URL: ${url}`
          );
        } else {
          // Error setting up the request or other error type
          const errorMsg = error.message || JSON.stringify(error, Object.getOwnPropertyNames(error));
          throw new Error(`Failed to resolve Season entity - request setup error: ${errorMsg}`);
        }
      }
    }

    return actualSeasonId;
  }

  /**
   * PRIVATE: Fetch all episodes for a season with pagination
   * @private
   */
  async _fetchAllEpisodesForSeason(actualSeasonId, token) {
    console.log(chalk.gray('Fetching all media descriptions to filter by season (with pagination)...'));

    // Note: Backend doesn't support season_id filter parameter yet
    // So we fetch all episodes and filter client-side
    // Use pagination to ensure we get ALL media descriptions
    let allEpisodes = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      console.log(chalk.gray(`  Fetching batch: skip=${skip}, limit=${limit}`));

      const episodesResponse = await axios.get(
        `${this.config.backend.baseUrl}/api/v1/media-descriptions`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { skip, limit }
        }
      );

      const batch = Array.isArray(episodesResponse.data)
        ? episodesResponse.data
        : episodesResponse.data.data || [];

      allEpisodes = allEpisodes.concat(batch);
      console.log(chalk.gray(`  Received ${batch.length} items (total: ${allEpisodes.length})`));

      hasMore = batch.length === limit;
      skip += limit;

      // Safety limit to prevent infinite loops
      if (skip > 10000) {
        console.log(chalk.yellow('  ⚠️ Safety limit reached (10000 items)'));
        break;
      }
    }

    // Filter episodes that belong to this season
    const episodesData = allEpisodes.filter(
      episode => episode.season_id === actualSeasonId
    );

    console.log(chalk.green(`✅ Found ${episodesData.length} episodes for this season (filtered from ${allEpisodes.length} total)`));

    return episodesData;
  }

  /**
   * PRIVATE: Fetch full episode details
   * @private
   */
  async _fetchFullEpisodeDetails(episodeId, token) {
    console.log(chalk.gray(`  Fetching full episode details...`));
    const fullEpisodeResponse = await axios.get(
      `${this.config.backend.baseUrl}/api/v1/media-descriptions/${episodeId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const fullEpisode = fullEpisodeResponse.data;

    // Verify we have full data (safety check)
    if (!fullEpisode.hasOwnProperty('descriptive_summary_text') &&
        !fullEpisode.hasOwnProperty('synopsis_text')) {
      throw new Error('Incomplete API response - missing text fields');
    }

    return fullEpisode;
  }

  /**
   * PRIVATE: Calculate updates needed for an episode based on season data
   * @private
   */
  _calculateUpdates(fullEpisode, season) {
    const updates = {};
    let fieldsCopied = [];

    // Text fields
    if (this.isEmpty(fullEpisode.descriptive_summary_text) && !this.isEmpty(season.descriptive_summary_text)) {
      updates.descriptive_summary_text = season.descriptive_summary_text;
      fieldsCopied.push('summary');
    }
    if (this.isEmpty(fullEpisode.synopsis_text) && !this.isEmpty(season.synopsis_text)) {
      updates.synopsis_text = season.synopsis_text;
      fieldsCopied.push('synopsis');
    }
    if (this.isEmpty(fullEpisode.production_year) && !this.isEmpty(season.production_year)) {
      updates.production_year = season.production_year;
      fieldsCopied.push('production_year');
    }
    if (this.isEmpty(fullEpisode.rights_holder) && !this.isEmpty(season.rights_holder)) {
      updates.rights_holder = season.rights_holder;
      fieldsCopied.push('rights_holder');
    }
    if (this.isEmpty(fullEpisode.copyright_owner_text) && !this.isEmpty(season.copyright_owner_text)) {
      updates.copyright_owner_text = season.copyright_owner_text;
      fieldsCopied.push('copyright_owner');
    }

    // Array fields
    if (this.isEmpty(fullEpisode.media_categories_list) && !this.isEmpty(season.media_categories_list)) {
      updates.media_categories_list = season.media_categories_list;
      fieldsCopied.push('media_categories');
    }
    if (this.isEmpty(fullEpisode.hashtags_text_list) && !this.isEmpty(season.hashtags_text_list)) {
      updates.hashtags_text_list = season.hashtags_text_list;
      fieldsCopied.push('hashtags');
    }

    // Relationship ID arrays - use _ids suffix for PATCH requests
    if (this.isEmpty(fullEpisode.directors) && !this.isEmpty(season.directors)) {
      updates.director_ids = season.directors.map(d => d.id);
      fieldsCopied.push('directors');
    }
    if (this.isEmpty(fullEpisode.producers) && !this.isEmpty(season.producers)) {
      updates.producer_ids = season.producers.map(p => p.id);
      fieldsCopied.push('producers');
    }
    if (this.isEmpty(fullEpisode.authors) && !this.isEmpty(season.authors)) {
      updates.author_ids = season.authors.map(a => a.id);
      fieldsCopied.push('authors');
    }
    if (this.isEmpty(fullEpisode.actors) && !this.isEmpty(season.actors)) {
      updates.actor_ids = season.actors.map(a => a.id);
      fieldsCopied.push('actors');
    }
    if (this.isEmpty(fullEpisode.origin_countries) && !this.isEmpty(season.origin_countries)) {
      updates.origin_country_ids = season.origin_countries.map(c => c.id);
      fieldsCopied.push('origin_countries');
    }
    if (this.isEmpty(fullEpisode.available_countries) && !this.isEmpty(season.available_countries)) {
      updates.available_country_ids = season.available_countries.map(c => c.id);
      fieldsCopied.push('available_countries');
    }
    if (this.isEmpty(fullEpisode.original_languages) && !this.isEmpty(season.original_languages)) {
      updates.original_language_ids = season.original_languages.map(l => l.id);
      fieldsCopied.push('original_languages');
    }
    if (this.isEmpty(fullEpisode.audience_categories) && !this.isEmpty(season.audience_categories)) {
      updates.audience_category_ids = season.audience_categories.map(a => a.id);
      fieldsCopied.push('audience_categories');
    }
    if (this.isEmpty(fullEpisode.media_themes) && !this.isEmpty(season.media_themes)) {
      updates.media_theme_ids = season.media_themes.map(t => t.id);
      fieldsCopied.push('media_themes');
    }
    if (this.isEmpty(fullEpisode.eligible_plans) && !this.isEmpty(season.eligible_plans)) {
      updates.eligible_plan_ids = season.eligible_plans.map(p => p.id);
      fieldsCopied.push('eligible_plans');
    }

    // MOST IMPORTANT: Image IDs
    // Handle both direct ID fields and relationship objects
    const getImageId = (obj, idField, relationshipField) => {
      // First try the direct ID field
      if (obj[idField]) return obj[idField];
      // Fallback to extracting ID from relationship object
      if (obj[relationshipField] && obj[relationshipField].id) return obj[relationshipField].id;
      return null;
    };

    const seasonImage1920x1080 = getImageId(season, 'image_1920_1080_id', 'image_1920_1080');
    const episodeImage1920x1080 = getImageId(fullEpisode, 'image_1920_1080_id', 'image_1920_1080');
    if (this.isEmpty(episodeImage1920x1080) && !this.isEmpty(seasonImage1920x1080)) {
      updates.image_1920_1080_id = seasonImage1920x1080;
      fieldsCopied.push('image_1920x1080');
    }

    const seasonImage1920x720 = getImageId(season, 'image_1920_720_id', 'image_1920_720');
    const episodeImage1920x720 = getImageId(fullEpisode, 'image_1920_720_id', 'image_1920_720');
    if (this.isEmpty(episodeImage1920x720) && !this.isEmpty(seasonImage1920x720)) {
      updates.image_1920_720_id = seasonImage1920x720;
      fieldsCopied.push('image_1920x720');
    }

    const seasonImage1080x1080 = getImageId(season, 'image_1080_1080_id', 'image_1080_1080');
    const episodeImage1080x1080 = getImageId(fullEpisode, 'image_1080_1080_id', 'image_1080_1080');
    if (this.isEmpty(episodeImage1080x1080) && !this.isEmpty(seasonImage1080x1080)) {
      updates.image_1080_1080_id = seasonImage1080x1080;
      fieldsCopied.push('image_1080x1080');
    }

    const seasonImage810x1080 = getImageId(season, 'image_810_1080_id', 'image_810_1080');
    const episodeImage810x1080 = getImageId(fullEpisode, 'image_810_1080_id', 'image_810_1080');
    if (this.isEmpty(episodeImage810x1080) && !this.isEmpty(seasonImage810x1080)) {
      updates.image_810_1080_id = seasonImage810x1080;
      fieldsCopied.push('image_810x1080');
    }

    const seasonImage1080x1920 = getImageId(season, 'image_1080_1920_id', 'image_1080_1920');
    const episodeImage1080x1920 = getImageId(fullEpisode, 'image_1080_1920_id', 'image_1080_1920');
    if (this.isEmpty(episodeImage1080x1920) && !this.isEmpty(seasonImage1080x1920)) {
      updates.image_1080_1920_id = seasonImage1080x1920;
      fieldsCopied.push('image_1080x1920');
    }

    return { updates, fieldsCopied };
  }

  /**
   * PRIVATE: Apply update to an episode
   * @private
   */
  async _applyUpdate(episodeId, updates, token) {
    await axios.patch(
      `${this.config.backend.baseUrl}/api/v1/media-descriptions/${episodeId}`,
      updates,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  /**
   * CORE: Propagate season data knowing both season ID and season media description ID
   * @param {string} seasonId - Season entity ID
   * @param {string} seasonMediaDescriptionId - Season media description ID
   * @param {boolean} dryRun - If true, only preview changes without applying them
   * @returns {Promise<Object>} Results of propagation
   */
  async propagateSeasonDataCore(seasonId, seasonMediaDescriptionId, dryRun = false) {
    try {
      console.log(chalk.cyan('🔄 Starting season data propagation...'));

      // 1. Authenticate with backend
      const token = await this._authenticateAndGetToken();

      // 2. Fetch season media description
      const season = await this._fetchSeasonMediaDescription(seasonMediaDescriptionId, token);

      // 3. Fetch all episodes for this season
      const episodesData = await this._fetchAllEpisodesForSeason(seasonId, token);

      if (episodesData.length === 0) {
        return {
          success: false,
          updated: 0,
          skipped: 0,
          errors: [],
          message: 'No episodes found for this season'
        };
      }

      // 4. For each episode, propagate missing fields
      const results = { updated: [], skipped: [], errors: [] };

      for (const episode of episodesData) {
        console.log(chalk.gray(`\nProcessing episode: ${episode.episode_title || episode.id}`));

        // Fetch FULL episode details
        let fullEpisode;
        try {
          fullEpisode = await this._fetchFullEpisodeDetails(episode.id, token);
        } catch (error) {
          console.log(chalk.red(`  ❌ Failed to fetch full episode details: ${error.message}`));
          results.errors.push({
            id: episode.id,
            title: episode.episode_title,
            error: `Failed to fetch details: ${error.message}`
          });
          continue;
        }

        // Calculate updates
        const { updates, fieldsCopied } = this._calculateUpdates(fullEpisode, season);

        // Update episode if there are changes
        if (Object.keys(updates).length > 0) {
          if (dryRun) {
            // Dry run mode - just preview what would be updated
            console.log(chalk.yellow(`  🔍 Would update with fields: ${fieldsCopied.join(', ')}`));

            results.updated.push({
              id: episode.id,
              title: episode.episode_title,
              fieldsCopied,
              updateCount: fieldsCopied.length,
              updates: updates  // Include the actual update data for reporting
            });

            console.log(chalk.yellow(`  📋 Preview: ${fieldsCopied.length} field(s) would be updated`));
          } else {
            // Normal mode - apply the update
            try {
              console.log(chalk.cyan(`  Updating with fields: ${fieldsCopied.join(', ')}`));

              await this._applyUpdate(episode.id, updates, token);

              results.updated.push({
                id: episode.id,
                title: episode.episode_title,
                fieldsCopied,
                updateCount: fieldsCopied.length
              });

              console.log(chalk.green(`  ✅ Updated ${fieldsCopied.length} field(s)`));

            } catch (error) {
              results.errors.push({
                id: episode.id,
                title: episode.episode_title,
                error: error.message
              });
              console.log(chalk.red(`  ❌ Error: ${error.message}`));
            }
          }
        } else {
          results.skipped.push({
            id: episode.id,
            title: episode.episode_title,
            reason: 'No empty fields'
          });
          console.log(chalk.gray(`  ⏭️  Skipped (no empty fields)`));
        }
      }

      // Summary
      if (dryRun) {
        console.log(chalk.yellow.bold('\n📊 Dry Run Summary (No Changes Applied):'));
        console.log(chalk.yellow(`  🔍 Would update: ${results.updated.length} episodes`));
      } else {
        console.log(chalk.blue.bold('\n📊 Propagation Summary:'));
        console.log(chalk.green(`  ✅ Updated: ${results.updated.length} episodes`));
      }
      console.log(chalk.gray(`  ⏭️  Skipped: ${results.skipped.length} episodes`));
      if (results.errors.length > 0) {
        console.log(chalk.red(`  ❌ Errors: ${results.errors.length} episodes`));
      }

      return {
        success: results.errors.length === 0,
        updated: results.updated.length,
        skipped: results.skipped.length,
        errors: results.errors,
        details: results,
        dryRun: dryRun
      };

    } catch (error) {
      this.logger.error(`Propagation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Propagate season data from media description ID (resolves to season entity)
   * @param {string} mediaDescriptionId - Media description ID
   * @param {boolean} dryRun - If true, only preview changes without applying them
   * @returns {Promise<Object>} Results of propagation
   */
  async propagateSeasonDataFromMediaDescription(mediaDescriptionId, dryRun = false) {
    try {
      const token = await this._authenticateAndGetToken();
      const season = await this._fetchSeasonMediaDescription(mediaDescriptionId, token);
      const seasonId = await this._resolveSeasonEntity(mediaDescriptionId, season, token);

      return await this.propagateSeasonDataCore(seasonId, mediaDescriptionId, dryRun);
    } catch (error) {
      this.logger.error(`Propagation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Propagate season data from season entity ID (resolves to media description)
   * @param {string} seasonId - Season entity ID
   * @param {boolean} dryRun - If true, only preview changes without applying them
   * @returns {Promise<Object>} Results of propagation
   */
  async propagateSeasonDataFromSeasonId(seasonId, dryRun = false) {
    try {
      const token = await this._authenticateAndGetToken();

      // Fetch Season entity to get general_media_description_id
      console.log(chalk.gray(`Fetching season entity: ${seasonId}`));
      const seasonResponse = await axios.get(
        `${this.config.backend.baseUrl}/api/v1/seasons/${seasonId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const seasonMediaDescriptionId = seasonResponse.data.general_media_description_id;

      if (!seasonMediaDescriptionId) {
        throw new Error(`Season ${seasonId} does not have a general_media_description_id`);
      }

      console.log(chalk.green(`✅ Found season media description ID: ${seasonMediaDescriptionId}`));

      return await this.propagateSeasonDataCore(seasonId, seasonMediaDescriptionId, dryRun);
    } catch (error) {
      this.logger.error(`Propagation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Propagate missing data from season to all episodes
   * @param {string} seasonMediaDescriptionId - ID of the season media description
   * @param {boolean} dryRun - If true, only preview changes without applying them
   * @returns {Promise<Object>} Results of propagation
   * @deprecated Use propagateSeasonDataFromMediaDescription instead
   */
  async propagateMissingFromSeasonToEpisodes(seasonMediaDescriptionId, dryRun = false) {
    // Backward compatibility wrapper - delegates to new method
    return await this.propagateSeasonDataFromMediaDescription(seasonMediaDescriptionId, dryRun);
  }
}

export default PropagationService;
