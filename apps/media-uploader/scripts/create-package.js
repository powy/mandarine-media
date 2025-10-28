#!/usr/bin/env node

/**
 * Create ZIP package for distribution
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageName = `kyool-media-uploader-v${JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version}.zip`;
const outputPath = path.join(distDir, packageName);

console.log('========================================');
console.log('Creating Distribution Package');
console.log('========================================\n');

// No longer checking for executables - we're shipping source code
console.log('Packaging source code distribution (no exe build needed)\n');

// Ensure dist directory exists
fs.ensureDirSync(distDir);

// Remove existing package
if (fs.existsSync(outputPath)) {
  console.log(`Removing existing package: ${packageName}`);
  fs.removeSync(outputPath);
}

// Create archive
console.log(`Creating package: ${packageName}\n`);

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', function() {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);

  if (sizeMB < 1) {
    console.error('\n⚠ WARNING: Package size is suspiciously small!');
    console.error(`Size: ${sizeMB} MB - expected ~15MB`);
    console.error('Some files may have failed to add to the archive.\n');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('Package Created Successfully!');
  console.log('========================================\n');
  console.log(`File: ${packageName}`);
  console.log(`Size: ${sizeMB} MB`);
  console.log(`Path: ${outputPath}\n`);
  console.log('Contents:');
  console.log('  • src/ (source code - runs with Node.js)');
  console.log('  • START.bat (double-click to start)');
  console.log('  • STOP.bat (double-click to stop)');
  console.log('  • install-services.js (optional - Windows service)');
  console.log('  • package.json');
  console.log('  • README.md\n');
  console.log('User needs: Node.js 18+ installed');
  console.log('To run: Extract ZIP, double-click START.bat\n');
});

archive.on('error', function(err) {
  console.error('✗ Error creating package:', err);
  process.exit(1);
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.error('⚠ Warning: File not found:', err.message);
  } else {
    console.error('⚠ Warning:', err);
  }
});

archive.pipe(output);

// Add files to archive
console.log('Adding files to package...');

// Verify critical paths exist
const srcDir = path.join(rootDir, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('✗ ERROR: src/ directory not found!');
  console.error(`  Expected: ${srcDir}`);
  process.exit(1);
}

const requiredFiles = [
  { path: 'START.bat', name: 'START.bat' },
  { path: 'STOP.bat', name: 'STOP.bat' },
  { path: '.run-server.bat', name: '.run-server.bat' },
  { path: '.run-ui.bat', name: '.run-ui.bat' },
  { path: 'install-services.js', name: 'install-services.js' },
  { path: 'uninstall-services.js', name: 'uninstall-services.js' }
];

for (const file of requiredFiles) {
  const filePath = path.join(rootDir, file.path);
  if (!fs.existsSync(filePath)) {
    console.error(`✗ ERROR: Required file not found: ${file.path}`);
    console.error(`  Expected: ${filePath}`);
    process.exit(1);
  }
}

// Source code
archive.directory(srcDir, 'src');
console.log('  ✓ Source code');

// Service interface (built web UI)
const interfaceDistDir = path.join(rootDir, 'src', 'subtools', 'service-interface', 'dist');
if (fs.existsSync(interfaceDistDir)) {
  archive.directory(interfaceDistDir, 'interface');
  console.log('  ✓ Service interface (built UI)');
} else {
  console.warn('  ⚠ Service interface dist not found - run build first');
}

// Start/Stop batch files (PRIMARY METHOD)
archive.file(path.join(rootDir, 'START.bat'), { name: 'START.bat' });
archive.file(path.join(rootDir, 'STOP.bat'), { name: 'STOP.bat' });
archive.file(path.join(rootDir, '.run-server.bat'), { name: '.run-server.bat' });
archive.file(path.join(rootDir, '.run-ui.bat'), { name: '.run-ui.bat' });
console.log('  ✓ START.bat / STOP.bat / wrapper scripts');

// Service scripts (optional advanced method)
archive.file(path.join(rootDir, 'install-services.js'), { name: 'install-services.js' });
archive.file(path.join(rootDir, 'uninstall-services.js'), { name: 'uninstall-services.js' });
archive.file(path.join(rootDir, 'start-services.js'), { name: 'start-services.js' });
archive.file(path.join(rootDir, 'stop-services.js'), { name: 'stop-services.js' });
console.log('  ✓ Service scripts (optional)');

// Package.json - include ALL runtime dependencies
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const distributionPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: "module",
  description: packageJson.description || "Kyool Media Uploader",
  dependencies: packageJson.dependencies
  // Note: devDependencies are intentionally excluded (archiver, etc. only needed for packaging)
};
archive.append(JSON.stringify(distributionPackageJson, null, 2), { name: 'package.json' });
console.log('  ✓ package.json (with all runtime dependencies)');

// README from docs/ folder
const readmePath = path.join(rootDir, 'docs', 'README_INSTALL.md');
if (fs.existsSync(readmePath)) {
  archive.file(readmePath, { name: 'README.md' });
  console.log('  ✓ README.md');
} else {
  console.warn('  ⚠ README.md not found (optional)');
}

// Finalize
archive.finalize();
