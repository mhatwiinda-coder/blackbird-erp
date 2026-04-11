/**
 * Test inserting into payment_submissions table
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n🔍 Testing payment_submissions INSERT...\n');

// Get table schema first
db.all(`PRAGMA table_info(payment_submissions)`, (err, columns) => {
  if (err) {
    console.error('Error getting schema:', err);
    db.close();
    return;
  }

  console.log('Table schema:');
  columns.forEach(col => {
    console.log(`  ${col.name}: ${col.type} (notnull: ${col.notnull}, default: ${col.dflt_value})`);
  });

  // Try to insert
  console.log('\n📝 Attempting INSERT...\n');

  const today = new Date().toISOString().split('T')[0];
  db.run(
    `INSERT INTO payment_submissions 
     (driver_id, submission_date, amount, week, month, notes, submission_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [22, today, 500, 2, 4, 'Test', 'pending'],
    function(err) {
      if (err) {
        console.error('❌ INSERT failed:', err.message);
        console.error('   Code:', err.code);
      } else {
        console.log('✅ INSERT successful');
        console.log('   Row ID:', this.lastID);

        // Verify it was inserted
        db.get(
          `SELECT * FROM payment_submissions WHERE id = ?`,
          [this.lastID],
          (err, row) => {
            if (err) {
              console.error('Error fetching:', err);
            } else {
              console.log('✅ Verified:', row);
            }
            db.close();
          }
        );
      }
    }
  );
});

setTimeout(() => {
  process.exit(0);
}, 2000);
