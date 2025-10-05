// Environment Configuration
const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  WHATSAPP_API_URL: process.env.REACT_APP_WHATSAPP_API_URL || 'http://localhost:3001',
  
  // App Configuration
  APP_NAME: process.env.REACT_APP_NAME || 'SuperMarket POS',
  APP_VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  
  // Features Configuration
  ENABLE_DARK_MODE: process.env.REACT_APP_ENABLE_DARK_MODE === 'true',
  ENABLE_NOTIFICATIONS: process.env.REACT_APP_ENABLE_NOTIFICATIONS !== 'false',
  ENABLE_OFFLINE_MODE: process.env.REACT_APP_ENABLE_OFFLINE_MODE === 'true',
  
  // Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 5242880, // 5MB
  ALLOWED_IMAGE_TYPES: process.env.REACT_APP_ALLOWED_IMAGE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
  ALLOWED_DOCUMENT_TYPES: process.env.REACT_APP_ALLOWED_DOCUMENT_TYPES?.split(',') || [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  
  // Development Configuration
  DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE === 'true',
  LOG_LEVEL: process.env.REACT_APP_LOG_LEVEL || 'info',
  
  // External Services
  GOOGLE_ANALYTICS_ID: process.env.REACT_APP_GOOGLE_ANALYTICS_ID,
  SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN,
  
  // PWA Configuration
  ENABLE_PWA: process.env.REACT_APP_ENABLE_PWA !== 'false',
  PWA_CACHE_VERSION: process.env.REACT_APP_PWA_CACHE_VERSION || '1',
  
  // Barcode Scanner Configuration
  ENABLE_CAMERA_SCANNER: process.env.REACT_APP_ENABLE_CAMERA_SCANNER !== 'false',
  SCANNER_TIMEOUT: parseInt(process.env.REACT_APP_SCANNER_TIMEOUT) || 30000,
  
  // Performance Configuration
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS) || 3,
};

// Validation
const validateConfig = () => {
  const requiredFields = ['API_URL', 'APP_NAME'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
  }
  
  // Validate API URL format
  try {
    new URL(config.API_URL);
  } catch (error) {
    throw new Error('Invalid API_URL format');
  }
  
  // Validate file size limits
  if (config.MAX_FILE_SIZE < 1024) {
    console.warn('MAX_FILE_SIZE is very small (< 1KB), uploads may fail');
  }
  
  if (config.MAX_FILE_SIZE > 50 * 1024 * 1024) {
    console.warn('MAX_FILE_SIZE is very large (> 50MB), uploads may be slow');
  }
};

// Environment-specific configurations
const environmentConfigs = {
  development: {
    DEBUG_MODE: true,
    LOG_LEVEL: 'debug',
    API_URL: 'http://localhost:5000/api',
    WHATSAPP_API_URL: 'http://localhost:3001',
  },
  
  production: {
    DEBUG_MODE: false,
    LOG_LEVEL: 'error',
    // These should be set via environment variables in production
    API_URL: process.env.REACT_APP_API_URL,
    WHATSAPP_API_URL: process.env.REACT_APP_WHATSAPP_API_URL,
  },
  
  staging: {
    DEBUG_MODE: true,
    LOG_LEVEL: 'info',
    API_URL: process.env.REACT_APP_API_URL,
    WHATSAPP_API_URL: process.env.REACT_APP_WHATSAPP_API_URL,
  },
  
  test: {
    DEBUG_MODE: true,
    LOG_LEVEL: 'silent',
    API_URL: 'http://localhost:5000/api',
    WHATSAPP_API_URL: 'http://localhost:3001',
  },
};

// Apply environment-specific overrides
const envOverrides = environmentConfigs[config.ENVIRONMENT] || {};
Object.assign(config, envOverrides);

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  if (config.ENVIRONMENT === 'production') {
    throw error;
  }
}

// Utility functions
export const isDevelopment = () => config.ENVIRONMENT === 'development';
export const isProduction = () => config.ENVIRONMENT === 'production';
export const isStaging = () => config.ENVIRONMENT === 'staging';
export const isTest = () => config.ENVIRONMENT === 'test';

export const getApiUrl = (endpoint = '') => {
  const baseUrl = config.API_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl;
};

export const getWhatsAppUrl = (endpoint = '') => {
  const baseUrl = config.WHATSAPP_API_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl;
};

export const isFeatureEnabled = (feature) => {
  const featureMap = {
    darkMode: config.ENABLE_DARK_MODE,
    notifications: config.ENABLE_NOTIFICATIONS,
    offlineMode: config.ENABLE_OFFLINE_MODE,
    cameraScanner: config.ENABLE_CAMERA_SCANNER,
    pwa: config.ENABLE_PWA,
  };
  
  return featureMap[feature] || false;
};

export const getUploadConfig = () => ({
  maxFileSize: config.MAX_FILE_SIZE,
  allowedImageTypes: config.ALLOWED_IMAGE_TYPES,
  allowedDocumentTypes: config.ALLOWED_DOCUMENT_TYPES,
});

export const getPerformanceConfig = () => ({
  apiTimeout: config.API_TIMEOUT,
  retryAttempts: config.RETRY_ATTEMPTS,
  scannerTimeout: config.SCANNER_TIMEOUT,
});

// Debug helper
export const logConfig = () => {
  if (config.DEBUG_MODE) {
    console.group('🔧 App Configuration');
    console.log('Environment:', config.ENVIRONMENT);
    console.log('API URL:', config.API_URL);
    console.log('WhatsApp URL:', config.WHATSAPP_API_URL);
    console.log('Debug Mode:', config.DEBUG_MODE);
    console.log('Features:', {
      darkMode: config.ENABLE_DARK_MODE,
      notifications: config.ENABLE_NOTIFICATIONS,
      offlineMode: config.ENABLE_OFFLINE_MODE,
      cameraScanner: config.ENABLE_CAMERA_SCANNER,
      pwa: config.ENABLE_PWA,
    });
    console.groupEnd();
  }
};

export default config;
