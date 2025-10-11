#!/usr/bin/env node

/**
 * Master deployment script - Backoffice
 * Runs build, S3 deployment, and CloudFront invalidation in sequence
 * Cross-platform compatible (Windows/Linux)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message) {
  console.log(`[DEPLOY] ${new Date().toISOString()} - ${message}`);
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    log(`Starting ${scriptName}...`);

    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'cmd' : 'node';
    const args = isWindows ? ['/c', 'node', scriptPath] : [scriptPath];

    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`${scriptName} completed successfully`);
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to run ${scriptName}: ${error.message}`));
    });
  });
}

async function deploy() {
  const startTime = Date.now();

  try {
    log('Starting full deployment process for backoffice...');
    log('='.repeat(50));

    // Step 1: Build for production
    log('Step 1/3: Building for production');
    await runScript('build-production.js');
    log('✅ Build completed');
    log('-'.repeat(30));

    // Step 2: Deploy to S3
    log('Step 2/3: Deploying to S3');
    await runScript('deploy-s3.js');
    log('✅ S3 deployment completed');
    log('-'.repeat(30));

    // Step 3: Invalidate CloudFront
    log('Step 3/3: Invalidating CloudFront cache');
    await runScript('invalidate-cloudfront.js');
    log('✅ CloudFront invalidation completed');
    log('-'.repeat(30));

    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`🎉 Full deployment completed successfully in ${duration} seconds!`);
    log('='.repeat(50));

    // Summary
    log('Deployment Summary:');
    log('- ✅ Production build created');
    log('- ✅ Files uploaded to S3');
    log('- ✅ CloudFront cache invalidated');
    log('- ✅ Backoffice is now live with latest changes');

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`❌ Deployment failed after ${duration} seconds: ${error.message}`);
    log('='.repeat(50));

    log('Troubleshooting steps:');
    log('1. Check AWS credentials are configured correctly');
    log('2. Verify S3 bucket name and region in deploy-s3.js');
    log('3. Verify CloudFront distribution ID in invalidate-cloudfront.js');
    log('4. Ensure AWS CLI is installed and accessible');
    log('5. Check that you have necessary AWS permissions');

    process.exit(1);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  log('Deployment interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('Deployment terminated');
  process.exit(1);
});

// Run the deployment
deploy();
