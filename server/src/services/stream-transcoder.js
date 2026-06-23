var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var spawn = require('child_process').spawn;

var CACHE_DIR = path.resolve(__dirname, '../../stream-cache');
var MAX_CONCURRENT = 5;
var IDLE_TIMEOUT = 30 * 60 * 1000; // 30 分钟
var CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 分钟检查一次

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// 任务状态: { hash, filePath, process, startTime, lastAccess, playlistPath, cacheDir, stderr }
var _tasks = Object.create(null);
var _cleanupTimer = null;

function _hashPath(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 12);
}

function _ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function _cleanTask(hash) {
  var task = _tasks[hash];
  if (!task) return;

  // 杀掉 ffmpeg 进程
  if (task.process && task.process.exitCode === null) {
    try { task.process.kill('SIGTERM'); } catch (e) {}
    setTimeout(function() {
      try { task.process.kill('SIGKILL'); } catch (e2) {}
    }, 5000);
  }

  // 删除缓存目录
  if (task.cacheDir && fs.existsSync(task.cacheDir)) {
    try {
      fs.rmSync(task.cacheDir, { recursive: true });
    } catch (e) {}
  }

  delete _tasks[hash];
}

function _cleanupLoop() {
  var now = Date.now();
  var hashes = Object.keys(_tasks);
  for (var i = 0; i < hashes.length; i++) {
    var hash = hashes[i];
    var task = _tasks[hash];
    if (!task) continue;

    var idleTime = now - task.lastAccess;
    var procDead = task.process && task.process.exitCode !== null;

    // 进程已死或空闲超时 → 清理
    if (procDead || idleTime > IDLE_TIMEOUT) {
      _cleanTask(hash);
    }
  }

  // 没有任务了 → 停止定时器
  if (Object.keys(_tasks).length === 0) {
    clearInterval(_cleanupTimer);
    _cleanupTimer = null;
  }
}

function _startCleanup() {
  if (!_cleanupTimer) {
    _cleanupTimer = setInterval(_cleanupLoop, CLEANUP_INTERVAL);
    _cleanupTimer.unref(); // 不阻止进程退出
  }
}

// 按优先级查找 ffmpeg 可执行文件路径
function _findFFmpegPath() {
  var locations = [
    // 用户安装的 ffmpeg
    path.join(process.env.USERPROFILE || process.env.HOME || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
    // 系统 Program Files
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    // PATH 中的 ffmpeg（fallback）
    'ffmpeg.exe',
    'ffmpeg'
  ];

  for (var i = 0; i < locations.length; i++) {
    try {
      var result = require('child_process').execSync('"' + locations[i] + '" -version', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      });
      if (result.indexOf('ffmpeg version') !== -1) {
        return locations[i];
      }
    } catch (e) {
      // 继续尝试下一个
    }
  }
  return null;
}

var _ffmpegPath = null;

function _getFFmpegPath() {
  if (_ffmpegPath === null) {
    _ffmpegPath = _findFFmpegPath();
  }
  return _ffmpegPath;
}

// 检查 ffmpeg 是否可用
function checkFFmpeg() {
  return _getFFmpegPath() !== null;
}

// 启动转码
function start(filePath) {
  var fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    var err = new Error('文件不存在');
    err.statusCode = 404;
    throw err;
  }

  var hash = _hashPath(filePath);

  // 已有缓存 → 续期并返回
  if (_tasks[hash]) {
    _tasks[hash].lastAccess = Date.now();
    return { hash: hash, outputPath: _tasks[hash].outputPath };
  }

  // 检查并发上限
  var activeJobs = Object.keys(_tasks).filter(function(k) {
    return _tasks[k] && _tasks[k].process && _tasks[k].process.exitCode === null;
  });
  if (activeJobs.length >= MAX_CONCURRENT) {
    var busyErr = new Error('转码队列已满，请稍后重试');
    busyErr.statusCode = 503;
    busyErr.retryAfter = 3;
    throw busyErr;
  }

  // 创建缓存目录
  var cacheDir = path.join(CACHE_DIR, hash);
  _ensureDir(cacheDir);

  // HLS 输出：m3u8 播放列表 + ts 分片
  var outputFile = path.join(cacheDir, 'index.m3u8');

  // 启动 ffmpeg — 转码为 HLS 流
  var args = [
    '-i', fullPath,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-f', 'hls',
    '-hls_time', '10',          // 每个 ts 分片 10 秒
    '-hls_list_size', '0',      // 列出全部分片
    '-hls_segment_filename', path.join(cacheDir, 'segment_%05d.ts'),
    '-hls_flags', 'delete_segments+append_list',
    '-y',
    outputFile
  ];

  var ffmpegBin = _getFFmpegPath() || 'ffmpeg';
  var ffproc = spawn(ffmpegBin, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  var stderrChunks = [];
  ffproc.stderr.on('data', function(chunk) {
    stderrChunks.push(chunk.toString());
  });

  var task = {
    hash: hash,
    filePath: filePath,
    process: ffproc,
    startTime: Date.now(),
    lastAccess: Date.now(),
    outputPath: outputFile,
    cacheDir: cacheDir,
    stderr: '',
    _error: null,
    _exitCode: null
  };

  ffproc.on('error', function(err) {
    task._error = err.message;
    _cleanTask(hash);
  });

  ffproc.on('exit', function(code) {
    task._exitCode = code;
    task.stderr = stderrChunks.join('');
    if (code !== 0 && code !== null) {
      task._error = 'ffmpeg exited with code ' + code + ': ' + (task.stderr || '').slice(-500);
    }
    // 延迟清理：给进行中的请求一些时间完成
    setTimeout(function() {
      var t = _tasks[hash];
      if (t && t._exitCode !== null) {
        _cleanTask(hash);
      }
    }, 30000);
  });

  _tasks[hash] = task;
  _startCleanup();

  return { hash: hash, outputPath: outputFile };
}

// 等待 HLS 数据可用（m3u8 播放列表 + 至少一个 ts 分片已写入）
// 返回 true 表示 HLS 流可以开始播放
function waitForReady(hash, minSize, waitMs) {
  var maxWait = waitMs || 30000;
  var task = _tasks[hash];

  if (!task) return false;
  var m3u8Path = task.outputPath;
  if (!m3u8Path) return false;

  // 检查 m3u8 是否存在且有内容
  var hasM3u8 = function() {
    return fs.existsSync(m3u8Path) && fs.statSync(m3u8Path).size >= 64;
  };
  // 检查是否已有至少一个 ts 分片
  var hasSegment = function() {
    if (!task.cacheDir) return false;
    try {
      var files = fs.readdirSync(task.cacheDir);
      for (var i = 0; i < files.length; i++) {
        if (files[i].endsWith('.ts') && fs.statSync(path.join(task.cacheDir, files[i])).size > 0) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  if (hasM3u8() && hasSegment()) return true;
  if (task._error || task._exitCode !== null) return false;

  var startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    if (task._error || (task._exitCode !== null && task._exitCode !== undefined)) {
      return hasM3u8() && hasSegment();
    }
    if (hasM3u8() && hasSegment()) return true;
    var t = Date.now() + 200;
    while (Date.now() < t) { /* wait */ }
  }
  return hasM3u8() && hasSegment();
}

// 续期访问时间
function touch(hash) {
  if (_tasks[hash]) {
    _tasks[hash].lastAccess = Date.now();
  }
}

// 当前活跃的转码进程数
function getActiveCount() {
  return Object.keys(_tasks).filter(function(k) {
    var t = _tasks[k];
    return t && t.process && t.process.exitCode === null;
  }).length;
}

// 启动时清理上次运行残留
(function cleanupStale() {
  try {
    var entries = fs.readdirSync(CACHE_DIR);
    for (var i = 0; i < entries.length; i++) {
      var entryPath = path.join(CACHE_DIR, entries[i]);
      try {
        var stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
          fs.rmSync(entryPath, { recursive: true });
        }
      } catch (e) {
        // 跳过无法删除的
      }
    }
  } catch (e) {
    // 目录为空或不存在
  }
})();

module.exports = {
  CACHE_DIR: CACHE_DIR,
  MAX_CONCURRENT: MAX_CONCURRENT,
  checkFFmpeg: checkFFmpeg,
  start: start,
  touch: touch,
  waitForReady: waitForReady,
  get activeCount() {
    return getActiveCount();
  }
};
