#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import { loadJsonFile } from './subtools/one-media-complete-upload/utils/fileUtils.js';

async function authenticateWithBackend(config) {
  try {
    const loginUrl = `${config.backend.baseUrl}/api/v1/auth/login`;

    const loginData = new URLSearchParams();
    loginData.append('username', config.backend.username);
    loginData.append('password', config.backend.password);

    const response = await axios.post(loginUrl, loginData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    return response.data.access_token;
  } catch (error) {
    throw new Error(`Failed to authenticate: ${error.message}`);
  }
}

async function checkMedia() {
  try {
    const config = await loadJsonFile('../../../propagate-config.json');
    const token = await authenticateWithBackend(config);

    // Get the season first
    const seasonId = '6e12aa1e-006b-4242-983e-2a733c959fa4';

    console.log('Fetching season data...\n');
    const seasonResponse = await axios.get(
      `${config.backend.baseUrl}/api/v1/media-descriptions/${seasonId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const season = seasonResponse.data;

    console.log('=== SEASON DATA ===');
    console.log('ID:', season.id);
    console.log('Title:', season.episode_title);
    console.log('\nImage Fields:');
    console.log('  image_1920x1080_id:', season.image_1920x1080_id);
    console.log('  image_1920x720_id:', season.image_1920x720_id);
    console.log('  image_1080x1080_id:', season.image_1080x1080_id);
    console.log('  image_810x1080_id:', season.image_810x1080_id);
    console.log('  image_1080x1920_id:', season.image_1080x1920_id);

    // Also check alternative field names with underscores
    console.log('\nAlternative field names (with underscores):');
    console.log('  image_1920_1080_id:', season.image_1920_1080_id);
    console.log('  image_1920_720_id:', season.image_1920_720_id);
    console.log('  image_1080_1080_id:', season.image_1080_1080_id);
    console.log('  image_810_1080_id:', season.image_810_1080_id);
    console.log('  image_1080_1920_id:', season.image_1080_1920_id);

    // Fetch a few episodes to compare
    console.log('\n\n=== SAMPLE EPISODES ===\n');

    const episodesResponse = await axios.get(
      `${config.backend.baseUrl}/api/v1/media-descriptions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 5 }
      }
    );

    const episodes = Array.isArray(episodesResponse.data)
      ? episodesResponse.data
      : episodesResponse.data.data || [];

    episodes.slice(0, 3).forEach((ep, index) => {
      console.log(`\nEpisode ${index + 1}: ${ep.episode_title || ep.season_name || 'Untitled'}`);
      console.log('  ID:', ep.id);
      console.log('  Type:', ep.media_type);
      console.log('  image_1920x720_id:', ep.image_1920x720_id);
      console.log('  image_810x1080_id:', ep.image_810x1080_id);
      console.log('  image_1920_720_id:', ep.image_1920_720_id);
      console.log('  image_810_1080_id:', ep.image_810_1080_id);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

checkMedia();
