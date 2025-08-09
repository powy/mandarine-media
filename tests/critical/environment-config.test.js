const fs = require('fs');
const path = require('path');

describe('Critical: Environment Configuration', () => {
  const REACT_NATIVE_APPS = ['alpha', 'mobile'];
  const HARDCODED_URL_PATTERNS = [
    /localhost:\d+/g,
    /127\.0\.0\.1:\d+/g,
    /http:\/\/\d+\.\d+\.\d+\.\d+:\d+/g, // Direct IP addresses with ports
  ];

  describe('Environment Variable Usage', () => {
    REACT_NATIVE_APPS.forEach(appName => {
      describe(`${appName} app`, () => {
        const appPath = path.resolve(__dirname, `../../apps/${appName}`);
        const envPath = path.join(appPath, '.env');

        beforeAll(() => {
          expect(fs.existsSync(appPath)).toBe(true);
        });

        test('has .env file for environment variables', () => {
          expect(fs.existsSync(envPath)).toBe(true);
        });

        test('config files use environment variables instead of hardcoded URLs', () => {
          const configPath = path.join(appPath, 'config');
          
          if (!fs.existsSync(configPath)) {
            console.warn(`No config directory found for ${appName}, skipping test`);
            return;
          }

          const configFiles = fs.readdirSync(configPath)
            .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
            .filter(file => !file.startsWith('index')); // Skip index files

          expect(configFiles.length).toBeGreaterThan(0);

          const problematicUrls = [];

          configFiles.forEach(fileName => {
            const filePath = path.join(configPath, fileName);
            const content = fs.readFileSync(filePath, 'utf8');

            // Check if the file imports environment variables
            const hasEnvImport = /@env|process\.env|import.*env/i.test(content);

            HARDCODED_URL_PATTERNS.forEach((pattern, index) => {
              const matches = content.match(pattern);
              if (matches) {
                matches.forEach(match => {
                  const matchIndex = content.indexOf(match);
                  const linesBefore = content.substring(0, matchIndex);
                  const lineNumber = linesBefore.split('\n').length;
                  
                  // Get the line containing the match
                  const lines = content.split('\n');
                  const matchLine = lines[lineNumber - 1];

                  // Allow URLs that are used as fallbacks with environment variables
                  const isValidFallback = /\|\||\\|\?|:/.test(matchLine) && hasEnvImport;
                  
                  // Allow staging/production URLs that are not localhost
                  const isNonLocalUrl = !match.includes('localhost') && !match.includes('127.0.0.1');
                  
                  if (!isValidFallback && !isNonLocalUrl) {
                    problematicUrls.push({
                      file: `config/${fileName}`,
                      url: match,
                      line: lineNumber,
                      context: matchLine.trim()
                    });
                  }
                });
              }
            });
          });

          if (problematicUrls.length > 0) {
            const errorMessage = problematicUrls
              .map(item => `  ${item.file}:${item.line} - "${item.url}"\n    Context: ${item.context}`)
              .join('\n');

            throw new Error(
              `CRITICAL: Hardcoded URLs found in ${appName} config files:\n${errorMessage}\n\n` +
              `These should use environment variables from .env file.\n` +
              `Acceptable patterns:\n` +
              `- BACKEND_URL || 'http://localhost:8000' (fallback)\n` +
              `- process.env.API_URL || 'fallback'\n` +
              `- Non-localhost URLs in production configs are OK`
            );
          }

          console.log(`✅ ${appName}: Config files properly use environment variables`);
        });

        test('.env file contains required backend configuration', () => {
          if (!fs.existsSync(envPath)) {
            throw new Error(`${appName} is missing .env file`);
          }

          const envContent = fs.readFileSync(envPath, 'utf8');
          const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
          
          const envVars = {};
          envLines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              envVars[key.trim()] = valueParts.join('=').trim();
            }
          });

          // Check for backend URL configuration
          const backendVars = ['BACKEND_URL', 'API_BASE_URL', 'API_URL', 'BASE_URL'];
          const hasBackendVar = backendVars.some(varName => envVars[varName]);

          if (!hasBackendVar) {
            throw new Error(
              `${appName} .env file missing backend URL configuration.\n` +
              `Expected one of: ${backendVars.join(', ')}\n` +
              `Found variables: ${Object.keys(envVars).join(', ')}`
            );
          }

          console.log(`✅ ${appName}: .env contains backend configuration`);
        });

        test('source files do not contain hardcoded API URLs', () => {
          const srcPath = path.join(appPath, 'src');
          
          if (!fs.existsSync(srcPath)) {
            console.warn(`No src directory found for ${appName}, skipping test`);
            return;
          }

          const hardcodedUrls = [];

          function checkDirectory(dirPath, relativePath = '') {
            const items = fs.readdirSync(dirPath);
            
            items.forEach(item => {
              const itemPath = path.join(dirPath, item);
              const relativeItemPath = path.join(relativePath, item);
              
              if (fs.statSync(itemPath).isDirectory()) {
                checkDirectory(itemPath, relativeItemPath);
              } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
                const content = fs.readFileSync(itemPath, 'utf8');
                
                HARDCODED_URL_PATTERNS.forEach(pattern => {
                  const matches = content.match(pattern);
                  if (matches) {
                    matches.forEach(match => {
                      // Skip localhost:8081 (Metro bundler) and other development ports that are acceptable
                      if (match.includes(':8081') || match.includes(':19000') || match.includes(':19006')) {
                        return;
                      }
                      
                      hardcodedUrls.push({
                        file: `src/${relativeItemPath}`,
                        url: match,
                        line: content.substring(0, content.indexOf(match)).split('\n').length
                      });
                    });
                  }
                });
              }
            });
          }

          checkDirectory(srcPath);

          if (hardcodedUrls.length > 0) {
            const errorMessage = hardcodedUrls
              .map(item => `  ${item.file}:${item.line} - "${item.url}"`)
              .join('\n');

            throw new Error(
              `CRITICAL: Hardcoded URLs found in ${appName} source files:\n${errorMessage}\n\n` +
              `These should use configuration from environment variables.\n` +
              `Example: import { currentConfig } from '../config'; then use currentConfig.apiBaseUrl`
            );
          }

          console.log(`✅ ${appName}: No hardcoded URLs found in source files`);
        });
      });
    });
  });

  describe('Environment Variable Loading', () => {
    test('React Native can access environment variables', () => {
      // This test will need to be updated based on the environment loading solution chosen
      // For now, we'll just verify the mechanism exists
      
      const alphaPackagePath = path.resolve(__dirname, '../../apps/alpha/package.json');
      const packageJson = JSON.parse(fs.readFileSync(alphaPackagePath, 'utf8'));
      
      const hasEnvSupport = 
        packageJson.dependencies && (
          packageJson.dependencies['react-native-dotenv'] ||
          packageJson.dependencies['react-native-config'] ||
          packageJson.dependencies['@react-native-community/config']
        ) ||
        packageJson.devDependencies && (
          packageJson.devDependencies['react-native-dotenv'] ||
          packageJson.devDependencies['react-native-config'] ||
          packageJson.devDependencies['@react-native-community/config']
        );

      if (!hasEnvSupport) {
        console.warn(
          '⚠️  No React Native environment variable package detected. ' +
          'Consider adding react-native-dotenv or react-native-config for proper .env support.'
        );
      } else {
        console.log('✅ React Native environment variable support detected');
      }
    });
  });
});