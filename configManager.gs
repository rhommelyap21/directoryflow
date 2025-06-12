const CONFIG_PROPERTY_KEY = 'columnMapping';

function loadMapping() {
  const props = PropertiesService.getDocumentProperties();
  const json = props.getProperty(CONFIG_PROPERTY_KEY);
  if (!json) return {};
  let parsed;
  try {
    parsed = JSON.parse(json, function(key, value) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
      return value;
    });
  } catch (e) {
    throw new Error('Invalid mapping data JSON: ' + e.message);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid mapping data: expected an object.');
  }
  const validated = {};
  for (const k in parsed) {
    if (!Object.prototype.hasOwnProperty.call(parsed, k)) continue;
    const v = parsed[k];
    if (typeof v !== 'string') {
      throw new Error('Invalid mapping value for key "' + k + '": expected string.');
    }
    validated[k] = v;
  }
  return validated;
}

function saveMapping(mappingObj) {
  if (typeof mappingObj !== 'object' || mappingObj === null || Array.isArray(mappingObj)) {
    throw new Error('Missing or invalid mappingObj: expected a non-array object.');
  }
  const sanitized = {};
  for (const k in mappingObj) {
    if (!Object.prototype.hasOwnProperty.call(mappingObj, k)) continue;
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    const v = mappingObj[k];
    if (typeof v !== 'string') {
      throw new Error('Invalid mapping value for key "' + k + '": expected string.');
    }
    sanitized[k] = v;
  }
  let json;
  try {
    json = JSON.stringify(sanitized);
  } catch (e) {
    throw new Error('Unable to serialize mappingObj: ' + e.message);
  }
  const props = PropertiesService.getDocumentProperties();
  try {
    props.setProperty(CONFIG_PROPERTY_KEY, json);
  } catch (e) {
    throw new Error('Failed to save mapping: ' + e.message);
  }
}

function getProperty(key) {
  const props = PropertiesService.getDocumentProperties();
  return props.getProperty(key);
}

function setProperty(key, value) {
  const props = PropertiesService.getDocumentProperties();
  props.setProperty(key, value);
}

function parseConfig(json) {
  if (json == null) return null;
  try {
    return JSON.parse(json, function(key, value) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
      return value;
    });
  } catch (e) {
    throw new Error('Invalid config JSON: ' + e.message);
  }
}

var configManager = {
  loadMapping: loadMapping,
  saveMapping: saveMapping,
  getProperty: getProperty,
  setProperty: setProperty,
  parseConfig: parseConfig
};