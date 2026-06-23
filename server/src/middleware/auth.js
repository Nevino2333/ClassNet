var jwt = require('jsonwebtoken');
var config = require('../config');
var constants = require('../utils/constants');
var db = require('../utils/db');

function requireAuth(req, res, next) {
  var token = constants.extractToken(req);
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  try {
    var decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    // 检测班管（user_id 以00结尾）
    req.user.is_class_admin = constants.isClassAdmin(req.user.user_id);
    try {
      var dbRow = db.prepare('SELECT status, ban_expires_at, ban_reason, role, officer_permissions, officer_title, is_admin FROM users WHERE user_id = ?').get(req.user.user_id);
      if (dbRow) {
        req.user.role = dbRow.role || 'user';
        req.user.officer_permissions = dbRow.officer_permissions || '[]';
        req.user.officer_title = dbRow.officer_title || '';
        req.user.is_admin = (dbRow.is_admin === 1 || req.user.is_class_admin) ? 1 : 0;
        if (dbRow.status === 'disabled') {
          if (dbRow.ban_expires_at) {
            var expiresAt = new Date(dbRow.ban_expires_at + 'Z');
            if (expiresAt <= new Date()) {
              db.prepare('UPDATE users SET status = \'active\', ban_expires_at = NULL, ban_reason = NULL WHERE user_id = ?').run(req.user.user_id);
            } else {
              return res.status(403).json({ code: 403, message: '该账号已被禁用', ban_expires_at: dbRow.ban_expires_at, ban_reason: dbRow.ban_reason });
            }
          } else {
            return res.status(403).json({ code: 403, message: '该账号已被禁用', ban_reason: dbRow.ban_reason || '' });
          }
        }
      }
    } catch (e) {
      console.error('Auth DB error:', e.message);
    }
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  // 班管始终有全部权限
  if (req.user.is_class_admin || req.user.is_admin === 1) {
    return next();
  }
  // 检查班干角色
  if (req.user.role === 'officer') {
    try {
      req.user.officer_permissions = JSON.parse(req.user.officer_permissions || '[]');
    } catch (e2) {
      req.user.officer_permissions = [];
    }
    return next();
  }
  // 再次从数据库确认
  try {
    var row = db.prepare('SELECT is_admin, role, officer_permissions FROM users WHERE user_id = ?').get(req.user.user_id);
    if (row) {
      if (row.is_admin === 1 || constants.isClassAdmin(req.user.user_id)) {
        req.user.is_admin = 1;
        req.user.is_class_admin = true;
        return next();
      }
      if (row.role === 'officer') {
        req.user.role = 'officer';
        try {
          req.user.officer_permissions = JSON.parse(row.officer_permissions || '[]');
        } catch (e2) {
          req.user.officer_permissions = [];
        }
        return next();
      }
    }
  } catch (e) {
    console.error('Admin check DB error:', e.message);
    return res.status(403).json({ code: 403, message: '无权限访问' });
  }
  return res.status(403).json({ code: 403, message: '无权限访问' });
}

function requirePermission(permission) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }
    // 班管始终有全部权限
    if (req.user.is_class_admin || req.user.is_admin === 1) {
      return next();
    }
    // 班干检查具体权限
    if (req.user.role === 'officer' && Array.isArray(req.user.officer_permissions)) {
      if (req.user.officer_permissions.indexOf(permission) !== -1) {
        return next();
      }
    }
    return res.status(403).json({ code: 403, message: '无权限执行此操作' });
  };
}

module.exports = { requireAuth: requireAuth, requireAdmin: requireAdmin, requirePermission: requirePermission };
