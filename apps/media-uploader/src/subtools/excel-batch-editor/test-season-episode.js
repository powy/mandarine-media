#!/usr/bin/env node

// Create a mock ExcelBatchService for testing the logic without dependencies
class MockExcelBatchService {
  constructor() {
    this.logger = {
      info: (msg) => console.log('ℹ ', msg),
      warn: (msg) => console.log('⚠ ', msg),
      error: (msg) => console.log('❌', msg)
    };
  }

  isNumericFolderName(folderName) {
    const trimmed = folderName.replace(/^0+/, '') || '0';
    return /^\d+$/.test(trimmed) && parseInt(trimmed) > 0;
  }

  extractEpisodeNumber(folderName) {
    if (!this.isNumericFolderName(folderName)) {
      return null;
    }
    return parseInt(folderName.replace(/^0+/, '') || '0');
  }

  generateEpisodeName(seasonName, episodeNumber) {
    return `${seasonName} episode ${episodeNumber}`;
  }

  generateEpisodeSlug(seasonName, episodeNumber) {
    const baseSlug = seasonName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    return `${baseSlug}-episode-${episodeNumber}`;
  }
}

async function testSeasonEpisodeFeatures() {
  console.log('\n🧪 Testing Season-to-Episode Creation Features\n');

  const service = new MockExcelBatchService();

  // Test folder validation
  console.log('1. Testing folder name validation:');
  const testFolders = ['001', '05', '9', '10', 'episode1', 'bonus', '000', '0'];

  testFolders.forEach(folder => {
    const isNumeric = service.isNumericFolderName(folder);
    const episodeNumber = service.extractEpisodeNumber(folder);
    console.log(`   ${folder.padEnd(10)} → ${isNumeric ? '✅' : '❌'} numeric, episode: ${episodeNumber}`);
  });

  // Test episode naming
  console.log('\n2. Testing episode name generation:');
  const seasonName = 'The Adventures of Claude';
  const testEpisodes = [1, 5, 10, 23];

  testEpisodes.forEach(episodeNum => {
    const episodeName = service.generateEpisodeName(seasonName, episodeNum);
    const episodeSlug = service.generateEpisodeSlug(seasonName, episodeNum);
    console.log(`   Episode ${episodeNum}:`);
    console.log(`     Name: "${episodeName}"`);
    console.log(`     Slug: "${episodeSlug}"`);
  });

  // Test special characters in season name
  console.log('\n3. Testing slug generation with special characters:');
  const specialSeasons = [
    'Les Aventures de Claude & Cie',
    'Season 2: The Return',
    'My-Series_2024 (Extended)',
    'ÉpÍsÖdê Spëçîàl'
  ];

  specialSeasons.forEach(seasonName => {
    const slug = service.generateEpisodeSlug(seasonName, 1);
    console.log(`   "${seasonName}" → "${slug}"`);
  });

  console.log('\n✅ All tests completed!\n');
}

// Run tests
testSeasonEpisodeFeatures()
  .then(() => {
    console.log('🎉 Testing completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Testing failed:', error.message);
    process.exit(1);
  });