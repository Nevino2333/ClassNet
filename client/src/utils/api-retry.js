import api from './api';

var MAX_RETRIES = 2;
var RETRY_DELAY = 1000;
var RETRYABLE_STATUS_CODES = [408, 500, 502, 503, 504];

function retryableRequest(method, url, config, maxRetries) {
  var retries = maxRetries !== undefined ? maxRetries : MAX_RETRIES;

  var requestFn;
  if (method === 'get') {
    requestFn = function() { return api.get(url, config); };
  } else if (method === 'post') {
    requestFn = function() { return api.post(url, config); };
  } else if (method === 'put') {
    requestFn = function() { return api.put(url, config); };
  } else if (method === 'delete') {
    requestFn = function() { return api.delete(url, config); };
  } else {
    requestFn = function() { return api.request(Object.assign({ method: method, url: url }, config)); };
  }

  return requestFn().catch(function(error) {
    var status = error.response ? error.response.status : 0;
    var isRetryable = RETRYABLE_STATUS_CODES.indexOf(status) !== -1 || !error.response;
    if (isRetryable && retries > 0) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(retryableRequest(method, url, config, retries - 1));
        }, RETRY_DELAY * (MAX_RETRIES - retries + 1));
      });
    }
    return Promise.reject(error);
  });
}

function get(url, config, retries) {
  return retryableRequest('get', url, config, retries);
}

function post(url, config, retries) {
  return retryableRequest('post', url, config, retries);
}

export default {
  get: get,
  post: post,
  request: retryableRequest
};
