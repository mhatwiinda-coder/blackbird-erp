const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

console.log('=== USERS TABLE (DRIVER ACCOUNTS) ===\n');

db.all(
  `SELECT u.id, u.driver_id, u.account_type, d.name FROM users u
   LEFT JOIN drivers d ON u.driver_id = d.id
   WHERE u.account_type = 'driver' OR u.driver_id IS NOT NULL`,
  [],
  (err, rows) => {
    if (rows && rows.length > 0) {
      rows.forEach(r => {
        console.log(`User ID: ${r.id}`);
        console.log(`  Driver ID: ${r.driver_id}`);
        console.log(`  Name: ${r.name || 'N/A'}`);
        console.log(`  Account Type: ${r.account_type}`);
        console.log('---');
      });
    } else {
      console.log('No driver user accounts found');
    }
    db.close();
  }
);
