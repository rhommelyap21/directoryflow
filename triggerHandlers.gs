var TRIGGER_LOCK_WAIT_MS = 10000;
var TRIGGER_THROTTLE_MS = 2 * 60 * 1000;
var LAST_SYNC_PROPERTY = 'LAST_SYNC_EPOCH';
var PROPERTY_KEY_LISTINGS_SHEET_NAME = 'LISTINGS_SHEET_NAME';

function onOpen(e) {
  try {
    createMenu();
  } catch (err) {
    loggingService.logError(err);
  }
}

function onEdit(e) {
  try {
    if (!e || !e.range || !e.source) {
      loggingService.logError('onEdit: Invalid event object');
      return;
    }
    var listingsSheetName = configManager.getProperty(PROPERTY_KEY_LISTINGS_SHEET_NAME);
    if (!listingsSheetName) {
      // first?time setup: default to the edited sheet and save
      listingsSheetName = e.range.getSheet().getName();
      configManager.setProperty(PROPERTY_KEY_LISTINGS_SHEET_NAME, listingsSheetName);
      loggingService.logInfo('onEdit: Listings sheet not configured, defaulting to: ' + listingsSheetName);
    }
    if (e.range.getSheet().getName() !== listingsSheetName) {
      return;
    }
    syncAndInvalidate();
  } catch (err) {
    loggingService.logError(err);
  }
}

function timeDrivenTrigger() {
  try {
    syncAndInvalidate();
  } catch (err) {
    loggingService.logError(err);
  }
}

function syncAndInvalidate() {
  var lock = LockService.getScriptLock();
  var acquired = false;
  try {
    acquired = lock.tryLock(TRIGGER_LOCK_WAIT_MS);
    if (!acquired) {
      loggingService.logError('syncAndInvalidate: Unable to acquire lock.');
      return;
    }
    var props = PropertiesService.getScriptProperties();
    var lastSync = parseInt(props.getProperty(LAST_SYNC_PROPERTY), 10) || 0;
    var now = Date.now();
    if (now - lastSync < TRIGGER_THROTTLE_MS) {
      return;
    }
    props.setProperty(LAST_SYNC_PROPERTY, now.toString());
    buildJsonFeed();
    invalidateCache();
  } catch (err) {
    loggingService.logError(err);
  } finally {
    if (acquired) {
      try {
        lock.releaseLock();
      } catch (releaseErr) {
        loggingService.logError(releaseErr);
      }
    }
  }
}