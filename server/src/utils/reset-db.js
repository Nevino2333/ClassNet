var db = require('./db');
var initDatabase = require('./init-db').initDatabase;

var ALL_TABLES = [
  'users',
  'pre_records',
  'broadcasts',
  'chat_messages',
  'private_messages',
  'groups',
  'group_messages',
  'conversations',
  'user_settings',
  'admin_logs'
];

function resetDatabase() {
  // Disable foreign keys temporarily to allow dropping tables in any order
  db.pragma('foreign_keys = OFF');

  for (var i = 0; i < ALL_TABLES.length; i++) {
    db.exec('DROP TABLE IF EXISTS ' + ALL_TABLES[i]);
  }

  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');

  // Re-initialize all tables and seed data
  initDatabase();
}

if (require.main === module) {
  resetDatabase();
  console.log('Database reset successfully');
}

module.exports = { resetDatabase: resetDatabase };
