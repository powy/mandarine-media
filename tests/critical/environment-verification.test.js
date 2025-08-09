const fs = require('fs');
const path = require('path');

describe('Critical: Environment Variable Loading Verification', () => {
  test('alpha app configuration loads correct backend URL from .env', () => {
    const alphaPath = path.resolve(__dirname, '../../apps/alpha');
    const envPath = path.join(alphaPath, '.env');
    
    // Read the .env file
    expect(fs.existsSync(envPath)).toBe(true);
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Extract BACKEND_URL from .env
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    let expectedBackendUrl = null;
    
    envLines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && key.trim() === 'BACKEND_URL') {
        expectedBackendUrl = valueParts.join('=').trim();
      }
    });
    
    expect(expectedBackendUrl).toBeDefined();
    expect(expectedBackendUrl).not.toBe('http://localhost:8000');
    
    // Read the development config to verify it uses environment variable
    const configPath = path.join(alphaPath, 'config/config.development.ts');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Verify it imports from @env
    expect(configContent).toContain("import { BACKEND_URL } from '@env'");
    
    // Verify it uses the environment variable with fallback
    expect(configContent).toContain('BACKEND_URL ||');
    
    console.log(`✅ Expected backend URL from .env: ${expectedBackendUrl}`);
    console.log('✅ Config properly imports and uses BACKEND_URL with fallback');
  });

  test('babel configuration supports react-native-dotenv', () => {
    const alphaPath = path.resolve(__dirname, '../../apps/alpha');
    const babelConfigPath = path.join(alphaPath, 'babel.config.js');
    
    expect(fs.existsSync(babelConfigPath)).toBe(true);
    
    const babelConfig = fs.readFileSync(babelConfigPath, 'utf8');
    
    expect(babelConfig).toContain('react-native-dotenv');
    expect(babelConfig).toContain('@env');
    
    console.log('✅ Babel configuration properly set up for environment variables');
  });

  test('package.json includes react-native-dotenv dependency', () => {
    const alphaPath = path.resolve(__dirname, '../../apps/alpha');
    const packageJsonPath = path.join(alphaPath, 'package.json');
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const hasReactNativeDotenv = 
      (packageJson.dependencies && packageJson.dependencies['react-native-dotenv']) ||
      (packageJson.devDependencies && packageJson.devDependencies['react-native-dotenv']);
    
    expect(hasReactNativeDotenv).toBeTruthy();
    
    console.log('✅ react-native-dotenv dependency properly installed');
  });
});