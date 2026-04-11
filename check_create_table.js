const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

db.all(
  `SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`,
  [],
  (err, rows) => {
    if (rows && rows.length > 0) {
      console.log('CREATE TABLE statement:\n');
      console.log(rows[0].sql);
    }
    db.close();
  }
);
