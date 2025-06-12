var API_REQUEST_TIMEOUT = 30000;

function _retryFetch(url, opts, description, maxRetries) {
  maxRetries = typeof maxRetries === 'number' ? maxRetries : 3;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return UrlFetchApp.fetch(url, opts);
    } catch (e) {
      if (attempt === maxRetries) {
        throw new Error(description + ' failed after ' + (maxRetries + 1) + ' attempts: ' + e.message);
      }
      Utilities.sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

function callGeocode(address) {
  if (typeof address !== 'string' || !address.trim()) {
    throw new Error('callGeocode: Missing or invalid input: address');
  }
  var scriptProps = PropertiesService.getScriptProperties();
  var mapsKey = scriptProps.getProperty('MAPS_API_KEY');
  if (!mapsKey) {
    throw new Error('callGeocode: Missing configuration: MAPS_API_KEY');
  }
  var mapsBaseUrl = scriptProps.getProperty('MAPS_API_URL') || 'https://maps.googleapis.com/maps/api/geocode/json';
  if (typeof mapsBaseUrl !== 'string' || !(mapsBaseUrl.startsWith('http://') || mapsBaseUrl.startsWith('https://'))) {
    throw new Error('callGeocode: Invalid MAPS_API_URL');
  }
  var url = mapsBaseUrl.replace(/\/+$/, '') + '?address=' + encodeURIComponent(address) + '&key=' + encodeURIComponent(mapsKey);
  var opts = {
    muteHttpExceptions: true,
    timeout: API_REQUEST_TIMEOUT
  };
  var response = _retryFetch(url, opts, 'callGeocode HTTP request');
  var code = response.getResponseCode();
  if (code < 200 || code > 299) {
    throw new Error('callGeocode: HTTP error ' + code + ' for URL: ' + url);
  }
  var text = response.getContentText();
  var data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('callGeocode: Invalid JSON response: ' + e.message);
  }
  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
    throw new Error('callGeocode: Geocoding failed: ' + (data.status || 'No results'));
  }
  var loc = data.results[0].geometry && data.results[0].geometry.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
    throw new Error('callGeocode: Invalid location data');
  }
  return { lat: loc.lat, lng: loc.lng };
}

function deployToHosting(buildOutput) {
  if (!buildOutput || typeof buildOutput !== 'object') {
    throw new Error('deployToHosting: Missing or invalid input: buildOutput');
  }
  var files = buildOutput.files;
  if (!Array.isArray(files)) {
    throw new Error('deployToHosting: buildOutput.files must be an array');
  }
  var invalidationPaths = Array.isArray(buildOutput.invalidationPaths) && buildOutput.invalidationPaths.length
    ? buildOutput.invalidationPaths
    : ['/*'];
  invalidationPaths.forEach(function(p) {
    if (typeof p !== 'string' || !p.trim()) {
      throw new Error('deployToHosting: Invalid invalidation path: ' + p);
    }
  });
  var scriptProps = PropertiesService.getScriptProperties();
  var token = scriptProps.getProperty('HOSTING_API_TOKEN');
  if (!token) {
    throw new Error('deployToHosting: Missing configuration: HOSTING_API_TOKEN');
  }
  var apiUrl = scriptProps.getProperty('HOSTING_API_URL');
  if (!apiUrl || !(apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
    throw new Error('deployToHosting: Missing or invalid configuration: HOSTING_API_URL');
  }
  var uploadPath = scriptProps.getProperty('HOSTING_UPLOAD_PATH') || '/upload';
  if (typeof uploadPath !== 'string') {
    throw new Error('deployToHosting: Invalid HOSTING_UPLOAD_PATH');
  }
  var cdnEndpoint = scriptProps.getProperty('CDN_INVALIDATION_ENDPOINT');
  if (!cdnEndpoint || !(cdnEndpoint.startsWith('http://') || cdnEndpoint.startsWith('https://'))) {
    throw new Error('deployToHosting: Missing or invalid configuration: CDN_INVALIDATION_ENDPOINT');
  }
  var baseUrl = apiUrl.replace(/\/+$/, '');
  var normalizedUploadPath = uploadPath.charAt(0) === '/' ? uploadPath : '/' + uploadPath;
  var headers = { Authorization: 'Bearer ' + token };
  var uploadedCount = 0;
  files.forEach(function(file) {
    if (!file || typeof file !== 'object') {
      throw new Error('deployToHosting: Invalid file object');
    }
    var path = file.path;
    var content = file.content;
    if (typeof path !== 'string' || !path.trim()) {
      throw new Error('deployToHosting: Missing or invalid file.path');
    }
    if (content === undefined || content === null) {
      throw new Error('deployToHosting: Missing file.content for path ' + path);
    }
    var url = baseUrl + normalizedUploadPath;
    var payload = JSON.stringify({ path: path, content: content });
    var opts = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      headers: headers,
      muteHttpExceptions: true,
      timeout: API_REQUEST_TIMEOUT
    };
    var response = _retryFetch(url, opts, 'deployToHosting upload ' + path);
    var code = response.getResponseCode();
    if (code < 200 || code > 299) {
      throw new Error('deployToHosting: HTTP error ' + code + ' for upload URL: ' + url);
    }
    var result;
    try {
      result = JSON.parse(response.getContentText());
    } catch (e) {
      throw new Error('deployToHosting: Invalid JSON response for ' + path + ': ' + e.message);
    }
    if (!result.success) {
      throw new Error('deployToHosting: Upload failed for ' + path + ': ' + (result.message || JSON.stringify(result)));
    }
    uploadedCount++;
  });
  var invPayload = JSON.stringify({ paths: invalidationPaths });
  var invOpts = {
    method: 'post',
    contentType: 'application/json',
    payload: invPayload,
    headers: headers,
    muteHttpExceptions: true,
    timeout: API_REQUEST_TIMEOUT
  };
  var invResponse = _retryFetch(cdnEndpoint, invOpts, 'deployToHosting CDN invalidation');
  var invCode = invResponse.getResponseCode();
  if (invCode < 200 || invCode > 299) {
    throw new Error('deployToHosting: HTTP error ' + invCode + ' for CDN invalidation URL: ' + cdnEndpoint);
  }
  var invResult;
  try {
    invResult = JSON.parse(invResponse.getContentText());
  } catch (e) {
    throw new Error('deployToHosting: Invalid JSON response from CDN invalidation: ' + e.message);
  }
  if (!invResult.success) {
    throw new Error('deployToHosting: CDN invalidation failed: ' + (invResult.message || JSON.stringify(invResult)));
  }
  return { uploaded: uploadedCount, invalidated: true };
}