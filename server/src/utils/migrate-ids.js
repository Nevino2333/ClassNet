var db = require('./db');
var config = require('../config');

// 管理员ID从配置读取，不再迁移
var PRESERVE_IDS = config.adminUserIds;

// 届数：25 代表 2025 届
var COHORT = '25';

function migrateId(oldId) {
  if (PRESERVE_IDS.indexOf(oldId) !== -1) return oldId;
  // 已经是6位新格式，跳过
  if (oldId.length === 6 && /^\d{6}$/.test(oldId)) return oldId;
  // 旧4位格式 CCNN → YYCCNN，如 0804 → 250804
  if (oldId.length === 4 && /^\d{4}$/.test(oldId)) {
    return COHORT + oldId;
  }
  // 其他格式不迁移
  return oldId;
}

function migrateIds() {
  console.log('Starting ID migration to new format (YYCCNN)...');
  console.log('Cohort prefix:', COHORT);
  console.log('Preserved IDs:', PRESERVE_IDS.join(', '));

  var preRecords = db.prepare('SELECT id, user_id, real_name FROM pre_records').all();
  var idMap = {};
  var updateCount = 0;

  for (var i = 0; i < preRecords.length; i++) {
    var record = preRecords[i];
    var newId = migrateId(record.user_id);
    if (newId !== record.user_id) {
      idMap[record.user_id] = newId;
      updateCount++;
      console.log('  pre_records: ' + record.real_name + ' ' + record.user_id + ' -> ' + newId);
    }
  }

  if (updateCount === 0) {
    console.log('No IDs to migrate. Already up to date.');
    return;
  }

  console.log('Migrating ' + updateCount + ' IDs...');

  var migrate = db.transaction(function() {
    var oldUserIds = Object.keys(idMap);

    for (var j = 0; j < oldUserIds.length; j++) {
      var oldId = oldUserIds[j];
      var newId = idMap[oldId];

      db.prepare('UPDATE pre_records SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      var userExists = db.prepare('SELECT id FROM users WHERE user_id = ?').get(oldId);
      if (userExists) {
        db.prepare('UPDATE users SET user_id = ? WHERE user_id = ?').run(newId, oldId);
      }

      db.prepare('UPDATE chat_messages SET sender_id = ? WHERE sender_id = ?').run(newId, oldId);

      db.prepare('UPDATE private_messages SET sender_id = ? WHERE sender_id = ?').run(newId, oldId);
      db.prepare('UPDATE private_messages SET receiver_id = ? WHERE receiver_id = ?').run(newId, oldId);

      db.prepare('UPDATE group_messages SET sender_id = ? WHERE sender_id = ?').run(newId, oldId);

      db.prepare('UPDATE groups SET creator_id = ? WHERE creator_id = ?').run(newId, oldId);

      db.prepare('UPDATE user_settings SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE admin_logs SET admin_id = ? WHERE admin_id = ?').run(newId, oldId);

      db.prepare('UPDATE user_experience SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE exp_log SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE community_posts SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE community_comments SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE community_likes SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE community_bookmarks SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE message_reactions SET user_id = ? WHERE user_id = ?').run(newId, oldId);

      db.prepare('UPDATE conversations SET user_id = ? WHERE user_id = ?').run(newId, oldId);
    }

    // 更新 groups.members_json 中的 user_id
    var groups = db.prepare('SELECT id, members_json FROM groups').all();
    var updateGroup = db.prepare('UPDATE groups SET members_json = ? WHERE id = ?');
    for (var gi = 0; gi < groups.length; gi++) {
      var group = groups[gi];
      var members;
      try { members = JSON.parse(group.members_json); } catch (e) { continue; }
      var changed = false;
      for (var mi = 0; mi < members.length; mi++) {
        if (idMap[members[mi]]) {
          members[mi] = idMap[members[mi]];
          changed = true;
        }
      }
      if (changed) {
        updateGroup.run(JSON.stringify(members), group.id);
      }
    }

    // 更新 user_officer_permissions 表（如果存在）
    try {
      db.prepare('UPDATE user_officer_permissions SET user_id = ? WHERE user_id = ?');
      for (var oi = 0; oi < oldUserIds.length; oi++) {
        db.prepare('UPDATE user_officer_permissions SET user_id = ? WHERE user_id = ?').run(idMap[oldUserIds[oi]], oldUserIds[oi]);
      }
    } catch (e) {}

    // 更新 user_sync 表（如果存在）
    try {
      for (var si = 0; si < oldUserIds.length; si++) {
        db.prepare('UPDATE user_sync SET user_id = ? WHERE user_id = ?').run(idMap[oldUserIds[si]], oldUserIds[si]);
      }
    } catch (e) {}
  });

  migrate();
  console.log('Migration completed! ' + updateCount + ' IDs updated.');
  console.log('ID mapping:');
  var mapKeys = Object.keys(idMap);
  for (var k = 0; k < mapKeys.length; k++) {
    console.log('  ' + mapKeys[k] + ' -> ' + idMap[mapKeys[k]]);
  }
}

migrateIds();
