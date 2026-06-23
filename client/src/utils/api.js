import axios from 'axios';
import store from '@/store';
import router from '@/router';

var api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true
});

api.interceptors.request.use(function(config) {
  // 断网时只放行心跳请求，其他请求直接拒绝
  if (!store.state.network.online && config.url && config.url.indexOf('/auth/check-status') === -1) {
    return Promise.reject({ __offline: true, message: '网络不可用' });
  }
  var token = store.state.auth.token;
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  var noCachePaths = ['/auth/', '/chat/', '/community/posts', '/community/search', '/community/my/', '/community/bookmarks', '/community/ranking', '/community/reactions', '/user/settings', '/music/'];
  var needsNoCache = false;
  if (config.method === 'get') {
    for (var i = 0; i < noCachePaths.length; i++) {
      if (config.url && config.url.indexOf(noCachePaths[i]) !== -1) {
        needsNoCache = true;
        break;
      }
    }
  }
  if (needsNoCache || config.method !== 'get') {
    config.headers['Cache-Control'] = 'no-cache, no-store';
    config.headers['Pragma'] = 'no-cache';
  }
  if (needsNoCache && config.method === 'get') {
    config.params = config.params || {};
    config.params._t = Date.now();
  }
  return config;
});

var _isLoggingOut = false;
var _networkFailCount = 0;
var _NETWORK_FAIL_THRESHOLD = 5;

api.interceptors.response.use(
  function(response) {
    // 请求成功，重置失败计数并标记在线
    _networkFailCount = 0;
    if (!store.state.network.online) {
      store.commit('network/SET_ONLINE', true);
    }
    return response;
  },
  function(error) {
    // 断网拦截的请求，静默拒绝
    if (error.__offline) {
      return Promise.reject(error);
    }
    // 网络错误（无响应）时累计失败次数，连续5次才触发保护
    if (!error.response) {
      _networkFailCount++;
      if (_networkFailCount >= _NETWORK_FAIL_THRESHOLD && store.state.network.online) {
        store.commit('network/SET_ONLINE', false);
        // 同步隐藏所有内容
        document.documentElement.classList.add('offline-secure');
        document.title = '';
      }
    } else {
      // 有响应，服务器在线，重置计数
      _networkFailCount = 0;
    }
    if (error.response && error.response.status === 401) {
      // 公开页面（登录/注册/封禁页）不跳转，避免心跳检测把未登录用户踢出注册页
      var publicRoutes = ['Login', 'Register', 'Banned'];
      var currentRouteName = router.currentRoute && router.currentRoute.name;
      if (publicRoutes.indexOf(currentRouteName) === -1) {
        if (!_isLoggingOut) {
          _isLoggingOut = true;
          store.dispatch('auth/logout');
          router.push({ name: 'Login' });
          setTimeout(function() { _isLoggingOut = false; }, 1000);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
