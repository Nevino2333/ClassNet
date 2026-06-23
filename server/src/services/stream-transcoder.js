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

  // 输出分片 MP4（fragmented mp4，支持渐进式流播放 + Range 拖动）
  var outputFile = path.join(cacheDir, 'output.mp4');

  // 启动 ffmpeg — 转码为流式 MP4
  var args = [
    '-i', fullPath,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-movflags', 'frag_keyframe+empty_moov+faststart+default_base_moof',
    '-f', 'mp4', '-y',
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

// 等待 MP4 文件有足够数据可播放（frag_keyframe+empty_moov 使得文件边写边可读）
// 异步轮询，不阻塞 Node.js 事件循环
function waitForReady(hash, minSize, waitMs) {
  return new Promise(function(resolve) {
    var maxWait = waitMs || 30000;
    var task = _tasks[hash];
    var startTime = Date.now();

    if (!task) return resolve(false);
    var filePath = task.outputPath;
    if (!filePath) return resolve(false);

    function checkReady() {
      if (!fs.existsSync(filePath)) return false;
      return fs.statSync(filePath).size >= (minSize || 262144);
    }

    function poll() {
      var elapsed = Date.now() - startTime;

      // 任务失败 → 返回当前状态
      if (task._error || task._exitCode !== null) {
        return resolve(checkReady());
      }

      // 文件就绪 → 返回 true
      if (checkReady()) return resolve(true);

      // 超时 → 返回当前状态
      if (elapsed >= maxWait) return resolve(checkReady());

      // 继续轮询
      setTimeout(poll, 300);
    }

    // 首次立即检查
    if (checkReady()) return resolve(true);
    if (task._error || task._exitCode !== null) return resolve(checkReady());

    setTimeout(poll, 300);
  });
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
