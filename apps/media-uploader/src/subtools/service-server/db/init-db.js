#!/usr/bin/env node

/**
 * Database Initialization Script
 * Run this during installation to set up the LowDB database
 */

import TaskDatabase from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  console.log('========================================');
  console.log('Initializing Model Uploader Database...');
  console.log('========================================\n');

  try {
    // Create database instance (will auto-create JSON file)
    const dataDir = path.join(__dirname, '..', 'data');
    const dbPath = path.join(dataDir, 'tasks.json');

    console.log(`Database path: ${dbPath}`);

    const db = new TaskDatabase(dbPath);
    await db.initialize();

    console.log('✓ Database file created successfully');
    console.log('✓ Using LowDB (pure JavaScript, no C++ dependencies)');

    // Get initial stats
    const stats = await db.getTaskStats();
    console.log('\nInitial Database Stats:');
    console.log(`  Total tasks: ${stats.total}`);

    db.close();

    console.log('\n========================================');
    console.log('Database initialization complete!');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  initializeDatabase();
}

export default initializeDatabase;
