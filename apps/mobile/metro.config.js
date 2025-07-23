const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  return {
    ...config,
    watchFolders: [
      path.resolve(__dirname, '../../packages'),
      path.resolve(__dirname, '../../'),
    ],
    resolver: {
      ...config.resolver,
      nodeModulesPaths: [
        path.resolve(__dirname, '../../node_modules'),
        path.resolve(__dirname, 'node_modules'),
      ],
      unstable_enableSymlinks: true,
      sourceExts: config.resolver.sourceExts,
      assetExts: config.resolver.assetExts,
    },
  };
})();
