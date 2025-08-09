const fs = require('fs');
const path = require('path');

describe('Critical: Babel Runtime Dependency Resolution', () => {
  const WORKSPACE_APPS = ['alpha', 'mobile', 'web', 'backoffice'];
  const CRITICAL_BABEL_HELPERS = [
    '@babel/runtime/helpers/interopRequireDefault',
    '@babel/runtime/helpers/extends',
    '@babel/runtime/helpers/createClass',
    '@babel/runtime/helpers/assertThisInitialized',
    '@babel/runtime/helpers/typeof'
  ];

  describe('Package.json Dependencies', () => {
    test('all React Native apps have @babel/runtime dependency', () => {
      const reactNativeApps = ['alpha', 'mobile'];
      const errors = [];

      reactNativeApps.forEach(appName => {
        const packageJsonPath = path.resolve(__dirname, `../../apps/${appName}/package.json`);
        
        if (!fs.existsSync(packageJsonPath)) {
          errors.push(`Package.json not found for app: ${appName}`);
          return;
        }

        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const hasBabelRuntime = packageJson.dependencies && packageJson.dependencies['@babel/runtime'];
          
          if (!hasBabelRuntime) {
            errors.push(`Missing @babel/runtime dependency in ${appName}/package.json`);
          }
        } catch (err) {
          errors.push(`Failed to parse package.json for ${appName}: ${err.message}`);
        }
      });

      if (errors.length > 0) {
        throw new Error(`Babel runtime dependency issues found:\n${errors.join('\n')}`);
      }
    });
  });

  describe('Module Resolution', () => {
    test('babel runtime helpers can be resolved from alpha app context', () => {
      const alphaAppPath = path.resolve(__dirname, '../../apps/alpha');
      const errors = [];

      CRITICAL_BABEL_HELPERS.forEach(helperPath => {
        try {
          // Try to resolve the module from the alpha app's context
          require.resolve(helperPath, { paths: [alphaAppPath] });
        } catch (err) {
          errors.push(`Cannot resolve ${helperPath} from alpha app: ${err.message}`);
        }
      });

      if (errors.length > 0) {
        throw new Error(`Module resolution failures:\n${errors.join('\n')}`);
      }
    });

    test('babel runtime helpers can be resolved from mobile app context', () => {
      const mobileAppPath = path.resolve(__dirname, '../../apps/mobile');
      const errors = [];

      // Skip if mobile app doesn't exist
      if (!fs.existsSync(mobileAppPath)) {
        console.warn('Mobile app not found, skipping test');
        return;
      }

      CRITICAL_BABEL_HELPERS.forEach(helperPath => {
        try {
          require.resolve(helperPath, { paths: [mobileAppPath] });
        } catch (err) {
          errors.push(`Cannot resolve ${helperPath} from mobile app: ${err.message}`);
        }
      });

      if (errors.length > 0) {
        throw new Error(`Module resolution failures:\n${errors.join('\n')}`);
      }
    });
  });

  describe('Workspace Dependencies Coherence', () => {
    test('babel runtime versions are consistent across workspace', () => {
      const rootPackageJsonPath = path.resolve(__dirname, '../../package.json');
      const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
      const rootBabelVersion = rootPackageJson.dependencies && rootPackageJson.dependencies['@babel/runtime'];
      
      if (!rootBabelVersion) {
        throw new Error('Root package.json missing @babel/runtime dependency');
      }

      const errors = [];

      WORKSPACE_APPS.forEach(appName => {
        const appPackageJsonPath = path.resolve(__dirname, `../../apps/${appName}/package.json`);
        
        if (!fs.existsSync(appPackageJsonPath)) {
          return; // Skip non-existent apps
        }

        try {
          const appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf8'));
          const appBabelVersion = appPackageJson.dependencies && appPackageJson.dependencies['@babel/runtime'];
          
          if (appBabelVersion && appBabelVersion !== rootBabelVersion) {
            errors.push(`Version mismatch in ${appName}: ${appBabelVersion} vs root ${rootBabelVersion}`);
          }
        } catch (err) {
          errors.push(`Failed to check version in ${appName}: ${err.message}`);
        }
      });

      if (errors.length > 0) {
        throw new Error(`Babel runtime version inconsistencies:\n${errors.join('\n')}`);
      }
    });
  });

  describe('Critical Error Prevention', () => {
    test('specific error from Metro bundler should not occur', () => {
      // This test validates that the exact error scenario is prevented
      const alphaIndexPath = path.resolve(__dirname, '../../apps/alpha/index.js');
      
      if (!fs.existsSync(alphaIndexPath)) {
        throw new Error('Alpha app index.js not found');
      }

      // Check if the most critical babel helper can be resolved
      try {
        require.resolve('@babel/runtime/helpers/interopRequireDefault', { 
          paths: [path.dirname(alphaIndexPath)] 
        });
      } catch (err) {
        throw new Error(
          `CRITICAL: The exact Metro bundler error will occur! ` +
          `Cannot resolve @babel/runtime/helpers/interopRequireDefault from alpha/index.js: ${err.message}`
        );
      }
    });
  });
});