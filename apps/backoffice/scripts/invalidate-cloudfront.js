#!/usr/bin/env node

/**
 * CloudFront invalidation script - Backoffice
 * Invalidates CloudFront cache after deployment
 * Cross-platform compatible (Windows/Linux)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || 'EXAMPLEWEBDIST';
const AWS_PROFILE = process.env.AWS_PROFILE || 'default';
const PATHS_TO_INVALIDATE = [
  '/*'  // Invalidate all paths - you can customize this
];

function log(message) {
  console.log(`[CLOUDFRONT] ${new Date().toISOString()} - ${message}`);
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

function captureCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`);

    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'cmd' : command;
    const cmdArgs = isWindows ? ['/c', command, ...args] : args;

    let output = '';

    const child = spawn(cmd, cmdArgs, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${output}`));
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

async function checkCloudFrontAccess() {
  try {
    await runCommand('aws', [
      'cloudfront', 'get-distribution',
      '--id', CLOUDFRONT_DISTRIBUTION_ID,
      '--profile', AWS_PROFILE,
      '--query', 'Distribution.Id',
      '--output', 'text'
    ]);
    log(`Access to CloudFront distribution ${CLOUDFRONT_DISTRIBUTION_ID} verified`);
  } catch (error) {
    throw new Error(`Cannot access CloudFront distribution ${CLOUDFRONT_DISTRIBUTION_ID}. Check your AWS credentials and distribution ID.`);
  }
}

async function invalidateCloudFront() {
  try {
    log('Starting CloudFront invalidation for backoffice...');

    // Check AWS CLI
    await checkAWSCLI();

    // Check CloudFront access
    await checkCloudFrontAccess();

    // Create invalidation
    log(`Creating invalidation for paths: ${PATHS_TO_INVALIDATE.join(', ')}`);

    const output = await captureCommand('aws', [
      'cloudfront', 'create-invalidation',
      '--distribution-id', CLOUDFRONT_DISTRIBUTION_ID,
      '--paths', ...PATHS_TO_INVALIDATE,
      '--profile', AWS_PROFILE,
      '--output', 'json'
    ]);

    const invalidation = JSON.parse(output);
    const invalidationId = invalidation.Invalidation.Id;

    log(`Invalidation created successfully with ID: ${invalidationId}`);
    log('Waiting for invalidation to complete...');

    // Wait for invalidation to complete
    await runCommand('aws', [
      'cloudfront', 'wait', 'invalidation-completed',
      '--distribution-id', CLOUDFRONT_DISTRIBUTION_ID,
      '--id', invalidationId,
      '--profile', AWS_PROFILE
    ]);

    log('CloudFront invalidation completed successfully!');
    log(`Invalidation ID: ${invalidationId}`);

  } catch (error) {
    log(`CloudFront invalidation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the invalidation
invalidateCloudFront();
