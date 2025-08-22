import { config as developmentConfig } from './config.development';
import { config as stagingConfig } from './config.staging';
import { config as productionConfig } from './config.production';

type Environment = 'development' | 'staging' | 'production';

const getConfig = (env: Environment = 'staging') => {
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return stagingConfig;
  }
};

export const currentConfig = getConfig(
  (process.env.NODE_ENV as Environment) || 'development'
);

export { developmentConfig, stagingConfig, productionConfig };