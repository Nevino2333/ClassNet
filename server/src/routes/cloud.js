var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var multer = require('multer');
var auth = require('../middleware/auth');

// 云盘根目录
var cloudDir = path.resolve(process.env.RESOURCES_DIR || path.join(__dirname, '../../../Resources'), 'cloud');

// 确保云盘目录存在
function ensureUserDir(userId) {
  var userDir = path.join(cloudDir, String(userId));
  var photoDir = path.join(userDir, 'photos');
  var noteDir = path.join(userDir, 'note');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    fs.mkdirSync(photoDir, { recursive: true });
    fs.mkdirSync(noteDir, { recursive: true });
  } else {
    if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
    if (!fs.existsSync(noteDir)) fs.mkdirSync(noteDir, { recursive: true });
  }
  return userDir;
}

// 获取用户云盘目录
function getUserDir(userId) {
  return path.join(cloudDir, String(userId));
}

// 文件上传配置
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    var userDir = getUserDir(req.user.user_id);
    var photoDir = path.join(userDir, 'photos');
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true });
    }
    cb(null, photoDir);
  },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg';
    var filename = Date.now() + '_' + Math.random().toString(36).substring(2, 8) + ext;
    cb(null, filename);
  }
});
var upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: function(req, file, cb) {
    var allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    var ext = path.extname(file.originalname).toLowerCase();
    if (allowed.indexOf(ext) === -1) {
      return cb(new Error('不支持的文件类型'));
    }
    cb(null, true);
  }
});

// 列出用户云盘文件（不包含 note 目录）
router.get('/files', auth.requireAuth, function(req, res) {
  var userId = req.user.user_id;
  var userDir = getUserDir(userId);
  ensureUserDir(userId);

  var photoDir = path.join(userDir, 'photos');
  var files = [];

  try {
    var entries = fs.readdirSync(photoDir);
    for (var i = 0; i < entries.length; i++) {
      var filePath = path.join(photoDir, entries[i]);
      var stat = fs.statSync(filePath);
      if (stat.isFile()) {
        files.push({
          name: entries[i],
          size: stat.size,
          created_at: stat.mtime.toISOString(),
          url: '/api/cloud/files/' + encodeURIComponent(entries[i])
        });
      }
    }
    files.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  } catch (e) {}

  res.json({ code: 200, data: { files: files } });
});

// 上传文件
router.post('/upload', auth.requireAuth, upload.single('file'), function(req, res) {
  if (!req.file) {
    return res.status(400).json({ code: 400, message: '未收到文件' });
  }
  res.json({
    code: 200,
    data: {
      name: req.file.filename,
      size: req.file.size,
      url: '/api/cloud/files/' + encodeURIComponent(req.file.filename)
    }
  });
});

// 批量上传
router.post('/upload-batch', auth.requireAuth, upload.array('files', 10), function(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ code: 400, message: '未收到文件' });
  }
  var results = req.files.map(function(f) {
    return {
      name: f.filename,
      size: f.size,
      url: '/api/cloud/files/' + encodeURIComponent(f.filename)
    };
  });
  res.json({ code: 200, data: { files: results } });
});

// 获取文件（需登录但不限制用户，方便在聊天/论坛中展示）
router.get('/files/:filename', auth.requireAuth, function(req, res) {
  var userId = req.user.user_id;
  var filename = decodeURIComponent(req.params.filename);
  var filePath = path.join(getUserDir(userId), 'photos', filename);

  // 安全检查：防止路径遍历
  if (filename.indexOf('..') !== -1 || filename.indexOf('/') !== -1 || filename.indexOf('\\') !== -1) {
    return res.status(400).json({ code: 400, message: '无效的文件名' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ code: 404, message: '文件不存在' });
  }

  res.sendFile(filePath);
});

// 删除文件
router.delete('/files/:filename', auth.requireAuth, function(req, res) {
  var userId = req.user.user_id;
  var filename = decodeURIComponent(req.params.filename);

  if (filename.indexOf('..') !== -1 || filename.indexOf('/') !== -1 || filename.indexOf('\\') !== -1) {
    return res.status(400).json({ code: 400, message: '无效的文件名' });
  }

  var filePath = path.join(getUserDir(userId), 'photos', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ code: 404, message: '文件不存在' });
  }

  fs.unlinkSync(filePath);
  res.json({ code: 200, message: '删除成功' });
});

// 保存笔记到 note 目录
router.post('/note/:noteId', auth.requireAuth, function(req, res) {
  var userId = req.user.user_id;
  var noteId = req.params.noteId;
  var content = req.body.content || '';

  // 安全检查
  if (noteId.indexOf('..') !== -1 || noteId.indexOf('/') !== -1 || noteId.indexOf('\\') !== -1) {
    return res.status(400).json({ code: 400, message: '无效的笔记ID' });
  }

  ensureUserDir(userId);
  var notePath = path.join(getUserDir(userId), 'note', noteId + '.json');

  var noteData = {
    id: noteId,
    content: content,
    title: req.body.title || '',
    tags: req.body.tags || [],
    folder: req.body.folder || '默认',
    updated_at: new Date().toISOString()
  };

  fs.writeFileSync(notePath, JSON.stringify(noteData, null, 2), 'utf8');
  res.json({ code: 200, data: noteData });
});

// 读取笔记
router.get('/note/:noteId', auth.requireAuth, function(req, res) {
  var userId = req.user.user_id;
  var noteId = req.params.noteId;

  if (noteId.indexOf('..') !== -1 || noteId.indexOf('/') !== -1 || noteId.indexOf('\\') !== -1) {
    return res.status(400).json({ code: 400, message: '无效的笔记ID' });
  }

  var notePath = path.join(getUserDir(userId), 'note', noteId + '.json');

  if (!fs.existsSync(notePath)) {
    return res.status(404).json({ code: 404, message: '笔记不存在' });
  }

  var data = fs.readFileSync(notePath, 'utf8');
  res.json({ code: 200, data: JSON.parse(data) });
});

// 列出所有笔记
router.get('/notes', auth.requireAuth, function(req, res) {
  var userId = req.user.user_id;
  var noteDir = path.join(getUserDir(userId), 'note');

  if (!fs.existsSync(noteDir)) {
    return res.json({ code: 200, data: { notes: [] } });
  }

  var notes = [];
  var entries = fs.readdirSync(noteDir);
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].endsWith('.json')) {
      try {
        var data = JSON.parse(fs.readFileSync(path.join(noteDir, entries[i]), 'utf8'));
        notes.push({
          id: data.id,
          title: data.title || '未命名',
          folder: data.folder || '默认',
          updated_at: data.updated_at,
          tags: data.tags || []
        });
      } catch (e) {}
    }
  }
  notes.sort(function(a, b) { return new Date(b.updated_at) - new Date(a.updated_at); });
  res.json({ code: 200, data: { notes: notes } });
});

// 删除笔记
router.delete('/note/:noteId', auth.requireAuth, function(req, res) {
  var userId = req.user.user_id;
  var noteId = req.params.noteId;

  if (noteId.indexOf('..') !== -1 || noteId.indexOf('/') !== -1 || noteId.indexOf('\\') !== -1) {
    return res.status(400).json({ code: 400, message: '无效的笔记ID' });
  }

  var notePath = path.join(getUserDir(userId), 'note', noteId + '.json');

  if (fs.existsSync(notePath)) {
    fs.unlinkSync(notePath);
  }

  res.json({ code: 200, message: '删除成功' });
});

module.exports = router;
