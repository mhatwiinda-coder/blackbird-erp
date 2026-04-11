/**
 * Check database tables
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n📋 Checking database tables...\n');

const tables = [
  'payment_submissions',
  'payments',
  'drivers',
  'users',
  'sessions'
];

for (const table of tables) {
  db.all(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [table],
    (err, rows) => {
      if (err) {
        console.log(`❌ ${table}: Error - ${err.message}`);
        return;
      }
      if (rows && rows.length > 0) {
        console.log(`✅ ${table}: EXISTS`);
        
        // Get row count
        db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, result) => {
          if (err) {
            console.log(`   Error counting rows: ${err.message}`);
          } else {
            console.log(`   Records: ${result.count}`);
          }
        });
      } else {
        console.log(`❌ ${table}: NOT FOUND`);
      }
    }
  );
}

setTimeout(() => {
  db.close();
  console.log();
}, 1000);
