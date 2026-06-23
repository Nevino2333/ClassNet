var express = require('express');
var router = express.Router();
var weatherService = require('../services/weather');
var cache = require('../utils/cache');
var auth = require('../middleware/auth');

router.use(auth.requireAuth);

var CACHE_CURRENT = 15 * 60 * 1000;
var CACHE_HOURLY = 30 * 60 * 1000;
var CACHE_DAILY = 60 * 60 * 1000;
var CACHE_AIR = 30 * 60 * 1000;
var CACHE_INDICES = 6 * 60 * 60 * 1000;
var CACHE_WARNING = 10 * 60 * 1000;
var CACHE_MINUTELY = 5 * 60 * 1000;

router.get('/current', function(req, res) {
  var cacheKey = 'weather_current_default';
  var cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ code: 200, message: 'ok', data: cached });
  }
  weatherService.getCurrentWeather().then(function(data) {
    if (data.code === '200') {
      cache.set(cacheKey, data, CACHE_CURRENT);
      res.json({ code: 200, message: 'ok', data: data });
    } else {
      console.error('[Weather] Current API code:', data.code, data.message || '');
      res.status(502).json({ code: 502, message: '天气服务暂时不可用', data: null });
    }
  }).catch(function(err) {
    console.error('[Weather] Current error:', err.message);
    res.status(502).json({ code: 502, message: '获取天气数据失败', data: null });
  });
});

router.get('/hourly', function(req, res) {
  var cacheKey = 'weather_hourly_default';
  var cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ code: 200, message: 'ok', data: cached });
  }
  weatherService.getHourlyForecast().then(function(data) {
    if (data.code === '200') {
      cache.set(cacheKey, data, CACHE_HOURLY);
      res.json({ code: 200, message: 'ok', data: data });
    } else {
      console.error('[Weather] Hourly API code:', data.code, data.message || '');
      res.status(502).json({ code: 502, message: '天气服务暂时不可用', data: null });
    }
  }).catch(function(err) {
    console.error('[Weather] Hourly error:', err.message);
    res.status(502).json({ code: 502, message: '获取天气数据失败', data: null });
  });
});

router.get('/daily', function(req, res) {
  var cacheKey = 'weather_daily_default';
  var cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ code: 200, message: 'ok', data: cached });
  }
  weatherService.getDailyForecast().then(function(data) {
    if (data.code === '200') {
      cache.set(cacheKey, data, CACHE_DAILY);
      res.json({ code: 200, message: 'ok', data: data });
    } else {
      console.error('[Weather] Daily API code:', data.code, data.message || '');
      res.status(502).json({ code: 502, message: '天气服务暂时不可用', data: null });
    }
  }).catch(function(err) {
    console.error('[Weather] Daily error:', err.message);
    res.status(502).json({ code: 502, message: '获取天气数据失败', data: null });
  });
});

router.get('/air', function(req, res) {
  var cacheKey = 'weather_air_default';
  var cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ code: 200, message: 'ok', data: cached });
  }
  weatherService.getAirQuality().then(function(data) {
    if (data && data.indexes && data.indexes.length > 0) {
      cache.set(cacheKey, data, CACHE_AIR);
      console.log('[Weather] Air OK, indexes:', data.indexes.length, 'pollutants:', (data.pollutants || []).length);
      res.json({ code: 200, message: 'ok', data: data });
    } else if (data && data.code) {
      console.error('[Weather] Air API error code:', data.code, data.message || '');
      res.json({ code: 200, message: 'partial', data: { indexes: [], pollutants: [] } });
    } else if (data && data.pollutants && data.pollutants.length > 0) {
      cache.set(cacheKey, data, CACHE_AIR);
      console.log('[Weather] Air OK (no indexes), pollutants:', data.pollutants.length);
      res.json({ code: 200, message: 'ok', data: data });
    } else {
      console.error('[Weather] Air unexpected response:', JSON.stringify(data).substring(0, 300));
      res.json({ code: 200, message: 'partial', data: { indexes: [], pollutants: [] } });
    }
  }).catch(function(err) {
    console.error('[Weather] Air error:', err.message);
    res.json({ code: 200, message: 'partial', data: { indexes: [], pollutants: [] } });
  });
});

router.get('/indices', function(req, res) {
  var cacheKey = 'weather_indices_default';
  var cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ code: 200, message: 'ok', data: cached });
  }
  weatherService.getIndices().then(function(data) {
    if (data.code === '200') {
      cache.set(cacheKey, data, CACHE_INDICES);
      res.json({ code: 200, message: 'ok', data: data });
    } else {
      console.error('[Weather] Indices API code:', data.code, data.message || '');
      res.status(502).json({ code: 502, message: '天气服务暂时不可用', data: null });
    }
  }).catch(function(err) {
    console.error('[Weather] Indices error:', err.message);
    res.status(502).json({ code: 502, message: '获取天气数据失败', data: null });
  });
});

router.get('/warning', function(req, res) {
  var cacheKey = 'weather_warning_default';
  var cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ code: 200, message: 'ok', data: cached });
  }
  weatherService.getWeatherAlert().then(function(data) {
    if (data && data.code && data.code !== '200' && data.code !== 'success') {
      console.error('[Weather] Warning API code:', data.code, data.message || '');
      res.json({ code: 200, message: 'partial', data: { alerts: [] } });
      return;
    }
    if (data && data.alerts) {
      cache.set(cacheKey, data, CACHE_WARNING);
      console.log('[Weather] Warning OK, alerts:', data.alerts.length);
      res.json({ code: 200, message: 'ok', data: data });
    } else if (data && data.metadata && data.metadata.zeroResult) {
      cache.set(cacheKey, { alerts: [], metadata: data.metadata }, CACHE_WARNING);
      res.json({ code: 200, message: 'ok', data: { alerts: [], metadata: data.metadata } });
    } else {
      console.error('[Weather] Warning unexpected:', JSON.stringify(data).substring(0, 200));
      res.json({ code: 200, message: 'partial', data: { alerts: [] } });
    }
  }).catch(function(err) {
    console.error('[Weather] Warning error:', err.message);
    res.json({ code: 200, message: 'partial', data: { alerts: [] } });
  });
});

router.get('/minutely', function(req, res) {
  var cacheKey = 'weather_minutely_default';
  var cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ code: 200, message: 'ok', data: cached });
  }
  weatherService.getMinutelyPrecipitation().then(function(data) {
    if (data.code === '200') {
      cache.set(cacheKey, data, CACHE_MINUTELY);
      res.json({ code: 200, message: 'ok', data: data });
    } else {
      console.error('[Weather] Minutely API code:', data.code, data.message || '');
      res.json({ code: 200, message: 'partial', data: { summary: '', minutely: [] } });
    }
  }).catch(function(err) {
    console.error('[Weather] Minutely error:', err.message);
    res.json({ code: 200, message: 'partial', data: { summary: '', minutely: [] } });
  });
});

router.post('/clear-cache', function(req, res) {
  cache.clear();
  res.json({ code: 200, message: '缓存已清除' });
});

// 天气提醒检查辅助函数
function checkWeatherAlert() {
  var currentPromise = weatherService.getCurrentWeather();
  var warningPromise = weatherService.getWeatherAlert();

  return Promise.all([currentPromise, warningPromise]).then(function(results) {
    var currentData = results[0];
    var warningData = results[1];

    var hasRain = false;
    var rainText = '';
    var current = null;

    if (currentData && currentData.code === '200' && currentData.now) {
      current = currentData.now;
      var iconCode = parseInt(current.icon) || 0;
      // 300-399: 降水类, 200-299: 积雪/雾凇类
      if ((iconCode >= 300 && iconCode <= 399) || (iconCode >= 200 && iconCode <= 299)) {
        hasRain = true;
        rainText = current.text || '降水';
      }
    }

    var hasWarning = false;
    var warnings = [];

    if (warningData && warningData.alerts && warningData.alerts.length > 0) {
      hasWarning = true;
      warnings = warningData.alerts;
    }

    return {
      has_rain: hasRain,
      rain_text: rainText,
      has_warning: hasWarning,
      warnings: warnings,
      current: current
    };
  }).catch(function(err) {
    console.error('[Weather] checkWeatherAlert error:', err.message);
    return {
      has_rain: false,
      rain_text: '',
      has_warning: false,
      warnings: [],
      current: null,
      error: err.message
    };
  });
}

module.exports = router;
module.exports.checkWeatherAlert = checkWeatherAlert;
