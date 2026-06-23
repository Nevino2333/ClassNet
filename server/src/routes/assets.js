var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var config = require('../config');
var db = require('../utils/db');
var time = require('../utils/time');

var WALLPAPER_DIR = path.join(config.resourcesDir, 'public', 'wallpaper');
var WEATHER_ICONS_DIR = path.join(config.resourcesDir, 'public', 'weather-icons');

function setNoCache(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

router.get('/wallpapers', function(req, res) {
  if (!fs.existsSync(WALLPAPER_DIR)) {
    fs.mkdirSync(WALLPAPER_DIR, { recursive: true });
  }

  fs.readdir(WALLPAPER_DIR, function(err, files) {
    if (err) {
      return res.json({ code: 200, data: { wallpapers: [], videos: [] } });
    }

    var wallpapers = [];
    var videos = [];
    var imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
    var videoExts = ['.mp4', '.webm', '.mov'];

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var ext = path.extname(file).toLowerCase();
      var name = path.basename(file, ext);
      var url = '/resources/public/wallpaper/' + encodeURIComponent(file);

      if (imageExts.indexOf(ext) !== -1) {
        wallpapers.push({
          name: name,
          filename: file,
          url: url,
          type: 'image'
        });
      } else if (videoExts.indexOf(ext) !== -1) {
        videos.push({
          name: name,
          filename: file,
          url: url,
          type: 'video',
          poster: '/resources/public/wallpaper/Default.png'
        });
      }
    }

    setNoCache(res);
    res.json({ code: 200, data: { wallpapers: wallpapers, videos: videos } });
  });
});

router.get('/weather-icons', function(req, res) {
  if (!fs.existsSync(WEATHER_ICONS_DIR)) {
    return res.json({ code: 200, data: { icons: [] } });
  }

  fs.readdir(WEATHER_ICONS_DIR, function(err, files) {
    if (err) {
      return res.json({ code: 200, data: { icons: [] } });
    }

    var icons = [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var ext = path.extname(file).toLowerCase();
      if (['.png', '.svg', '.jpg'].indexOf(ext) !== -1) {
        var name = path.basename(file, ext).toLowerCase();
        icons.push({
          name: name,
          url: '/resources/public/weather-icons/' + file
        });
      }
    }

    setNoCache(res);
    res.json({ code: 200, data: { icons: icons } });
  });
});

router.get('/broadcasts', function(req, res) {
  try {
    var broadcasts = db.prepare('SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 20').all();
    for (var i = 0; i < broadcasts.length; i++) {
      if (broadcasts[i].created_at) broadcasts[i].created_at = time.toISOString(broadcasts[i].created_at);
    }
    setNoCache(res);
    res.json({ code: 200, data: broadcasts });
  } catch (e) {
    res.json({ code: 200, data: [] });
  }
});

router.get('/announcements', function(req, res) {
  try {
    var announcements = db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC LIMIT 50').all();
    for (var i = 0; i < announcements.length; i++) {
      if (announcements[i].created_at) announcements[i].created_at = time.toISOString(announcements[i].created_at);
    }
    setNoCache(res);
    res.json({ code: 200, data: announcements });
  } catch (e) {
    res.json({ code: 200, data: [] });
  }
});

module.exports = router;
