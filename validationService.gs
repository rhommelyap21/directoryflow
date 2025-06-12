var validationService = validationService || {};

validationService.validate = function(listing) {
  if (typeof listing !== 'object' || listing === null) {
    throw new Error('Invalid input: listing must be a non-null object');
  }
  var errors = [];
  var requiredFields = ['name', 'email', 'url'];
  requiredFields.forEach(function(field) {
    if (listing[field] == null || listing[field].toString().trim() === '') {
      errors.push('Missing required field: ' + field);
    }
  });
  if (listing.email != null && listing.email.toString().trim() !== '') {
    var email = listing.email.toString().trim();
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push('Invalid email format: ' + email);
    }
  }
  if (listing.url != null && listing.url.toString().trim() !== '') {
    var urlString = listing.url.toString().trim();
    try {
      var urlObj = new URL(urlString);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Unsupported protocol');
      }
    } catch (e) {
      errors.push('Invalid URL format: ' + urlString);
    }
  }
  return {
    valid: errors.length === 0,
    errors: errors
  };
};

validationService.validateData = function(listings) {
  if (!Array.isArray(listings)) {
    throw new Error('Invalid input: listings must be an array');
  }
  var validListings = [];
  var invalidListings = [];
  listings.forEach(function(listing, index) {
    try {
      var result = validationService.validate(listing);
      if (result.valid) {
        validListings.push(listing);
      } else {
        invalidListings.push({
          index: index,
          listing: listing,
          errors: result.errors
        });
      }
    } catch (e) {
      invalidListings.push({
        index: index,
        listing: listing,
        errors: [e.message]
      });
    }
  });
  return {
    validListings: validListings,
    invalidListings: invalidListings
  };
};