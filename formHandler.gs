function doGet(e) {
  var mode = 'form';
  if (e && e.parameter && typeof e.parameter.mode === 'string') {
    var m = e.parameter.mode.toLowerCase();
    if (m === 'preview' || m === 'form') mode = m;
  }
  var template = (mode === 'preview') ? 'previewUI' : 'submissionFormUI';
  try {
    return HtmlService.createTemplateFromFile(template)
      .evaluate()
      .setTitle(mode === 'preview' ? 'DirectoryFlow Preview' : 'New Listing Submission')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    loggingService.logError(err);
    return HtmlService.createHtmlOutput('<p>Error loading interface</p>');
  }
}

function doPost(e) {
  try {
    if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
      throw new Error('Missing form parameters');
    }
    var sanitized = _sanitizeParams(e.parameter);
    var record = dataParserService.parseFormData(sanitized);
    var validation = validationService.validateData(record);
    if (!validation.valid) {
      return ContentService.createTextOutput(JSON.stringify({status:'error',errors:validation.errors}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30)) {
      throw new Error('Could not acquire lock, please retry');
    }
    try {
      // Prepare row data based on field definitions
      var mapping = configManager.loadMapping();
      var sheetId = mapping.sheetId;
      var fieldsDef = mapping.fields || [];
      var rowData = fieldsDef.map(function(field) {
        return record[field.name] || '';
      });
      // Append new row to spreadsheet
      spreadsheetService.appendRow(sheetId, rowData);
    } finally {
      lock.releaseLock();
    }
    try {
      apiIntegrationService.sendNotificationEmail(record);
    } catch (emailErr) {
      loggingService.logError(emailErr);
    }
    return ContentService.createTextOutput(JSON.stringify({status:'success'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    loggingService.logError(err);
    return ContentService.createTextOutput(JSON.stringify({status:'error',message:err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function _sanitizeValue(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@]/.test(val)) {
    return '\'' + val;
  }
  return val;
}

function _sanitizeParams(rawParams) {
  var out = {};
  Object.keys(rawParams).forEach(function(key) {
    var v = rawParams[key];
    if (Array.isArray(v)) v = v[0];
    out[key] = _sanitizeValue(v);
  });
  return out;
}

// Server-side function to provide form field definitions to the UI
function getFormFields() {
  try {
    var mapping = configManager.loadMapping();
    return mapping.fields || [];
  } catch (err) {
    loggingService.logError(err);
    return [];
  }
}