var Constants = (function() {
  'use strict';
  // Property keys for PropertiesService
  var PROPERTY_KEYS = Object.freeze({
    COLUMN_MAPPING: 'directory_column_mapping',
    FILTER_CONFIG: 'directory_filter_config',
    GEOLOCATION_COLUMN: 'directory_geolocation_column',
    PUBLISH_URL: 'directory_publish_url',
    LAST_PUBLISH_TIME: 'directory_last_publish_time',
    WEBAPP_URL: 'directory_webapp_url'
  });
  
  // Sheet names used in the spreadsheet
  var SHEET_NAMES = Object.freeze({
    DATA: 'Data',
    CONFIG: 'Config',
    LOGS: 'Logs'
  });
  
  // Cache keys for CacheService
  var CACHE_KEYS = Object.freeze({
    JSON_FEED: 'jsonFeed',
    GEOCODING: 'geocodingCache'
  });
  
  // External API endpoints
  var API_ENDPOINTS = Object.freeze({
    GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json'
  });
  
  // Supported deployment providers
  var DEPLOYMENT_PROVIDERS = Object.freeze({
    NETLIFY: 'netlify',
    VERCEL: 'vercel',
    FIREBASE: 'firebase'
  });
  
  return Object.freeze({
    PROPERTY_KEYS: PROPERTY_KEYS,
    SHEET_NAMES: SHEET_NAMES,
    CACHE_KEYS: CACHE_KEYS,
    API_ENDPOINTS: API_ENDPOINTS,
    DEPLOYMENT_PROVIDERS: DEPLOYMENT_PROVIDERS,
    DEFAULT_DEPLOYMENT_PROVIDER: DEPLOYMENT_PROVIDERS.NETLIFY
  });
})();