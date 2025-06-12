function geocodeAddresses(listings) {
  if (!listings) {
    throw new Error('Missing input: listings');
  }
  if (!Array.isArray(listings)) {
    throw new Error('Invalid input: listings must be an array');
  }
  var MAX_PER_RUN = 50;
  var MAX_RETRIES = 5;
  var INITIAL_RETRY_DELAY_MS = 500;
  var CACHE_EXPIRATION_SEC = 21600; // 6 hours
  var cache = CacheService.getScriptCache();
  var geocoder = Maps.newGeocoder();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var processedCount = 0;
  var errors = [];
  try {
    for (var i = 0; i < listings.length; i++) {
      if (processedCount >= MAX_PER_RUN) {
        break;
      }
      var listing = listings[i];
      if (!listing || typeof listing !== 'object') {
        errors.push({ index: i, error: 'Invalid listing object' });
        continue;
      }
      if (listing.lat != null && listing.lng != null) {
        continue;
      }
      var address = listing.address;
      if (typeof address !== 'string' || !address.trim()) {
        errors.push({ index: i, error: 'Missing or invalid address' });
        continue;
      }
      address = address.trim();
      var hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, address, Utilities.Charset.UTF_8);
      var hash = hashBytes.map(function(b) {
        var v = (b < 0 ? b + 256 : b).toString(16);
        return (v.length === 1 ? '0' + v : v);
      }).join('');
      var cacheKey = 'geocode_' + hash;
      var cached = cache.get(cacheKey);
      if (cached) {
        try {
          var coords = JSON.parse(cached);
          if (coords && coords.lat != null && coords.lng != null) {
            listing.lat = coords.lat;
            listing.lng = coords.lng;
            continue;
          }
        } catch (e) {
          cache.remove(cacheKey);
          if (typeof loggingService !== 'undefined' && loggingService.logError) {
            loggingService.logError('Cache parse error for key ' + cacheKey + ': ' + e.message);
          }
        }
      }
      var response = null;
      var attempt = 0;
      var success = false;
      while (attempt < MAX_RETRIES && !success) {
        try {
          response = geocoder.geocode(address);
          if (response && response.status === 'OK' && response.results && response.results.length) {
            success = true;
            break;
          }
          if (response && response.status === 'OVER_QUERY_LIMIT') {
            Utilities.sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          } else {
            break;
          }
        } catch (e) {
          var msg = e && e.message ? e.message : '';
          if (msg.indexOf('OVER_QUERY_LIMIT') !== -1) {
            Utilities.sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          } else {
            throw e;
          }
        }
        attempt++;
      }
      if (!success) {
        var status = (response && response.status) ? response.status : 'UNKNOWN_ERROR';
        errors.push({ index: i, address: address, status: status });
        continue;
      }
      var loc = response.results[0].geometry.location;
      listing.lat = loc.lat;
      listing.lng = loc.lng;
      try {
        cache.put(cacheKey, JSON.stringify({ lat: loc.lat, lng: loc.lng }), CACHE_EXPIRATION_SEC);
      } catch (e) {
        if (typeof loggingService !== 'undefined' && loggingService.logError) {
          loggingService.logError('Cache put error for key ' + cacheKey + ': ' + e.message);
        }
      }
      processedCount++;
    }
  } finally {
    lock.releaseLock();
  }
  return { listings: listings, errors: errors };
}