var jose = require('jose');
var config = require('../config');

var CACHED_TOKEN = null;
var TOKEN_EXPIRY = null;
var CACHED_KEY = null;
var KEY_PROMISE = null;

function importKey() {
  if (CACHED_KEY) {
    return Promise.resolve(CACHED_KEY);
  }
  if (KEY_PROMISE) {
    return KEY_PROMISE;
  }
  var privateKeyPem = config.qweather.privateKey.replace(/\\n/g, '\n');
  KEY_PROMISE = jose.importPKCS8(privateKeyPem, 'EdDSA').then(function(privateKey) {
    CACHED_KEY = privateKey;
    KEY_PROMISE = null;
    return privateKey;
  }).catch(function(err) {
    KEY_PROMISE = null;
    throw err;
  });
  return KEY_PROMISE;
}

function generateToken() {
  var now = Math.floor(Date.now() / 1000);
  var iat = now - 30;
  var exp = iat + 900;
  var header = { alg: 'EdDSA', kid: config.qweather.kid };
  var payload = { sub: config.qweather.sub, iat: iat, exp: exp };

  return importKey().then(function(privateKey) {
    return new jose.SignJWT(payload)
      .setProtectedHeader(header)
      .sign(privateKey);
  });
}

function getToken() {
  var now = Math.floor(Date.now() / 1000);
  if (CACHED_TOKEN && TOKEN_EXPIRY && now < TOKEN_EXPIRY - 60) {
    return Promise.resolve(CACHED_TOKEN);
  }
  return generateToken().then(function(token) {
    CACHED_TOKEN = token;
    TOKEN_EXPIRY = Math.floor(Date.now() / 1000) + 840;
    return token;
  });
}

function warmUp() {
  return getToken().then(function() {
    return true;
  }).catch(function() {
    return false;
  });
}

module.exports = { getToken: getToken, warmUp: warmUp };
