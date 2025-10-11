#!/usr/bin/env node

/**
 * Build script for production deployment - Backoffice
 * Cross-platform compatible (Windows/Linux)
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTION_ENV = process.env.PRODUCTION_ENV || '.env.production';

function log(message) {
  console.log(`[BUILD] ${new Date().toISOString()} - ${message}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`);

    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'cmd' : command;
    const cmdArgs = isWindows ? ['/c', command, ...args] : args;

    const child = spawn(cmd, cmdArgs, {
      stdio: 'inherit',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function buildForProduction() {
  try {
    log('Starting production build for backoffice...');

    // Check if production env file exists - REQUIRED for production builds
    if (!fs.existsSync(PRODUCTION_ENV)) {
      log(`❌ ERROR: Production environment file not found!`);
      log(`Expected file: ${PRODUCTION_ENV}`);
      log('');
      log('A production environment file is required for production builds.');
      log('Please create a .env.production file with your production configuration.');
      log('');
      log('Example .env.production file:');
      log('# Production environment variables');
      log('VITE_API_BASE_URL=https://api.your-domain.com');
      log('VITE_APP_ENVIRONMENT=production');
      log('VITE_ENABLE_ANALYTICS=true');
      log('# Add other production-specific variables here');
      log('');
      log('You can also specify a different env file with:');
      log('PRODUCTION_ENV=.env.prod npm run build:production');
      throw new Error(`Missing required production environment file: ${PRODUCTION_ENV}`);
    }

    log(`✅ Using production environment file: ${PRODUCTION_ENV}`);

    // Clean previous build
    log('Cleaning previous build...');
    // Check both local dist and monorepo dist paths
    const localDistPath = path.join(process.cwd(), 'dist');
    const monorepoDistPath = path.join(process.cwd(), '../../dist/apps/backoffice');

    if (fs.existsSync(localDistPath)) {
      fs.rmSync(localDistPath, { recursive: true, force: true });
    }
    if (fs.existsSync(monorepoDistPath)) {
      fs.rmSync(monorepoDistPath, { recursive: true, force: true });
    }

    // Install dependencies
    log('Installing dependencies...');
    await runCommand('npm', ['ci']);

    // Build for production
    log('Building for production...');
    await runCommand('npm', ['run', 'build'], {
      env: {
        NODE_ENV: 'production'
      }
    });

    // Verify build output - check the actual output directory
    const actualDistPath = fs.existsSync(monorepoDistPath) ? monorepoDistPath : localDistPath;

    if (!fs.existsSync(actualDistPath)) {
      throw new Error('Build failed: dist directory not created');
    }

    const files = fs.readdirSync(actualDistPath);
    if (files.length === 0) {
      throw new Error('Build failed: dist directory is empty');
    }

    log(`Build completed successfully! Generated ${files.length} files in ${actualDistPath}`);
    log('Files created:');
    files.forEach(file => log(`  - ${file}`));

  } catch (error) {
    log(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the build
buildForProduction();
