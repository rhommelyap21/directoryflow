function readAllRows(sheetId) {
  if (!sheetId || typeof sheetId !== 'string') {
    throw new Error('readAllRows: Missing or invalid sheetId');
  }
  const sheet = getPrimarySheet_(sheetId);
  return sheet.getDataRange().getValues();
}

/**
 * Appends a new row of data to the first sheet of the spreadsheet.
 *
 * @param {string} sheetId The ID of the spreadsheet to update.
 * @param {Array<any>} rowData Array of values for the new row.
 * @throws {Error} If sheetId is missing or rowData is not a valid array.
 */
function appendRow(sheetId, rowData) {
  if (!sheetId || typeof sheetId !== 'string') {
    throw new Error('appendRow: Missing or invalid sheetId');
  }
  if (!Array.isArray(rowData)) {
    throw new Error('appendRow: Missing or invalid rowData; expected an array');
  }
  const sheet = getPrimarySheet_(sheetId);
  const sanitizedRow = rowData.map(value => {
    if (value === null || value === undefined) return '';
    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean' ? value : String(value);
  });
  sheet.appendRow(sanitizedRow);
}

/**
 * Opens the spreadsheet and returns its primary sheet (first sheet).
 *
 * @param {string} spreadsheetId The ID of the spreadsheet to open.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The first sheet in the spreadsheet.
 * @throws {Error} If the spreadsheet cannot be opened or has no sheets.
 */
function getPrimarySheet_(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets();
    if (!sheets || sheets.length === 0) {
      throw new Error('No sheets found in spreadsheet: ' + spreadsheetId);
    }
    return sheets[0];
  } catch (err) {
    throw new Error('getPrimarySheet_: ' + err.message);
  }
}

var spreadsheetService = {
  readAllRows: readAllRows,
  fetchSheetData: readAllRows,
  appendRow: appendRow,
  appendNewListing: appendRow,
  getPrimarySheet_: getPrimarySheet_
};