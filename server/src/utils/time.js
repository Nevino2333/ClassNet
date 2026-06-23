function toISOString(sqliteTime) {
  if (!sqliteTime) return new Date().toISOString();
  if (sqliteTime.indexOf('T') !== -1 && sqliteTime.indexOf('Z') !== -1) return sqliteTime;
  if (sqliteTime.indexOf('T') !== -1) return sqliteTime + 'Z';
  return sqliteTime.replace(' ', 'T') + 'Z';
}

function nowISO() {
  return new Date().toISOString();
}

module.exports = {
  toISOString: toISOString,
  nowISO: nowISO
};
