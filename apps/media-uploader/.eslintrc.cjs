module.exports = {
  root: true,
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // CLI tools need console output
    'no-process-exit': 'off', // CLI tools need process.exit
    'no-undef': 'warn', // Downgrade to warning for browser globals in GUI files
    'no-useless-catch': 'warn' // Downgrade to warning
  },
  env: {
    node: true,
    browser: true, // For GUI frontend files
    es6: true
  },
  globals: {
    'alert': 'readonly',
    'document': 'readonly',
    'window': 'readonly'
  }
};