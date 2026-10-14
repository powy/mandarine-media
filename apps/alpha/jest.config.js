module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@testing-library/react-native)/)',
  ],
  moduleNameMapper: {
    '^share(.*)$': '<rootDir>/../../packages/share/src$1',
    '^react$': '<rootDir>/../../node_modules/react',
    // Pinned to react's version in this workspace; the hoisted testing library must use this copy
    '^react-test-renderer(.*)$': '<rootDir>/node_modules/react-test-renderer$1',
    '^@tanstack/react-query$': '<rootDir>/../../node_modules/@tanstack/react-query',
  },
  resolver: undefined, // Use default Jest resolver with moduleNameMapper
};