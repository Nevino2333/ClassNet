var express = require('express');
var router = express.Router();
var db = require('../utils/db');
var pwdUtil = require('../utils/password');
var auth = require('../middleware/auth');
var time = require('../utils/time');

// All routes require authentication
router.use(auth.requireAuth);

// Helper: build user_info object (never include password_hash)
function buildUserInfo(row) {
  return {
    user_id: row.user_id,
    net_name: row.net_name,
    real_name: row.real_name,
    gender: row.gender,
    status: row.status,
    is_admin: row.is_admin,
    info: JSON.parse(row.info_json || '{}'),
    created_at: time.toISOString(row.created_at),
    last_login: time.toISOString(row.last_login)
  };
}

// GET /api/user/profile
router.get('/profile', function(req, res) {
  try {
    var user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在', data: null });
    }
    var user_info = buildUserInfo(user);
    return res.json({ code: 200, message: 'ok', data: user_info });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// PATCH /api/user/profile
router.patch('/profile', function(req, res) {
  try {
    var net_name = req.body.net_name;
    var info = req.body.info;

    // If net_name is being updated, check it's not taken by another user
    if (net_name) {
      var existingUser = db.prepare('SELECT user_id FROM users WHERE net_name = ? AND user_id != ?').get(net_name, req.user.user_id);
      if (existingUser) {
        return res.status(409).json({ code: 409, message: '该网名已被使用', data: null });
      }
    }

    // Build update fields
    var updates = [];
    var params = [];

    if (net_name) {
      updates.push('net_name = ?');
      params.push(net_name);
    }

    if (info) {
      // Validate info is an object with allowed fields
      var allowedFields = ['birthday', 'wechat', 'qq', 'email', 'phone', 'address', 'signature'];
      var currentInfo = {};
      var currentUser = db.prepare('SELECT info_json FROM users WHERE user_id = ?').get(req.user.user_id);
      if (currentUser && currentUser.info_json) {
        currentInfo = JSON.parse(currentUser.info_json);
      }

      for (var i = 0; i < allowedFields.length; i++) {
        var field = allowedFields[i];
        if (info.hasOwnProperty(field)) {
          currentInfo[field] = info[field];
        }
      }

      updates.push('info_json = ?');
      params.push(JSON.stringify(currentInfo));
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要更新的字段', data: null });
    }

    params.push(req.user.user_id);
    var profileStmt = db.prepare('UPDATE users SET ' + updates.join(', ') + ' WHERE user_id = ?');
    profileStmt.run.apply(profileStmt, params);

    db.prepare('UPDATE users SET updated_at = datetime(\'now\') WHERE user_id = ?').run(req.user.user_id);

    try {
      var relayBus = require('../utils/relay-bus');
      var updatedRow = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);
      if (updatedRow) {
        relayBus.emit('user_profile_updated', {
          user_id: req.user.user_id,
          net_name: updatedRow.net_name,
          info_json: updatedRow.info_json,
          wechat: updatedRow.wechat,
          qq: updatedRow.qq,
          phone: updatedRow.phone,
          address: updatedRow.address,
          signature: updatedRow.signature,
          privacy_settings: updatedRow.privacy_settings
        });
      }
    } catch (e) { console.error('[User] Relay event failed:', e.message); }

    // Return updated user info
    var updatedUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);
    var user_info = buildUserInfo(updatedUser);
    return res.json({ code: 200, message: '资料更新成功', data: user_info });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// POST /api/user/change-password
router.post('/change-password', function(req, res) {
  try {
    var current_password = req.body.current_password;
    var new_password = req.body.new_password;
    var confirm_password = req.body.confirm_password;

    // Validate all fields
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ code: 400, message: '请填写所有密码字段', data: null });
    }

    // 1. Verify current password
    var user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在', data: null });
    }

    if (!pwdUtil.verifyPassword(current_password, user.password_hash)) {
      return res.status(401).json({ code: 401, message: '当前密码错误', data: null });
    }

    // 2. Check new password strength
    var strengthResult = pwdUtil.checkPasswordStrength(new_password);
    if (!strengthResult.valid) {
      return res.status(400).json({ code: 400, message: strengthResult.message, data: null });
    }

    // 3. Check new passwords match
    if (new_password !== confirm_password) {
      return res.status(400).json({ code: 400, message: '两次输入的新密码不一致', data: null });
    }

    // 4. Update password hash
    var new_hash = pwdUtil.hashPassword(new_password);
    db.prepare('UPDATE users SET password_hash = ? WHERE user_id = ?').run(new_hash, req.user.user_id);

    db.prepare('UPDATE users SET updated_at = datetime(\'now\') WHERE user_id = ?').run(req.user.user_id);

    try {
      var relayBus = require('../utils/relay-bus');
      relayBus.emit('password_changed', {
        user_id: req.user.user_id,
        password_hash: new_hash
      });
    } catch (e) { console.error('[User] Relay event failed:', e.message); }

    return res.json({ code: 200, message: '密码修改成功', data: null });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// GET /api/user/settings
router.get('/settings', function(req, res) {
  try {
    var settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.user_id);

    // Create default settings if not exists
    if (!settings) {
      db.prepare(
        'INSERT INTO user_settings (user_id, theme, wallpaper, notifications_json) VALUES (?, ?, ?, ?)'
      ).run(req.user.user_id, 'light', 'default', '{"superIsland":true,"chat":true,"sound":false}');

      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.user_id);
    }

    var result = {
      user_id: settings.user_id,
      theme: settings.theme,
      wallpaper: settings.wallpaper,
      notifications: JSON.parse(settings.notifications_json || '{}'),
      updated_at: time.toISOString(settings.updated_at)
    };

    return res.json({ code: 200, message: 'ok', data: result });
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// POST /api/user/settings
router.post('/settings', function(req, res) {
  try {
    var theme = req.body.theme;
    var wallpaper = req.body.wallpaper;
    var notifications = req.body.notifications;

    // Build updates
    var updates = [];
    var params = [];

    if (theme) {
      updates.push('theme = ?');
      params.push(theme);
    }

    if (wallpaper) {
      updates.push('wallpaper = ?');
      params.push(wallpaper);
    }

    if (notifications) {
      updates.push('notifications_json = ?');
      params.push(JSON.stringify(notifications));
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要更新的设置', data: null });
    }

    updates.push("updated_at = datetime('now')");

    // Upsert into user_settings
    var existing = db.prepare('SELECT user_id FROM user_settings WHERE user_id = ?').get(req.user.user_id);

    if (existing) {
      params.push(req.user.user_id);
      var updateStmt = db.prepare('UPDATE user_settings SET ' + updates.join(', ') + ' WHERE user_id = ?');
      updateStmt.run.apply(updateStmt, params);
    } else {
      db.prepare(
        'INSERT INTO user_settings (user_id, theme, wallpaper, notifications_json) VALUES (?, ?, ?, ?)'
      ).run(req.user.user_id, 'light', 'default', '{"superIsland":true,"chat":true,"sound":false}');

      params.push(req.user.user_id);
      var updateStmt2 = db.prepare('UPDATE user_settings SET ' + updates.join(', ') + ' WHERE user_id = ?');
      updateStmt2.run.apply(updateStmt2, params);
    }

    db.prepare('UPDATE users SET updated_at = datetime(\'now\') WHERE user_id = ?').run(req.user.user_id);

    // Return updated settings
    var settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.user_id);
    var result = {
      user_id: settings.user_id,
      theme: settings.theme,
      wallpaper: settings.wallpaper,
      notifications: JSON.parse(settings.notifications_json || '{}'),
      updated_at: time.toISOString(settings.updated_at)
    };

    try {
      var relayBus = require('../utils/relay-bus');
      relayBus.emit('user_settings_updated', {
        user_id: req.user.user_id,
        theme: settings.theme,
        wallpaper: settings.wallpaper,
        notifications_json: settings.notifications_json
      });
    } catch (e) { console.error('[User] Relay event failed:', e.message); }

    return res.json({ code: 200, message: '设置更新成功', data: result });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// GET /api/user/remote-profile/:userId
router.get('/remote-profile/:userId', function(req, res) {
  try {
    var targetUserId = req.params.userId;
    try {
      var chatServer = require('../ws/chat-server');
      var remoteUsers = chatServer.getRemoteOnlineUsers();
      if (remoteUsers[targetUserId]) {
        var ru = remoteUsers[targetUserId];
        return res.json({
          code: 200,
          message: 'ok',
          data: {
            user_id: ru.user_id,
            net_name: ru.net_name || ru.user_id,
            real_name: ru.real_name || '',
            gender: ru.gender || '',
            remote: true,
            server_id: ru.server_id || ''
          }
        });
      }
    } catch (e) { console.error('[User] Relay event failed:', e.message); }
    return res.status(404).json({ code: 404, message: '远程用户不在线', data: null });
  } catch (err) {
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

module.exports = router;
