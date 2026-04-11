const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

console.log('Checking drivers 153 and 154:\n');

db.all(
  `SELECT u.id, u.driver_id, u.password_hash, d.name FROM users u
   LEFT JOIN drivers d ON u.driver_id = d.id
   WHERE u.driver_id IN (153, 154)`,
  [],
  (err, rows) => {
    if (rows && rows.length > 0) {
      rows.forEach(r => {
        console.log(`User ID: ${r.id}`);
        console.log(`  Driver ID: ${r.driver_id}`);
        console.log(`  Name: ${r.name}`);
        console.log(`  Password Hash: ${r.password_hash ? '(set)' : '(NOT SET)'}`);
        console.log('---');
      });
    } else {
      console.log('No user accounts found for drivers 153, 154');
    }
    db.close();
  }
);
