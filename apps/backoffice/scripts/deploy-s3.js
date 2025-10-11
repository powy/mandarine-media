#!/usr/bin/env node

/**
 * S3 deployment script - Backoffice
 * Uploads build files to S3 bucket for static website hosting
 * Cross-platform compatible (Windows/Linux)
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const S3_BUCKET = process.env.S3_BUCKET || 'kyool-backoffice';
const S3_REGION = process.env.S3_REGION || 'eu-west-3';
const AWS_PROFILE = process.env.AWS_PROFILE || 'default';

// Check for both local and monorepo dist paths
const LOCAL_DIST_PATH = path.join(process.cwd(), 'dist');
const MONOREPO_DIST_PATH = path.join(process.cwd(), '../../dist/apps/backoffice');
const DIST_PATH = fs.existsSync(MONOREPO_DIST_PATH) ? MONOREPO_DIST_PATH : LOCAL_DIST_PATH;

function log(message) {
  console.log(`[S3-DEPLOY] ${new Date().toISOString()} - ${message}`);
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

async function checkAWSCLI() {
  try {
    await runCommand('aws', ['--version']);
    log('AWS CLI is available');
  } catch (error) {
    throw new Error('AWS CLI is not installed or not in PATH. Please install AWS CLI first.');
  }
}

async function checkS3Access() {
  try {
    await runCommand('aws', ['s3', 'ls', `s3://${S3_BUCKET}`, '--profile', AWS_PROFILE]);
    log(`Access to S3 bucket ${S3_BUCKET} verified`);
  } catch (error) {
    throw new Error(`Cannot access S3 bucket ${S3_BUCKET}. Check your AWS credentials and bucket name.`);
  }
}

async function deployToS3() {
  try {
    log('Starting S3 deployment for backoffice...');

    // Check if build exists
    if (!fs.existsSync(DIST_PATH)) {
      throw new Error('Build not found. Please run the build script first.');
    }

    const files = fs.readdirSync(DIST_PATH);
    if (files.length === 0) {
      throw new Error('Build directory is empty. Please run the build script first.');
    }

    log(`Found ${files.length} files to deploy from ${DIST_PATH}`);

    // Check AWS CLI
    await checkAWSCLI();

    // Check S3 access
    await checkS3Access();

    // Sync files to S3 with appropriate cache headers
    log('Uploading files to S3...');

    // Upload HTML files with no-cache headers
    try {
      await runCommand('aws', [
        's3', 'sync', DIST_PATH, `s3://${S3_BUCKET}`,
        '--exclude', '*',
        '--include', '*.html',
        '--cache-control', 'no-cache',
        '--profile', AWS_PROFILE,
        '--region', S3_REGION,
        '--delete'
      ]);
    } catch (error) {
      log('HTML files sync completed (may not exist)');
    }

    // Upload CSS/JS files with long cache headers
    try {
      await runCommand('aws', [
        's3', 'sync', DIST_PATH, `s3://${S3_BUCKET}`,
        '--exclude', '*',
        '--include', '*.css',
        '--include', '*.js',
        '--include', '*.map',
        '--cache-control', 'max-age=31536000',
        '--profile', AWS_PROFILE,
        '--region', S3_REGION,
        '--delete'
      ]);
    } catch (error) {
      log('CSS/JS files sync completed (may not exist)');
    }

    // Upload other assets with medium cache headers
    await runCommand('aws', [
      's3', 'sync', DIST_PATH, `s3://${S3_BUCKET}`,
      '--exclude', '*.html',
      '--exclude', '*.css',
      '--exclude', '*.js',
      '--exclude', '*.map',
      '--cache-control', 'max-age=86400',
      '--profile', AWS_PROFILE,
      '--region', S3_REGION,
      '--delete'
    ]);

    log('S3 deployment completed successfully!');
    log(`Website URL: https://${S3_BUCKET}.s3-website-${S3_REGION}.amazonaws.com`);

  } catch (error) {
    log(`S3 deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the deployment
deployToS3();
