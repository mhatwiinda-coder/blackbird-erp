const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

// Check for duplicate driver_id entries
db.all(
  `SELECT driver_id, COUNT(*) as count FROM users WHERE account_type = 'driver' GROUP BY driver_id HAVING count > 1`,
  [],
  (err, rows) => {
    if (rows && rows.length > 0) {
      console.log('Duplicate driver_id entries:');
      rows.forEach(r => console.log(`  Driver ID ${r.driver_id}: ${r.count} entries`));
      
      // Delete duplicates, keep only the first one
      db.all(
        `SELECT id, driver_id FROM users WHERE account_type = 'driver' ORDER BY driver_id, id`,
        [],
        (err, allRows) => {
          let lastDriverId = null;
          let toDelete = [];
          
          allRows.forEach(row => {
            if (row.driver_id === lastDriverId) {
              toDelete.push(row.id);
            }
            lastDriverId = row.driver_id;
          });
          
          if (toDelete.length > 0) {
            console.log(`\nDeleting duplicate entries: ${toDelete.join(', ')}`);
            toDelete.forEach(id => {
              db.run(`DELETE FROM users WHERE id = ?`, [id]);
            });
          }
          db.close();
        }
      );
    } else {
      console.log('No duplicate driver_id entries');
      db.close();
    }
  }
);
