var dataParserService = (function() {
  'use strict';

  function parseRows(rawRows, mapping) {
    if (!rawRows) throw new Error('dataParserService.parseRows: Missing rawRows');
    if (!Array.isArray(rawRows)) throw new Error('dataParserService.parseRows: rawRows must be an array');
    if (!mapping) throw new Error('dataParserService.parseRows: Missing mapping');
    if (typeof mapping !== 'object' || Array.isArray(mapping)) throw new Error('dataParserService.parseRows: mapping must be a plain object');

    if (rawRows.length < 1) return [];
    const headerRow = rawRows[0];
    if (!Array.isArray(headerRow)) throw new Error('dataParserService.parseRows: header row must be an array');

    const headerIndexMap = Object.create(null);
    for (let i = 0; i < headerRow.length; i++) {
      const rawHeader = headerRow[i];
      if (typeof rawHeader === 'string' && rawHeader.trim()) {
        headerIndexMap[rawHeader.trim()] = i;
      }
    }

    const fieldToIndex = Object.create(null);
    for (const field in mapping) {
      if (Object.prototype.hasOwnProperty.call(mapping, field)) {
        const mapVal = mapping[field];
        let colIndex;
        if (typeof mapVal === 'number' && Number.isInteger(mapVal)) {
          colIndex = mapVal;
        } else if (typeof mapVal === 'string') {
          const key = mapVal.trim();
          colIndex = headerIndexMap[key];
        } else {
          throw new Error('dataParserService.parseRows: Invalid mapping for field "' + field + '": must be a header name or column index');
        }
        if (colIndex === undefined || colIndex < 0 || colIndex >= headerRow.length) {
          throw new Error('dataParserService.parseRows: Column not found for field "' + field + '" (mapped to "' + mapVal + '")');
        }
        fieldToIndex[field] = colIndex;
      }
    }

    const listings = [];
    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) {
        if (typeof loggingService === 'object' && typeof loggingService.logError === 'function') {
          loggingService.logError('dataParserService.parseRows: Skipping non-array row at index ' + r);
        }
        continue;
      }
      const listing = Object.create(null);
      let skipRow = false;
      for (const field in fieldToIndex) {
        if (Object.prototype.hasOwnProperty.call(fieldToIndex, field)) {
          const colIndex = fieldToIndex[field];
          const value = row[colIndex];
          if (value === undefined || value === null) {
            skipRow = true;
            if (typeof loggingService === 'object' && typeof loggingService.logError === 'function') {
              loggingService.logError('dataParserService.parseRows: Missing value for field "' + field + '" in row ' + (r + 1));
            }
          } else {
            listing[field] = value;
          }
        }
      }
      if (!skipRow) {
        listings.push(listing);
      }
    }

    return listings;
  }

  return {
    parseRows: parseRows
  };
})();