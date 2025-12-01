import { Platform } from 'react-native';

/**
 * API Configuration
 * Update this with your server URL
 * 
 * For development:
 * - iOS Simulator: use 'http://localhost:8000' (if running local server)
 * - Android Emulator: use 'http://10.0.2.2:8000' (if running local server)
 * - Physical Device: use production URL 'https://postul.onrender.com'
 * 
 * Set USE_LOCAL_DEV to true to use localhost URLs in development mode
 */
const USE_LOCAL_DEV = false; // Set to true to use localhost in development

export const API_CONFIG = {
  BASE_URL: __DEV__ && USE_LOCAL_DEV
    ? Platform.OS === 'android'
      ? 'http://10.0.2.2:8000' // Android emulator
      : 'http://localhost:8000' // iOS simulator or web
    : 'http://136.167.47.159:8000', // Production server (works on physical devices)
};

export const getApiUrl = () => {
  return API_CONFIG.BASE_URL;
};

