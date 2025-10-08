#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import { loadJsonFile } from './subtools/one-media-complete-upload/utils/fileUtils.js';

async function authenticateWithBackend(config) {
  const loginData = new URLSearchParams();
  loginData.append('username', config.backend.username);
  loginData.append('password', config.backend.password);

  const response = await axios.post(
    `${config.backend.baseUrl}/api/v1/auth/login`,
    loginData,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data.access_token;
}

async function checkSpecificMedia() {
  try {
    const config = await loadJsonFile('../../../propagate-config.json');
    const token = await authenticateWithBackend(config);

    // IDs from the propagation output
    const mediaIds = [
      '6cf283ba-0bdf-40f6-90a5-6dd24c0d52a7', // Les aventures de Pom-Pom et Noah
      '102db863-f88b-48f0-b4c3-f17060f4b071', // The Adventures of a Demon King's Daughter 11
      '025f1966-5bd2-4d3f-b043-33f9d6cc7e68', // Becoming the Monarch 05
    ];

    console.log('Checking specific media that were supposedly updated...\n');

    for (const id of mediaIds) {
      const response = await axios.get(
        `${config.backend.baseUrl}/api/v1/media-descriptions/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const media = response.data;

      console.log('='.repeat(60));
      console.log('Title:', media.episode_title || media.season_name || media.program_name);
      console.log('ID:', media.id);
      console.log('Type:', media.media_type);
      console.log('\nAll image fields:');

      const imageFields = [
        'image_1920_1080_id',
        'image_1920_720_id',
        'image_1080_1080_id',
        'image_810_1080_id',
        'image_1080_1920_id'
      ];

      imageFields.forEach(field => {
        console.log(`  ${field}: ${media[field] || 'null'}`);
      });

      console.log('\n');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSpecificMedia();
