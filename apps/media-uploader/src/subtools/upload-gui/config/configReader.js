import fs from 'fs';
import path from 'path';

/**
 * Simple INI configuration reader
 * Parses INI files and converts them to JSON format expected by one-complete-upload
 */
export class ConfigReader {
  /**
   * Read and parse INI configuration file
   * @param {string} configPath - Path to the INI file
   * @returns {Object} Configuration object in JSON format
   */
  static readConfig(configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const iniContent = fs.readFileSync(configPath, 'utf-8');
    const iniConfig = this.parseINI(iniContent);
    const jsonConfig = this.convertToJSON(iniConfig);

    return jsonConfig;
  }

  /**
   * Parse INI file content into object structure
   * @param {string} content - INI file content
   * @returns {Object} Parsed INI structure
   */
  static parseINI(content) {
    const result = {};
    const lines = content.split('\n');
    let currentSection = null;

    for (let line of lines) {
      line = line.trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#') || line.startsWith(';')) {
        continue;
      }

      // Check for section header
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];

        // Handle nested sections (e.g., [s3.pictures])
        if (currentSection.includes('.')) {
          const parts = currentSection.split('.');
          let current = result;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
              current[part] = current[part] || {};
              currentSection = current[part];
            } else {
              current[part] = current[part] || {};
              current = current[part];
            }
          }
        } else {
          result[currentSection] = result[currentSection] || {};
          currentSection = result[currentSection];
        }
        continue;
      }

      // Parse key-value pairs
      const keyValueMatch = line.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1].trim();
        let value = keyValueMatch[2].trim();

        // Convert value types
        value = this.convertValue(value);
        currentSection[key] = value;
      }
    }

    return result;
  }

  /**
   * Convert string values to appropriate types
   * @param {string} value - String value from INI
   * @returns {*} Converted value
   */
  static convertValue(value) {
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Convert boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Convert numbers
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      return parseFloat(value);
    }

    // Return as string
    return value;
  }

  /**
   * Convert INI structure to JSON format expected by one-complete-upload
   * @param {Object} iniConfig - Parsed INI configuration
   * @returns {Object} JSON configuration
   */
  static convertToJSON(iniConfig) {
    const jsonConfig = {
      // Backend configuration - Force IPv4 by converting localhost to 127.0.0.1
      backend: {
        baseUrl: (iniConfig.backend?.baseUrl || '').replace(/localhost/gi, '127.0.0.1'),
        username: iniConfig.backend?.username || '',
        password: iniConfig.backend?.password || ''
      },

      // Mux configuration
      mux: {
        tokenId: iniConfig.mux?.tokenId || '',
        tokenSecret: iniConfig.mux?.tokenSecret || ''
      },

      // S3 configuration
      s3: {
        accessKeyId: iniConfig.s3?.accessKeyId || '',
        secretAccessKey: iniConfig.s3?.secretAccessKey || '',
        region: iniConfig.s3?.region || 'us-east-1',
        pictures: {
          bucket: iniConfig.s3?.pictures?.bucket || '',
          keyPrefix: iniConfig.s3?.pictures?.keyPrefix || 'pictures/'
        },
        subtitles: {
          bucket: iniConfig.s3?.subtitles?.bucket || '',
          keyPrefix: iniConfig.s3?.subtitles?.keyPrefix || 'subtitles/'
        }
      },

      // Logging configuration
      logging: {
        enabled: iniConfig.logging?.enabled !== false,
        level: iniConfig.logging?.level || 'info',
        file: iniConfig.logging?.file || './upload-gui.log',
        console: iniConfig.logging?.console !== false
      }
    };

    // Add DRM configuration if specified (optional)
    if (iniConfig.drm?.configurationId) {
      jsonConfig.drm = {
        configurationId: iniConfig.drm.configurationId
      };
    }

    // Add optional CloudFront domain if specified
    if (iniConfig.s3?.cloudfrontDomain) {
      jsonConfig.s3.cloudfrontDomain = iniConfig.s3.cloudfrontDomain;
    }

    // Add general settings
    if (iniConfig.general) {
      jsonConfig.general = iniConfig.general;
    }

    // Add parallel processing settings
    if (iniConfig.parallel) {
      jsonConfig.parallel = iniConfig.parallel;
    }

    // Add process monitoring settings
    if (iniConfig.process) {
      jsonConfig.process = iniConfig.process;
    }

    // Skip validation here - proper validation happens in one-media-complete-upload configSchema.js
    // this.validateConfig(jsonConfig);

    return jsonConfig;
  }

  /**
   * Validate that required configuration fields are present
   * @param {Object} config - Configuration object to validate
   * @throws {Error} If required fields are missing
   */
  static validateConfig(config) {
    const required = [
      { path: 'backend.baseUrl', name: 'Backend Base URL' },
      { path: 'backend.username', name: 'Backend Username' },
      { path: 'backend.password', name: 'Backend Password' },
      { path: 'mux.tokenId', name: 'Mux Token ID' },
      { path: 'mux.tokenSecret', name: 'Mux Token Secret' },
      { path: 's3.accessKeyId', name: 'S3 Access Key ID' },
      { path: 's3.secretAccessKey', name: 'S3 Secret Access Key' },
      { path: 's3.subtitles.bucket', name: 'S3 Subtitles Bucket' }
    ];

    const missing = [];

    for (const field of required) {
      const value = this.getNestedValue(config, field.path);
      if (!value || value.toString().trim() === '') {
        missing.push(field.name);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot-separated path (e.g., 'backend.baseUrl')
   * @returns {*} Value at path or undefined
   */
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Create a sample configuration file
   * @param {string} outputPath - Path where to create the sample config
   */
  static createSampleConfig(outputPath) {
    const sampleConfig = `# Media Upload GUI Configuration
# Edit this file with your actual credentials and settings

[general]
verbose=true
maxConcurrentUploads=1000
retryAttempts=3
retryDelay=5000

[parallel]
enabled=true
maxConcurrentUploads=1000
retryAttempts=3
retryDelay=5000

[process]
workerTimeout=43200000
heartbeatInterval=5000
cleanupAge=86400000

[backend]
baseUrl=https://your-api.com
username=your-username
password=your-password

[mux]
tokenId=your-mux-token-id
tokenSecret=your-mux-token-secret

[drm]
# Optional: DRM Configuration ID for protected content
# Only needed if uploading DRM-protected videos
# configurationId=your-drm-config-id

[s3]
accessKeyId=your-access-key
secretAccessKey=your-secret-key
region=us-east-1

[s3.pictures]
bucket=your-pictures-bucket
keyPrefix=pictures/

[s3.subtitles]
bucket=your-subtitles-bucket
keyPrefix=subtitles/

[logging]
enabled=true
level=info
file=./upload-gui.log
console=true
`;

    fs.writeFileSync(outputPath, sampleConfig);
  }
}