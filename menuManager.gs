function createMenu() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('DirectoryFlow')
      .addItem('Configure', 'showSidebar')
      .addItem('Preview', 'openPreview')
      .addItem('Publish', 'publishStaticSite')
      .addToUi();
  } catch (e) {
    if (typeof loggingService !== 'undefined' && loggingService.logError) {
      loggingService.logError('Error adding DirectoryFlow menu: ' + e.message);
    }
  }
}

/**
 * Opens the DirectoryFlow configuration sidebar.
 */
function showSidebar() {
  try {
    var html = HtmlService.createTemplateFromFile('sidebarUI')
      .evaluate()
      .setTitle('DirectoryFlow Configuration');
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (e) {
    if (typeof loggingService !== 'undefined' && loggingService.logError) {
      loggingService.logError('Error showing sidebar: ' + e.message);
    }
    SpreadsheetApp.getUi().alert('Unable to open configuration sidebar. Please check logs.');
  }
}

/**
 * Opens the DirectoryFlow data preview dialog.
 */
function openPreview() {
  try {
    var html = HtmlService.createTemplateFromFile('previewUI')
      .evaluate()
      .setWidth(800)
      .setHeight(600);
    SpreadsheetApp.getUi().showModalDialog(html, 'DirectoryFlow Data Preview');
  } catch (e) {
    if (typeof loggingService !== 'undefined' && loggingService.logError) {
      loggingService.logError('Error opening preview: ' + e.message);
    }
    SpreadsheetApp.getUi().alert('Unable to open preview. Please check logs.');
  }
}

/**
 * Publishes the static site by invoking deploymentService.
 */
function publishStaticSite() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.showToast('Publishing static site...', 'DirectoryFlow', 5);
    // Build the site and then publish it
    var buildOutput = deploymentService.buildStaticSite();
    var result = deploymentService.publishSite(buildOutput);
    var url = '';
    if (typeof result === 'string') {
      url = result;
    } else if (result && typeof result.url === 'string') {
      url = result.url;
    } else {
      throw new Error('Unexpected response from publishSite');
    }
    var safeUrl = escapeHtml(url);
    var output = '<p>Site published successfully!</p>' +
                 '<p><a href="' + safeUrl + '" target="_blank" rel="noopener">' + safeUrl + '</a></p>';
    var dialog = HtmlService.createHtmlOutput(output)
      .setWidth(400)
      .setHeight(150);
    ui.showModalDialog(dialog, 'Publish Complete');
  } catch (e) {
    if (typeof loggingService !== 'undefined' && loggingService.logError) {
      loggingService.logError('Error publishing site: ' + e.message);
    }
    ui.alert('Publishing failed. Please check logs for details.');
  }
}

/**
 * Escapes HTML characters to prevent injection.
 *
 * @param {string} text
 * @return {string}
 */
function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text).replace(/[&<>"']/g, function(m) {
    return map[m];
  });
}