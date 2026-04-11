/**
 * Check if driver 22 exists in SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n🔍 Checking for driver 22...\n');

db.get('SELECT id, name, phone FROM drivers WHERE id = 22', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else if (row) {
    console.log('✅ Driver 22 exists in SQLite:');
    console.log('  ID:', row.id);
    console.log('  Name:', row.name);
    console.log('  Phone:', row.phone);
  } else {
    console.log('❌ Driver 22 NOT FOUND in SQLite');
    console.log('\nChecking all drivers...');
    
    db.all('SELECT id, name FROM drivers ORDER BY id DESC LIMIT 10', (err, rows) => {
      if (rows) {
        console.log('\nLast 10 drivers:');
        rows.forEach(r => console.log(`  ID ${r.id}: ${r.name}`));
      }
      db.close();
    });
  }
});

setTimeout(() => {
  db.close();
  process.exit(0);
}, 2000);
