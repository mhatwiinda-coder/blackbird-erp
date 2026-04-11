const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

console.log('Users with role="driver":\n');

db.all(
  `SELECT id, role, driver_id, account_type FROM users WHERE role = 'driver'`,
  [],
  (err, rows) => {
    if (rows && rows.length > 0) {
      rows.forEach(r => {
        console.log(`ID: ${r.id} | Role: ${r.role} | Driver ID: ${r.driver_id} | Account Type: ${r.account_type}`);
      });
    } else {
      console.log('None found');
    }
    db.close();
  }
);
