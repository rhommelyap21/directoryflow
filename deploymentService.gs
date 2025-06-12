function buildStaticSite(feed) {
  if (!Array.isArray(feed)) {
    throw new Error('buildStaticSite: Missing or invalid feed');
  }
  const escapeHtml = (text) => {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  let listItems = '';
  feed.forEach(item => {
    if (item.name) {
      listItems += '<li>' + escapeHtml(item.name) + '</li>';
    }
  });
  const safeJson = JSON.stringify(feed);
  const mapApiKey = PropertiesService.getScriptProperties().getProperty('MAPS_API_KEY');
  if (!mapApiKey) {
    throw new Error('buildStaticSite: Missing Google Maps API key');
  }
  const indexPage =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DirectoryFlow</title>' +
    '<style>body{margin:0;font-family:Arial,sans-serif}header,nav,main{padding:1rem}nav ul{list-style:none;padding:0;margin:0;display:flex;gap:1rem}nav a{text-decoration:none;color:#007ACC}</style>' +
    '</head><body><header><h1>DirectoryFlow</h1><nav><ul><li><a href="listing.html">Listing</a></li><li><a href="map.html">Map</a></li></ul></nav></header><main></main></body></html>';
  const listingPage =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Directory Listing</title>' +
    '<style>body{margin:0;font-family:Arial,sans-serif}header,main{padding:1rem}ul{list-style:none;padding:0;margin:0}li{padding:.5rem 0;border-bottom:1px solid #eee}</style>' +
    '</head><body><header><h1>Directory Listing</h1></header><main><ul>' +
    listItems +
    '</ul></main></body></html>';
  const mapPage =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Map View</title>' +
    '<style>body,html{height:100%;margin:0;font-family:Arial,sans-serif}header{padding:1rem}#map{height:calc(100% - 3.5rem)}</style>' +
    '</head><body><header><h1>Map View</h1></header><div id="map"></div>' +
    '<script>function initMap(){var map=new google.maps.Map(document.getElementById("map"),{zoom:2,center:{lat:0,lng:0}});fetch("feed.json",{cache:"no-cache"}).then(r=>r.json()).then(data=>{data.forEach(item=>{if(item.lat&&item.lng){new google.maps.Marker({position:{lat:item.lat,lng:item.lng},map:map,title:item.name});}});});}</script>' +
    '<script async defer src="https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(mapApiKey) + '&callback=initMap"></script>' +
    '</body></html>';
  return {
    'index.html': indexPage,
    'listing.html': listingPage,
    'map.html': mapPage,
    'feed.json': safeJson
  };
}

function deployStaticSite(feed) {
  if (!Array.isArray(feed)) {
    throw new Error('deployStaticSite: Missing or invalid feed');
  }
  const buildOutput = buildStaticSite(feed);
  const files = Object.keys(buildOutput).map(path => ({ path: path, content: buildOutput[path] }));
  const invalidationPaths = files.map(file => '/' + file.path);
  const config = { files: files, invalidationPaths: invalidationPaths };
  try {
    return deployToHosting(config);
  } catch (err) {
    if (typeof loggingService !== 'undefined' && typeof loggingService.logError === 'function') {
      loggingService.logError('deployStaticSite', err);
    }
    throw err;
  }
}

function publishSite(buildOutput) {
  if (!buildOutput || typeof buildOutput !== 'object') {
    throw new Error('publishSite: Missing or invalid buildOutput');
  }
  const required = ['index.html', 'listing.html', 'map.html', 'feed.json'];
  required.forEach(file => {
    if (!buildOutput.hasOwnProperty(file) || typeof buildOutput[file] !== 'string') {
      throw new Error('publishSite: buildOutput must contain valid ' + file);
    }
  });
  try {
    return deployToHosting(buildOutput);
  } catch (err) {
    if (typeof loggingService !== 'undefined' && typeof loggingService.logError === 'function') {
      loggingService.logError('publishSite', err);
    }
    throw err;
  }
}