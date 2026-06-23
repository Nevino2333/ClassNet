var db = require('./db');

// 等级阈值：99天满经验(100/天)到满级Lv6
var LEVEL_THRESHOLDS = [0, 50, 200, 600, 1500, 3500, 9900];
var MAX_LEVEL = 6;

var EXP_REWARDS = {
  daily_login: 20,
  login_streak_bonus: 0,
  send_message: 1,
  create_post: 5,
  receive_like: 2,
  add_comment: 3,
  share_post: 3
};

var DAILY_LIMITS = {
  login_streak_bonus: 1,
  send_message: 20,
  create_post: 3,
  receive_like: 10,
  add_comment: 5,
  share_post: 3
};

var DAILY_EXP_CAP = 100;

// 连续签到奖励：连续天数 -> 额外经验
var LOGIN_STREAK_BONUS = {
  3: 5,
  7: 10,
  14: 15,
  30: 20,
  60: 25,
  99: 30
};

function getStreakBonus(streakDays) {
  var bonus = 0;
  var keys = Object.keys(LOGIN_STREAK_BONUS).map(Number).sort(function(a, b) { return a - b; });
  for (var i = 0; i < keys.length; i++) {
    if (streakDays >= keys[i]) {
      bonus = LOGIN_STREAK_BONUS[keys[i]];
    }
  }
  return bonus;
}

function calculateStreak(lastLoginDate) {
  if (!lastLoginDate) return 0;
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var last = new Date(lastLoginDate + 'T00:00:00');
  var diff = Math.floor((today - last) / 86400000);
  if (diff === 0 || diff === 1) {
    return diff; // 今天或昨天签到的，连续天数由数据库记录
  }
  return 0; // 超过1天未签到，连续中断
}

function getLevel(exp) {
  for (var i = MAX_LEVEL; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

function getExpForNextLevel(level) {
  if (level >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS[level + 1];
}

function getExpProgress(exp) {
  var level = getLevel(exp);
  if (level >= MAX_LEVEL) return { current: 0, needed: 0, percentage: 100 };
  var currentLevelExp = LEVEL_THRESHOLDS[level];
  var nextLevelExp = LEVEL_THRESHOLDS[level + 1];
  var current = exp - currentLevelExp;
  var needed = nextLevelExp - currentLevelExp;
  return {
    current: current,
    needed: needed,
    percentage: Math.min(100, Math.floor(current / needed * 100))
  };
}

function ensureUserExp(userId) {
  var row = db.prepare('SELECT * FROM user_experience WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO user_experience (user_id, exp, level) VALUES (?, 0, 0)').run(userId);
    row = db.prepare('SELECT * FROM user_experience WHERE user_id = ?').get(userId);
  }
  return row;
}

function addExp(userId, action) {
  var reward = EXP_REWARDS[action];
  if (!reward || reward <= 0) return null;

  var now = new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var limit = DAILY_LIMITS[action];
  if (limit) {
    var todayCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM exp_log WHERE user_id = ? AND action = ? AND date(created_at, \'+8 hours\') = ?'
    ).get(userId, action, today);
    if (todayCount.cnt >= limit) return null;
  }

  var todayExpRow = db.prepare(
    'SELECT COALESCE(SUM(exp_gained), 0) as total FROM exp_log WHERE user_id = ? AND date(created_at, \'+8 hours\') = ?'
  ).get(userId, today);
  if (todayExpRow && todayExpRow.total + reward > DAILY_EXP_CAP) return null;

  db.prepare('INSERT INTO exp_log (user_id, action, exp_gained) VALUES (?, ?, ?)').run(userId, action, reward);

  var userExp = ensureUserExp(userId);
  var newExp = userExp.exp + reward;
  var newLevel = getLevel(newExp);
  db.prepare('UPDATE user_experience SET exp = ?, level = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(newExp, newLevel, userId);

  var leveledUp = newLevel > userExp.level;

  try {
    var relayBus = require('./relay-bus');
    relayBus.emit('exp_updated', {
      user_id: userId,
      exp: newExp,
      level: newLevel,
      show_level_community: userExp.show_level_community,
      show_level_chat: userExp.show_level_chat
    });
  } catch (e) {}

  return {
    exp_gained: reward,
    total_exp: newExp,
    level: newLevel,
    leveled_up: leveledUp,
    previous_level: userExp.level
  };
}

function addDailyLoginExp(userId) {
  var now = new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var userExp = ensureUserExp(userId);
  if (userExp.last_login_date === today && userExp.last_login_exp_given === 1) {
    return null;
  }

  // 计算连续签到天数
  var streak = userExp.login_streak || 0;
  var lastDate = userExp.last_login_date;
  if (lastDate) {
    var lastD = new Date(lastDate + 'T00:00:00');
    var todayD = new Date(today + 'T00:00:00');
    var diffDays = Math.floor((todayD - lastD) / 86400000);
    if (diffDays === 1) {
      streak = streak + 1;
    } else if (diffDays > 1) {
      streak = 1;
    }
    // diffDays === 0 表示今天已签到（不会到这里）
  } else {
    streak = 1;
  }

  var maxStreak = Math.max(streak, userExp.max_login_streak || 0);
  var streakBonus = getStreakBonus(streak);

  // 先发放基础签到经验
  var result = addExp(userId, 'daily_login');
  if (!result) return null;

  // 再发放连续签到奖励（直接插入，绕过固定奖励检查）
  if (streakBonus > 0) {
    var today2 = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var bonusCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM exp_log WHERE user_id = ? AND action = ? AND date(created_at, \'+8 hours\') = ?'
    ).get(userId, 'login_streak_bonus', today2);
    if (bonusCount.cnt < 1) {
      db.prepare('INSERT INTO exp_log (user_id, action, exp_gained) VALUES (?, ?, ?)').run(userId, 'login_streak_bonus', streakBonus);
      var userExp2 = ensureUserExp(userId);
      var newExp2 = userExp2.exp + streakBonus;
      var newLevel2 = getLevel(newExp2);
      db.prepare('UPDATE user_experience SET exp = ?, level = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(newExp2, newLevel2, userId);
      result.exp_gained += streakBonus;
      result.total_exp = newExp2;
      result.level = newLevel2;
      result.leveled_up = newLevel2 > result.previous_level;
    }
  }

  db.prepare('UPDATE user_experience SET last_login_date = ?, last_login_exp_given = 1, login_streak = ?, max_login_streak = ? WHERE user_id = ?').run(today, streak, maxStreak, userId);

  result.login_streak = streak;
  result.streak_bonus = streakBonus;
  return result;
}

function getUserExpInfo(userId) {
  var userExp = ensureUserExp(userId);
  var progress = getExpProgress(userExp.exp);
  var now = new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var dailyLoginClaimed = userExp.last_login_date === today && userExp.last_login_exp_given === 1;
  var dailyExpInfo = getDailyExpInfo(userId);
  return {
    user_id: userId,
    exp: userExp.exp,
    level: userExp.level,
    show_level_community: userExp.show_level_community,
    show_level_chat: userExp.show_level_chat,
    exp_progress: progress,
    next_level_exp: getExpForNextLevel(userExp.level),
    level_thresholds: LEVEL_THRESHOLDS,
    daily_login_claimed: dailyLoginClaimed,
    daily_exp_earned: dailyExpInfo.daily_exp_earned,
    daily_exp_cap: dailyExpInfo.daily_exp_cap,
    login_streak: userExp.login_streak || 0,
    max_login_streak: userExp.max_login_streak || 0,
    streak_bonus: getStreakBonus(userExp.login_streak || 0),
    exp_rewards: EXP_REWARDS,
    daily_limits: DAILY_LIMITS
  };
}

function setShowLevelCommunity(userId, show) {
  db.prepare('UPDATE user_experience SET show_level_community = ? WHERE user_id = ?').run(show ? 1 : 0, userId);
}

function setShowLevelChat(userId, show) {
  db.prepare('UPDATE user_experience SET show_level_chat = ? WHERE user_id = ?').run(show ? 1 : 0, userId);
}

function getExpLog(userId, limit) {
  limit = limit || 50;
  return db.prepare('SELECT action, exp_gained, created_at FROM exp_log WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit);
}

function getBatchUserLevels(userIds) {
  if (!userIds || userIds.length === 0) return {};
  var result = {};
  var placeholders = userIds.map(function() { return '?'; }).join(',');
  var sql = 'SELECT user_id, exp, level, show_level_community, show_level_chat FROM user_experience WHERE user_id IN (' + placeholders + ')';
  var stmt = db.prepare(sql);
  var rows = stmt.all.apply(stmt, userIds);
  for (var i = 0; i < rows.length; i++) {
    result[rows[i].user_id] = rows[i];
  }
  return result;
}

function resetAllLevels() {
  db.prepare('DELETE FROM exp_log').run();
  db.prepare('UPDATE user_experience SET exp = 0, level = 0, last_login_date = NULL, last_login_exp_given = 0, login_streak = 0, max_login_streak = 0, updated_at = datetime(\'now\')').run();
  return true;
}

function getDailyExpInfo(userId) {
  var now = new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var todayExpRow = db.prepare(
    'SELECT COALESCE(SUM(exp_gained), 0) as total FROM exp_log WHERE user_id = ? AND date(created_at, \'+8 hours\') = ?'
  ).get(userId, today);
  return {
    daily_exp_earned: todayExpRow ? todayExpRow.total : 0,
    daily_exp_cap: DAILY_EXP_CAP
  };
}

module.exports = {
  LEVEL_THRESHOLDS: LEVEL_THRESHOLDS,
  MAX_LEVEL: MAX_LEVEL,
  EXP_REWARDS: EXP_REWARDS,
  DAILY_EXP_CAP: DAILY_EXP_CAP,
  LOGIN_STREAK_BONUS: LOGIN_STREAK_BONUS,
  getLevel: getLevel,
  getExpForNextLevel: getExpForNextLevel,
  getExpProgress: getExpProgress,
  ensureUserExp: ensureUserExp,
  addExp: addExp,
  addDailyLoginExp: addDailyLoginExp,
  getUserExpInfo: getUserExpInfo,
  setShowLevelCommunity: setShowLevelCommunity,
  setShowLevelChat: setShowLevelChat,
  getExpLog: getExpLog,
  getBatchUserLevels: getBatchUserLevels,
  resetAllLevels: resetAllLevels,
  getDailyExpInfo: getDailyExpInfo,
  getStreakBonus: getStreakBonus
};
