/**
 * Add driver 22 to SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n🔧 Adding driver 22 to SQLite...\n');

// First get the next available ID
db.get('SELECT MAX(id) as maxId FROM drivers', (err, result) => {
  const nextId = (result.maxId || 21) + 1;
  
  // Insert driver 22 with required info
  db.run(
    `INSERT INTO drivers (id, name, phone, status, type, assigned_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [22, 'LODIA CHIKAMBWE', '+260xxx', 'Active', 'BIKE', new Date().toISOString().split('T')[0]],
    function(err) {
      if (err) {
        console.error('❌ Error inserting driver:', err.message);
        // If it already exists, just verify
        db.get('SELECT * FROM drivers WHERE id = 22', (err, row) => {
          if (row) {
            console.log('✅ Driver 22 already exists:', row);
          }
          db.close();
        });
        return;
      }
      
      console.log('✅ Driver 22 added successfully!');
      
      // Verify
      db.get('SELECT * FROM drivers WHERE id = 22', (err, row) => {
        if (row) {
          console.log('\n✅ Verification:');
          console.log('  ID:', row.id);
          console.log('  Name:', row.name);
          console.log('  Status:', row.status);
          console.log('  Type:', row.type);
        }
        db.close();
      });
    }
  );
});

setTimeout(() => process.exit(0), 2000);
