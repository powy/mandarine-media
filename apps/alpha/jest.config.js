module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/react-native)/)',
  ],
  moduleNameMapper: {
    '^share(.*)$': '<rootDir>/../../packages/share/src$1',
    '^react$': '<rootDir>/../../node_modules/react',
    '^@tanstack/react-query$': '<rootDir>/../../node_modules/@tanstack/react-query',
  },
  resolver: undefined, // Use default Jest resolver with moduleNameMapper
};