#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import { loadJsonFile } from './subtools/one-media-complete-upload/utils/fileUtils.js';

const TARGET_IDS = [
  '6cf283ba-0bdf-40f6-90a5-6dd24c0d52a7', // Les aventures de Pom-Pom et Noah
  '102db863-f88b-48f0-b4c3-f17060f4b071', // The Adventures of a Demon King's Daughter 11
  '025f1966-5bd2-4d3f-b043-33f9d6cc7e68', // Becoming the Monarch 05
];

const IMAGE_1920x720_ID = '5805aa10-6ab9-4053-b027-ccc80798a746';
const IMAGE_810x1080_ID = 'f5091913-fbd3-41c8-b101-e04ebc44929b';

async function debug() {
  try {
    const config = await loadJsonFile('../../../propagate-config.json');

    const loginData = new URLSearchParams();
    loginData.append('username', config.backend.username);
    loginData.append('password', config.backend.password);

    const authResp = await axios.post(
      `${config.backend.baseUrl}/api/v1/auth/login`,
      loginData,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const token = authResp.data.access_token;

    console.log('Fetching media in pages...\n');

    let offset = 0;
    const limit = 100;
    let pageNum = 1;
    const foundIds = new Set();

    while (offset < 600) {
      const response = await axios.get(
        `${config.backend.baseUrl}/api/v1/media-descriptions`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { offset, limit }
        }
      );

      const mediaData = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      console.log(`Page ${pageNum} (offset ${offset}): ${mediaData.length} items`);

      // Check if any target IDs are in this page
      mediaData.forEach(media => {
        if (TARGET_IDS.includes(media.id)) {
          foundIds.add(media.id);
          const has1920 = media.image_1920_720_id === IMAGE_1920x720_ID;
          const has810 = media.image_810_1080_id === IMAGE_810x1080_ID;
          console.log(chalk.green(`  ✓ FOUND: ${media.episode_title || media.season_name || 'Untitled'}`));
          console.log(chalk.green(`    ID: ${media.id}`));
          console.log(chalk.green(`    Has 1920x720? ${has1920}, Has 810x1080? ${has810}`));
        }
      });

      if (mediaData.length === 0) {
        break;
      }

      offset += limit;
      pageNum++;
    }

    console.log(`\n\nSummary: Found ${foundIds.size} out of ${TARGET_IDS.length} target IDs`);
    TARGET_IDS.forEach(id => {
      if (!foundIds.has(id)) {
        console.log(chalk.red(`  Missing: ${id}`));
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();
