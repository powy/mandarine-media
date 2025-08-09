const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    // Include workspace root for dependency resolution
    path.resolve(__dirname, '../..'),
  ],
  resolver: {
    // Configure node_modules resolution for workspace
    nodeModulesPaths: [
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, './node_modules'),
    ],
    // Force single instance of React Query and React across workspace
    alias: {
      '@tanstack/react-query': path.resolve(__dirname, '../../node_modules/@tanstack/react-query'),
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-native': path.resolve(__dirname, './node_modules/react-native'),
    },
    // Prevent duplicate React instances
    dedupeDependencies: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);