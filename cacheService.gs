function fetchWithRetry(url, options, maxRetries, initialDelay) {
  maxRetries = Number(maxRetries) >= 0 ? maxRetries : 3;
  initialDelay = Number(initialDelay) > 0 ? initialDelay : 500;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      if (code >= 500 && code < 600 && attempt < maxRetries) {
        Utilities.sleep(initialDelay * Math.pow(2, attempt));
        continue;
      }
      return response;
    } catch (e) {
      if (attempt < maxRetries) {
        Utilities.sleep(initialDelay * Math.pow(2, attempt));
        continue;
      }
      if (typeof loggingService !== 'undefined' && typeof loggingService.logError === 'function') {
        loggingService.logError('fetchWithRetry error', e);
      }
      throw new Error('Failed to fetch URL [' + url + '] after ' + (attempt + 1) + ' attempts: ' + e.message);
    }
  }
}

function getCached(key) {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('getCached: Missing or invalid key');
  }
  var cache = CacheService.getScriptCache();
  var cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }
  var bucket = PropertiesService.getScriptProperties().getProperty('CACHE_BUCKET');
  if (typeof bucket !== 'string' || bucket.trim() === '') {
    throw new Error('getCached: Missing CACHE_BUCKET script property');
  }
  var encodedBucket = encodeURIComponent(bucket);
  var encodedKey = encodeURIComponent(key);
  var url = 'https://www.googleapis.com/storage/v1/b/' + encodedBucket + '/o/' + encodedKey + '?alt=media';
  var token = ScriptApp.getOAuthToken();
  var options = {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  };
  var response = fetchWithRetry(url, options);
  var code = response.getResponseCode();
  var content = response.getContentText();
  if (code !== 200) {
    throw new Error('getCached: Failed to fetch from Cloud Storage: ' + code + ' ' + content);
  }
  var ttlProp = PropertiesService.getScriptProperties().getProperty('CACHE_TTL_SECONDS');
  var ttl = parseInt(ttlProp, 10);
  if (!Number.isInteger(ttl) || ttl <= 0) {
    ttl = 21600;
  }
  cache.put(key, content, ttl);
  return content;
}

function setCached(key, data) {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('setCached: Missing or invalid key');
  }
  if (data === undefined || data === null) {
    throw new Error('setCached: Missing data');
  }
  var content = typeof data === 'string' ? data : JSON.stringify(data);
  var ttlProp = PropertiesService.getScriptProperties().getProperty('CACHE_TTL_SECONDS');
  var ttl = parseInt(ttlProp, 10);
  if (!Number.isInteger(ttl) || ttl <= 0) {
    ttl = 21600;
  }
  CacheService.getScriptCache().put(key, content, ttl);
  var bucket = PropertiesService.getScriptProperties().getProperty('CACHE_BUCKET');
  if (typeof bucket !== 'string' || bucket.trim() === '') {
    throw new Error('setCached: Missing CACHE_BUCKET script property');
  }
  var encodedBucket = encodeURIComponent(bucket);
  var encodedKey = encodeURIComponent(key);
  var url = 'https://www.googleapis.com/upload/storage/v1/b/' + encodedBucket + '/o?uploadType=media&name=' + encodedKey;
  var token = ScriptApp.getOAuthToken();
  var options = {
    method: 'post',
    contentType: 'application/octet-stream',
    payload: content,
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  };
  var response = fetchWithRetry(url, options);
  var code = response.getResponseCode();
  var respContent = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('setCached: Failed to upload to Cloud Storage: ' + code + ' ' + respContent);
  }
}