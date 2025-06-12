function getLogsSheet() {
  var sheetName = 'Logs';
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Unable to access active spreadsheet');
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Logs sheet not found: ' + sheetName);
  return sheet;
}

/**
 * Logs an error message and context to the Logs sheet and Stackdriver.
 * @param {string} msg - Error message to log.
 * @param {*} context - Contextual information (object or primitive).
 */
function logError(msg, context) {
  if (msg === undefined || msg === null || String(msg).trim() === '') {
    throw new Error('Missing msg parameter in logError');
  }
  if (context === undefined) {
    throw new Error('Missing context parameter in logError');
  }
  var sheet = getLogsSheet();
  var timestamp = new Date();
  var message = String(msg);
  var contextStr;
  try {
    contextStr = JSON.stringify(context);
  } catch (e) {
    contextStr = 'Unable to stringify context: ' + e.message;
  }
  sheet.appendRow([timestamp, 'ERROR', message, contextStr]);
  console.error([timestamp.toISOString(), 'ERROR', message, contextStr].join(' '));
}

/**
 * Logs an informational message to the Logs sheet and Stackdriver.
 * @param {string} msg - Information message to log.
 */
function logInfo(msg) {
  if (msg === undefined || msg === null || String(msg).trim() === '') {
    throw new Error('Missing msg parameter in logInfo');
  }
  var sheet = getLogsSheet();
  var timestamp = new Date();
  var message = String(msg);
  sheet.appendRow([timestamp, 'INFO', message, '']);
  console.log([timestamp.toISOString(), 'INFO', message].join(' '));
}