var WebSocketManager = function() {
  this.ws = null;
  this.url = '';
  this.connected = false;
  this.authenticated = false;
  this.reconnectAttempts = 0;
  this.maxReconnectAttempts = 10;
  this.reconnectDelay = 3000;
  this.heartbeatInterval = 30000;
  this.heartbeatTimer = null;
  this.reconnectTimer = null;
  this.listeners = {};
  this.token = '';
  this._lastConnectedData = null;
  this._intentionalDisconnect = false;
  this._lastPongReceived = true;
  this._offlineQueue = [];
  this._maxOfflineQueue = 50;
  this._connectionState = 'disconnected';
};

WebSocketManager.prototype.connect = function(url) {
  var self = this;
  self.url = url || self.url;
  self._intentionalDisconnect = false;
  self.token = localStorage.getItem('token') || '';

  if (self.ws && (self.ws.readyState === WebSocket.CONNECTING || self.ws.readyState === WebSocket.OPEN)) {
    return;
  }

  var wsUrl = self.url;
  if (self.token) {
    var separator = wsUrl.indexOf('?') > -1 ? '&' : '?';
    wsUrl += separator + 'token=' + encodeURIComponent(self.token);
  }

  self.connectTimeout = setTimeout(function() {
    if (!self.connected) {
      console.warn('WebSocket connection timeout');
      self.emit('_wsTimeout', {});
      if (self.ws) {
        self.ws.onclose = null;
        self.ws.close();
        self.ws = null;
      }
      self.scheduleReconnect();
    }
  }, 10000);

  try {
    self.ws = new WebSocket(wsUrl);
  } catch (e) {
    clearTimeout(self.connectTimeout);
    self.scheduleReconnect();
    return;
  }

  self.ws.onopen = function() {
    clearTimeout(self.connectTimeout);
    self.connected = true;
    self._connectionState = 'connected';
    self.emit('_connectionStateChange', { state: 'connected' });
    self.reconnectAttempts = 0;
    self.startHeartbeat();
    self.emit('_wsOpen', {});
    self._sendConnectMessage();
    self._flushOfflineQueue();
  };

  self.ws.onmessage = function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'connected') {
        self.authenticated = true;
        self._lastConnectedData = data;
      }
      if (data.type === 'pong') {
        self._lastPongReceived = true;
        return;
      }
      if (data.type) {
        self.emit(data.type, data);
      }
      self.emit('_message', data);
    } catch (e) {}
  };

  self.ws.onclose = function() {
    clearTimeout(self.connectTimeout);
    self.connected = false;
    self._connectionState = 'disconnected';
    self.emit('_connectionStateChange', { state: 'disconnected' });
    self.authenticated = false;
    self.stopHeartbeat();
    self.emit('_wsClose', {});
    self.scheduleReconnect();
  };

  self.ws.onerror = function() {
    clearTimeout(self.connectTimeout);
    self.emit('_wsError', {});
  };
};

WebSocketManager.prototype.disconnect = function() {
  this.stopHeartbeat();
  if (this.connectTimeout) {
    clearTimeout(this.connectTimeout);
    this.connectTimeout = null;
  }
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  this._intentionalDisconnect = true;
  if (this.ws) {
    this.ws.onclose = null;
    this.ws.close();
    this.ws = null;
  }
  this.connected = false;
  this.authenticated = false;
};

WebSocketManager.prototype.send = function(data) {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    var payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(payload);
  } else {
    if (this._offlineQueue.length < this._maxOfflineQueue) {
      this._offlineQueue.push(data);
    }
  }
};

WebSocketManager.prototype._flushOfflineQueue = function() {
  while (this._offlineQueue.length > 0) {
    var data = this._offlineQueue.shift();
    this.send(data);
  }
};

WebSocketManager.prototype.getConnectionState = function() {
  return this._connectionState;
};

WebSocketManager.prototype.on = function(event, callback) {
  if (!this.listeners[event]) {
    this.listeners[event] = [];
  }
  this.listeners[event].push(callback);
};

WebSocketManager.prototype.off = function(event, callback) {
  if (!this.listeners[event]) return;
  if (!callback) {
    this.listeners[event] = [];
    return;
  }
  var idx = this.listeners[event].indexOf(callback);
  if (idx > -1) {
    this.listeners[event].splice(idx, 1);
  }
};

WebSocketManager.prototype.emit = function(event, data) {
  if (!this.listeners[event]) return;
  for (var i = 0; i < this.listeners[event].length; i++) {
    try {
      this.listeners[event][i](data);
    } catch (e) {}
  }
};

WebSocketManager.prototype.startHeartbeat = function() {
  var self = this;
  self.stopHeartbeat();
  self._lastPongReceived = true;
  self.heartbeatTimer = setInterval(function() {
    if (self.ws && self.ws.readyState === WebSocket.OPEN) {
      if (!self._lastPongReceived) {
        console.warn('WebSocket heartbeat: no pong received, reconnecting');
        self.ws.onclose = null;
        self.ws.close();
        self.ws = null;
        self.connected = false;
        self.authenticated = false;
        self.stopHeartbeat();
        self.scheduleReconnect();
        return;
      }
      self._lastPongReceived = false;
      self.send({ type: 'ping' });
    }
  }, self.heartbeatInterval);
};

WebSocketManager.prototype.stopHeartbeat = function() {
  if (this.heartbeatTimer) {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
};

WebSocketManager.prototype.scheduleReconnect = function() {
  var self = this;
  if (self._intentionalDisconnect || self.reconnectAttempts >= self.maxReconnectAttempts) {
    return;
  }
  self.reconnectAttempts++;
  self._connectionState = 'reconnecting';
  self.emit('_connectionStateChange', { state: 'reconnecting', attempt: self.reconnectAttempts });
  var delay = self.reconnectDelay * Math.min(self.reconnectAttempts, 5);
  self.reconnectTimer = setTimeout(function() {
    self.connect();
  }, delay);
};

WebSocketManager.prototype._sendConnectMessage = function() {
  var token = localStorage.getItem('token') || '';
  var userStr = localStorage.getItem('user') || 'null';
  var user = null;
  try { user = JSON.parse(userStr); } catch (e) {}
  if (token && user && user.user_id) {
    this.send({
      type: 'connect',
      user_id: user.user_id,
      token: token
    });
  }
};

WebSocketManager.prototype.getLastConnectedData = function() {
  return this._lastConnectedData;
};

WebSocketManager.prototype.isReady = function() {
  return this.connected && this.authenticated;
};

WebSocketManager.prototype.ensureConnected = function() {
  if (this.connected) return;
  var token = localStorage.getItem('token');
  if (token) {
    var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var host = window.location.hostname;
    var wsPort = window.__WS_PORT__ || (window.location.protocol === 'https:' ? '443' : '10001');
    this.connect(protocol + '//' + host + ':' + wsPort + '/ws');
  }
};

var instance = new WebSocketManager();

var autoConnect = function() {
  var token = localStorage.getItem('token');
  if (token && !instance.connected) {
    var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var host = window.location.hostname;
    var wsPort = window.__WS_PORT__ || (window.location.protocol === 'https:' ? '443' : '10001');
    instance.connect(protocol + '//' + host + ':' + wsPort + '/ws');
  }
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    setTimeout(autoConnect, 100);
  } else {
    window.addEventListener('load', function() {
      setTimeout(autoConnect, 100);
    });
  }
}

export default instance;
export { autoConnect };
