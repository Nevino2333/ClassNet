var express = require('express');
var router = express.Router();
var auth = require('../middleware/auth');
var db = require('../utils/db');
var exp = require('../utils/exp');
var time = require('../utils/time');

router.use(auth.requireAuth);

router.get('/info', function(req, res) {
  try {
    var userId = req.user.user_id;
    var info = exp.getUserExpInfo(userId);
    res.json({ code: 200, message: 'ok', data: info });
  } catch (e) {
    console.error('Get level info error:', e.message);
    res.status(500).json({ code: 500, message: '获取等级信息失败' });
  }
});

router.get('/log', function(req, res) {
  try {
    var userId = req.user.user_id;
    var limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    var logs = exp.getExpLog(userId, limit);
    var actionLabels = {
      daily_login: '每日签到',
      send_message: '发送消息',
      create_post: '发布帖子',
      receive_like: '获得点赞',
      add_comment: '发表评论',
      share_post: '转发内容'
    };
    for (var i = 0; i < logs.length; i++) {
      logs[i].created_at = time.toISOString(logs[i].created_at);
      logs[i].reason = actionLabels[logs[i].action] || '获得经验';
    }
    res.json({ code: 200, message: 'ok', data: logs });
  } catch (e) {
    console.error('Get exp log error:', e.message);
    res.status(500).json({ code: 500, message: '获取经验记录失败' });
  }
});

router.post('/daily-login', function(req, res) {
  try {
    var userId = req.user.user_id;
    var result = exp.addDailyLoginExp(userId);
    if (!result || result === 0) {
      return res.json({ code: 200, message: 'already_claimed', data: null });
    }
    res.json({ code: 200, message: 'ok', data: result });
  } catch (e) {
    console.error('Daily login error:', e.message);
    res.status(500).json({ code: 500, message: '签到失败' });
  }
});

router.post('/settings/community', function(req, res) {
  try {
    var userId = req.user.user_id;
    var show = req.body.show !== false && req.body.show !== 0;
    exp.setShowLevelCommunity(userId, show);
    res.json({ code: 200, message: 'ok' });
  } catch (e) {
    console.error('Set community level visibility error:', e.message);
    res.status(500).json({ code: 500, message: '设置失败' });
  }
});

router.post('/settings/chat', function(req, res) {
  try {
    var userId = req.user.user_id;
    var show = req.body.show !== false && req.body.show !== 0;
    exp.setShowLevelChat(userId, show);
    res.json({ code: 200, message: 'ok' });
  } catch (e) {
    console.error('Set chat level visibility error:', e.message);
    res.status(500).json({ code: 500, message: '设置失败' });
  }
});

router.get('/batch-levels', function(req, res) {
  try {
    var userIds = (req.query.user_ids || '').split(',').filter(function(id) { return id.trim(); });
    if (userIds.length === 0) {
      return res.json({ code: 200, message: 'ok', data: {} });
    }
    if (userIds.length > 100) {
      userIds = userIds.slice(0, 100);
    }
    var levels = exp.getBatchUserLevels(userIds);
    var placeholders = userIds.map(function() { return '?'; }).join(',');
    var roleRows = db.prepare('SELECT user_id, role, officer_title FROM users WHERE user_id IN (' + placeholders + ')').all.apply(db.prepare('SELECT user_id, role, officer_title FROM users WHERE user_id IN (' + placeholders + ')'), userIds);
    var roleMap = {};
    for (var r = 0; r < roleRows.length; r++) {
      roleMap[roleRows[r].user_id] = { role: roleRows[r].role, officer_title: roleRows[r].officer_title || '' };
    }
    for (var i = 0; i < userIds.length; i++) {
      var uid = userIds[i];
      if (!levels[uid]) levels[uid] = {};
      if (roleMap[uid]) {
        levels[uid].role = roleMap[uid].role;
        levels[uid].officer_title = roleMap[uid].officer_title;
      }
    }
    res.json({ code: 200, message: 'ok', data: levels });
  } catch (e) {
    console.error('Get batch levels error:', e.message);
    res.status(500).json({ code: 500, message: '获取等级数据失败' });
  }
});

router.post('/admin/reset-all', auth.requireAdmin, function(req, res) {
  try {
    exp.resetAllLevels();
    res.json({ code: 200, message: '所有用户等级已重置' });
  } catch (e) {
    console.error('Reset all levels error:', e.message);
    res.status(500).json({ code: 500, message: '重置等级失败' });
  }
});

module.exports = router;
