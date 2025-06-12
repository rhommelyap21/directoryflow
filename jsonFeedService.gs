const CACHE_KEY_JSON_FEED = 'JSON_FEED';

function buildJsonFeed() {
  try {
    const raw = spreadsheetService.readAllRows();
    if (!Array.isArray(raw)) {
      throw new Error('buildJsonFeed: readAllRows did not return an array');
    }

    const mapping = configManager.getProperty('mapping');
    if (!mapping || typeof mapping !== 'object') {
      throw new Error('buildJsonFeed: Missing or invalid mapping configuration');
    }

    let parsed = dataParserService.parseRows(raw, mapping);
    if (!Array.isArray(parsed)) {
      parsed = [];
    }

    const validListings = [];
    parsed.forEach(item => {
      try {
        const validationResult = validationService.validate(item);
        if (validationResult.valid) {
          validListings.push(item);
        }
      } catch (valErr) {
        loggingService.logError('buildJsonFeed: validation error', { item, error: valErr });
      }
    });

    try {
      geocodingService.geocodeAddresses(validListings);
    } catch (geoErr) {
      loggingService.logError('buildJsonFeed: geocoding error', geoErr);
      // proceed without geocoded data
    }

    const totalItems = validListings.length;
    const defaultPageSize = Number(configManager.getProperty('pageSize')) || totalItems;
    const pageSize = defaultPageSize > 0 ? defaultPageSize : totalItems;
    const currentPage = 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const pagination = { currentPage, pageSize, totalItems, totalPages };

    const filters = {};
    const filterFields = configManager.getProperty('filterFields');
    if (Array.isArray(filterFields)) {
      filterFields.forEach(field => {
        const bucketCounts = {};
        validListings.forEach(item => {
          const value = item[field];
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (v != null && v !== '') {
                bucketCounts[v] = (bucketCounts[v] || 0) + 1;
              }
            });
          } else if (value != null && value !== '') {
            bucketCounts[value] = (bucketCounts[value] || 0) + 1;
          }
        });
        filters[field] = Object.keys(bucketCounts)
          .sort()
          .map(val => ({ value: val, count: bucketCounts[val] }));
      });
    }

    const feed = {
      listings: validListings,
      pagination,
      filters
    };

    cacheService.setCached(CACHE_KEY_JSON_FEED, feed);
    return feed;

  } catch (err) {
    loggingService.logError('buildJsonFeed: unexpected error', err);
    throw err;
  }
}