var axios = require('axios');
var http = require('http');
var https = require('https');
var config = require('../config');
var jwtUtil = require('../utils/qweather-jwt');

var httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
var httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

var BASE_URL = 'https://' + config.qweather.apiHost + '/v7';

var MAX_RETRY = 2;

function getAuthHeader() {
  if (config.qweather.kid && config.qweather.privateKey) {
    return jwtUtil.getToken().then(function(token) {
      return { Authorization: 'Bearer ' + token };
    });
  }
  if (config.qweather.key) {
    return Promise.resolve({ 'X-QW-Api-Key': config.qweather.key });
  }
  return Promise.resolve({});
}

function fetchWeather(endpoint, params) {
  return getAuthHeader().then(function(headers) {
    var requestConfig = {
      params: Object.assign({}, params),
      headers: headers,
      decompress: true,
      httpsAgent: httpsAgent,
      httpAgent: httpAgent,
      timeout: 8000
    };
    return requestWithRetry(BASE_URL + '/' + endpoint, requestConfig);
  });
}

function requestWithRetry(url, reqConfig, attempt) {
  attempt = attempt || 0;
  return axios.get(url, reqConfig).then(function(response) {
    var data = response.data;
    if (data.code === '429') {
      if (attempt < MAX_RETRY) {
        var delay = (attempt + 1) * 1000 + Math.floor(Math.random() * 500);
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(requestWithRetry(url, reqConfig, attempt + 1));
          }, delay);
        });
      }
    }
    return data;
  }).catch(function(err) {
    var status = err.response ? err.response.status : 0;
    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return { code: String(status), message: '请求被拒绝' };
    }
    if (attempt < MAX_RETRY) {
      var delay = (attempt + 1) * 1000 + Math.floor(Math.random() * 500);
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(requestWithRetry(url, reqConfig, attempt + 1));
        }, delay);
      });
    }
    throw err;
  });
}

function getCurrentWeather(location) {
  return fetchWeather('weather/now', { location: location || config.qweather.location });
}

function getHourlyForecast(location) {
  return fetchWeather('weather/24h', { location: location || config.qweather.location });
}

function getDailyForecast(location) {
  return fetchWeather('weather/7d', { location: location || config.qweather.location });
}

function getAirQuality() {
  var parts = (config.qweather.location || '').split(',');
  var lat = parts[1] || '';
  var lon = parts[0] || '';
  if (!lat || !lon) return Promise.reject(new Error('QWEATHER_LOCATION not configured'));
  var endpoint = 'airquality/v1/current/' + lat + '/' + lon;
  return getAuthHeader().then(function(headers) {
    var requestConfig = {
      params: { lang: 'zh' },
      headers: headers,
      decompress: true,
      httpsAgent: httpsAgent,
      httpAgent: httpAgent,
      timeout: 8000
    };
    return requestWithRetry('https://' + config.qweather.apiHost + '/' + endpoint, requestConfig);
  });
}

function getIndices(location) {
  return fetchWeather('indices/1d', { location: location || config.qweather.location, type: '1,2,3,5,6,9' });
}

function getWeatherAlert() {
  var parts = (config.qweather.location || '').split(',');
  var lat = parts[1] || '';
  var lon = parts[0] || '';
  if (!lat || !lon) return Promise.reject(new Error('QWEATHER_LOCATION not configured'));
  var endpoint = 'weatheralert/v1/current/' + lat + '/' + lon;
  return getAuthHeader().then(function(headers) {
    var requestConfig = {
      params: { lang: 'zh' },
      headers: headers,
      decompress: true,
      httpsAgent: httpsAgent,
      httpAgent: httpAgent,
      timeout: 8000
    };
    return requestWithRetry('https://' + config.qweather.apiHost + '/' + endpoint, requestConfig);
  });
}

function getMinutelyPrecipitation() {
  return fetchWeather('minutely/5m', { location: config.qweather.location });
}

module.exports = {
  getCurrentWeather: getCurrentWeather,
  getHourlyForecast: getHourlyForecast,
  getDailyForecast: getDailyForecast,
  getAirQuality: getAirQuality,
  getIndices: getIndices,
  getWeatherAlert: getWeatherAlert,
  getMinutelyPrecipitation: getMinutelyPrecipitation
};
