import api from './api';

var CLIENT_VERSION = '__APP_VERSION__';
var CHECK_INTERVAL = 300000;
var MIN_CHECK_INTERVAL = 60000;
var UPDATE_PROMPT_COOLDOWN = 1800000;

var _lastCheckTime = 0;
var _lastPromptTime = 0;
var _checkTimer = null;
var _currentVersionInfo = null;
var _updateAvailable = false;
var _forceUpdate = false;
var _listeners = [];

function compareVersions(a, b) {
  var partsA = a.split('.').map(Number);
  var partsB = b.split('.').map(Number);
  var len = Math.max(partsA.length, partsB.length);
  for (var i = 0; i < len; i++) {
    var numA = partsA[i] || 0;
    var numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

function checkForUpdate() {
  var now = Date.now();
  if (now - _lastCheckTime < MIN_CHECK_INTERVAL) {
    return Promise.resolve(null);
  }
  _lastCheckTime = now;

  return api.get('/system/version', { timeout: 5000 }).then(function(response) {
    if (response.data && response.data.code === 200 && response.data.data) {
      var serverInfo = response.data.data;
      _currentVersionInfo = serverInfo;

      var clientVer = CLIENT_VERSION;
      if (clientVer.indexOf('__') === 0) {
        clientVer = localStorage.getItem('app_version') || '1.0.0';
      }

      var minVer = serverInfo.minClientVersion || serverInfo.version;
      var needsUpdate = compareVersions(minVer, clientVer) > 0;
      var isForceUpdate = serverInfo.forceUpdate === true;

      _updateAvailable = needsUpdate;
      _forceUpdate = isForceUpdate;

      if (needsUpdate) {
        _notifyListeners('update_available', {
          currentVersion: clientVer,
          serverVersion: serverInfo.version,
          forceUpdate: isForceUpdate,
          changelog: serverInfo.changelog || '',
          minClientVersion: minVer
        });

        if (isForceUpdate) {
          _notifyListeners('force_update', {
            currentVersion: clientVer,
            serverVersion: serverInfo.version,
            changelog: serverInfo.changelog || ''
          });
        }
      }

      return {
        needsUpdate: needsUpdate,
        forceUpdate: isForceUpdate,
        serverVersion: serverInfo.version,
        currentVersion: clientVer,
        changelog: serverInfo.changelog || ''
      };
    }
    return null;
  }).catch(function() {
    return null;
  });
}

function _notifyListeners(event, data) {
  for (var i = 0; i < _listeners.length; i++) {
    try {
      _listeners[i](event, data);
    } catch (e) {}
  }
}

function onUpdateAvailable(callback) {
  _listeners.push(callback);
  return function() {
    var idx = _listeners.indexOf(callback);
    if (idx > -1) _listeners.splice(idx, 1);
  };
}

function startPeriodicCheck() {
  stopPeriodicCheck();
  checkForUpdate();
  _checkTimer = setInterval(function() {
    checkForUpdate();
  }, CHECK_INTERVAL);
}

function stopPeriodicCheck() {
  if (_checkTimer) {
    clearInterval(_checkTimer);
    _checkTimer = null;
  }
}

function shouldPromptUpdate() {
  if (!_updateAvailable) return false;
  var now = Date.now();
  if (_forceUpdate) return true;
  if (now - _lastPromptTime < UPDATE_PROMPT_COOLDOWN) return false;
  return true;
}

function markPromptShown() {
  _lastPromptTime = Date.now();
}

function forceReload() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister();
      }
    }).catch(function() {});
  }
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (var i = 0; i < names.length; i++) {
        caches.delete(names[i]);
      }
    }).catch(function() {});
  }
  var version = CLIENT_VERSION.indexOf('__') === 0 ? (localStorage.getItem('app_version') || '1.0.0') : CLIENT_VERSION;
  localStorage.setItem('_cv', version);
  var url = location.href.split('?')[0] + '?_v=' + encodeURIComponent(version) + '&_t=' + Date.now();
  location.replace(url);
}

function handleWsUpdateNotification(data) {
  if (!data) return;
  _updateAvailable = true;
  _forceUpdate = !!data.forceUpdate;
  _currentVersionInfo = {
    version: data.version,
    forceUpdate: data.forceUpdate,
    changelog: data.changelog || '',
    minClientVersion: data.minClientVersion || data.version
  };

  _notifyListeners('update_available', {
    currentVersion: CLIENT_VERSION.indexOf('__') === 0 ? (localStorage.getItem('app_version') || '1.0.0') : CLIENT_VERSION,
    serverVersion: data.version,
    forceUpdate: !!data.forceUpdate,
    changelog: data.changelog || '',
    minClientVersion: data.minClientVersion || data.version
  });

  if (data.forceUpdate) {
    _notifyListeners('force_update', {
      currentVersion: CLIENT_VERSION.indexOf('__') === 0 ? (localStorage.getItem('app_version') || '1.0.0') : CLIENT_VERSION,
      serverVersion: data.version,
      changelog: data.changelog || ''
    });
  }
}

function isUpdateAvailable() {
  return _updateAvailable;
}

function isForceUpdate() {
  return _forceUpdate;
}

function getCurrentVersionInfo() {
  return _currentVersionInfo;
}

export default {
  checkForUpdate: checkForUpdate,
  startPeriodicCheck: startPeriodicCheck,
  stopPeriodicCheck: stopPeriodicCheck,
  onUpdateAvailable: onUpdateAvailable,
  shouldPromptUpdate: shouldPromptUpdate,
  markPromptShown: markPromptShown,
  forceReload: forceReload,
  handleWsUpdateNotification: handleWsUpdateNotification,
  isUpdateAvailable: isUpdateAvailable,
  isForceUpdate: isForceUpdate,
  getCurrentVersionInfo: getCurrentVersionInfo,
  compareVersions: compareVersions
};
