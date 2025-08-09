const fs = require('fs');
const path = require('path');

describe('Critical: AppRegistry Registration', () => {
  const REACT_NATIVE_APPS = ['alpha', 'mobile'];

  describe('App Registration Consistency', () => {
    REACT_NATIVE_APPS.forEach(appName => {
      describe(`${appName} app`, () => {
        const appPath = path.resolve(__dirname, `../../apps/${appName}`);
        const indexJsPath = path.join(appPath, 'index.js');
        const appJsonPath = path.join(appPath, 'app.json');

        beforeAll(() => {
          expect(fs.existsSync(appPath)).toBe(true);
        });

        test('has both index.js and app.json files', () => {
          expect(fs.existsSync(indexJsPath)).toBe(true);
          expect(fs.existsSync(appJsonPath)).toBe(true);
        });

        test('app.json and AppRegistry.registerComponent names match exactly', () => {
          const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
          const indexJsContent = fs.readFileSync(indexJsPath, 'utf8');

          let appJsonData;
          try {
            appJsonData = JSON.parse(appJsonContent);
          } catch (err) {
            throw new Error(`Failed to parse app.json for ${appName}: ${err.message}`);
          }

          const appJsonName = appJsonData.name;
          expect(appJsonName).toBeDefined();
          expect(typeof appJsonName).toBe('string');

          // Extract the registerComponent call from index.js
          const directRegex = /AppRegistry\.registerComponent\s*\(\s*['"](.*?)['"]/;
          const dynamicRegex = /AppRegistry\.registerComponent\s*\(\s*appName\s*,/;
          const importAppNameRegex = /import\s*\{\s*name\s+as\s+appName\s*\}\s*from\s*['"]\.\/app\.json['"]/;

          const directMatch = indexJsContent.match(directRegex);
          const hasDynamicPattern = dynamicRegex.test(indexJsContent) && importAppNameRegex.test(indexJsContent);

          let registeredName;

          if (directMatch) {
            // Direct string registration: AppRegistry.registerComponent('appName', () => App)
            registeredName = directMatch[1];
          } else if (hasDynamicPattern) {
            // Dynamic registration: import { name as appName } from './app.json'; AppRegistry.registerComponent(appName, () => App)
            registeredName = appJsonName;
            console.log(`✅ ${appName}: Using dynamic app name import pattern`);
          } else {
            throw new Error(
              `AppRegistry.registerComponent call not found in ${appName}/index.js. ` +
              `Expected format: AppRegistry.registerComponent('appName', () => Component) ` +
              `or dynamic import pattern with: import { name as appName } from './app.json'`
            );
          }

          if (!registeredName) {
            throw new Error(`Could not determine registered app name for ${appName}`);
          }

          if (appJsonName !== registeredName) {
            throw new Error(
              `CRITICAL: App name mismatch in ${appName}!\n` +
              `app.json declares: "${appJsonName}"\n` +
              `AppRegistry.registerComponent uses: "${registeredName}"\n` +
              `These must match exactly (case-sensitive) or React Native will fail with:\n` +
              `"${appJsonName}" has not been registered.\n\n` +
              `Fix: Either change app.json name to "${registeredName}" or change registerComponent to "${appJsonName}"`
            );
          }

          console.log(`✅ ${appName}: app.json name "${appJsonName}" matches AppRegistry registration`);
        });

        test('AppRegistry import exists', () => {
          const indexJsContent = fs.readFileSync(indexJsPath, 'utf8');
          
          const hasAppRegistryImport = /import\s+.*AppRegistry.*from\s+['"]react-native['"]/.test(indexJsContent) ||
                                     /const\s+.*AppRegistry.*=\s+require\(['"]react-native['"]\)/.test(indexJsContent);
          
          if (!hasAppRegistryImport) {
            throw new Error(
              `AppRegistry import not found in ${appName}/index.js. ` +
              `Required: import { AppRegistry } from 'react-native';`
            );
          }
        });

        test('App component is properly imported and used', () => {
          const indexJsContent = fs.readFileSync(indexJsPath, 'utf8');
          
          // Check for App import
          const hasAppImport = /import\s+App\s+from/.test(indexJsContent) ||
                              /const\s+App\s+=\s+require/.test(indexJsContent);
          
          if (!hasAppImport) {
            throw new Error(
              `App component import not found in ${appName}/index.js. ` +
              `Required: import App from './src/App';`
            );
          }

          // Check that App is used in registerComponent
          const registerComponentCall = /AppRegistry\.registerComponent\s*\([^)]*\)\s*=>\s*App\s*\)/;
          const hasAppUsage = registerComponentCall.test(indexJsContent) ||
                             indexJsContent.includes('() => App');

          if (!hasAppUsage) {
            throw new Error(
              `App component not properly used in registerComponent in ${appName}/index.js. ` +
              `Expected: AppRegistry.registerComponent('appName', () => App);`
            );
          }
        });

        test('App component file exists', () => {
          const appComponentPath = path.join(appPath, 'src/App.tsx');
          const appComponentPathJs = path.join(appPath, 'src/App.js');
          
          const appExists = fs.existsSync(appComponentPath) || fs.existsSync(appComponentPathJs);
          
          if (!appExists) {
            throw new Error(
              `App component file not found for ${appName}. ` +
              `Expected: ${appPath}/src/App.tsx or ${appPath}/src/App.js`
            );
          }

          // Read the App component and verify it's a valid React component
          const actualAppPath = fs.existsSync(appComponentPath) ? appComponentPath : appComponentPathJs;
          const appContent = fs.readFileSync(actualAppPath, 'utf8');

          const isValidReactComponent = /export\s+default/.test(appContent) &&
                                       (/React\.FC/.test(appContent) || /function/.test(appContent) || /const.*=/.test(appContent));

          if (!isValidReactComponent) {
            throw new Error(
              `App component in ${actualAppPath} doesn't appear to be a valid React component. ` +
              `Must have 'export default' and be a function or React.FC`
            );
          }
        });
      });
    });
  });

  describe('Cross-App Registration Conflicts', () => {
    test('no duplicate app registration names across React Native apps', () => {
      const registrationNames = new Map();
      const conflicts = [];

      REACT_NATIVE_APPS.forEach(appName => {
        const indexJsPath = path.resolve(__dirname, `../../apps/${appName}/index.js`);
        
        if (!fs.existsSync(indexJsPath)) {
          return; // Skip non-existent apps
        }

        const indexJsContent = fs.readFileSync(indexJsPath, 'utf8');
        const registerComponentRegex = /AppRegistry\.registerComponent\s*\(\s*['"](.*?)['"]/;
        const match = indexJsContent.match(registerComponentRegex);

        if (match) {
          const registeredName = match[1];
          
          if (registrationNames.has(registeredName)) {
            conflicts.push(`Duplicate registration name "${registeredName}" found in both ${registrationNames.get(registeredName)} and ${appName}`);
          } else {
            registrationNames.set(registeredName, appName);
          }
        }
      });

      if (conflicts.length > 0) {
        throw new Error(
          `App registration conflicts detected:\n${conflicts.join('\n')}\n\n` +
          `Each React Native app must have a unique registration name.`
        );
      }
    });
  });
});