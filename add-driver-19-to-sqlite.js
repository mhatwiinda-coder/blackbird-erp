/**
 * Add driver 19 to SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n🔧 Adding driver 19 to SQLite...\n');

db.run(
  `INSERT OR IGNORE INTO drivers (id, name, phone, status, type, assigned_date)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [19, 'MAINZA HATWIINDA', '+260xxx', 'Active', 'CAR', new Date().toISOString().split('T')[0]],
  function(err) {
    if (err) {
      console.error('❌ Error:', err.message);
      db.close();
      return;
    }
    
    console.log('✅ Driver 19 added successfully!');
    db.close();
  }
);

setTimeout(() => process.exit(0), 1000);
