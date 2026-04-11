/**
 * Check payments in SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n📋 SQLite Payments Summary:\n');

// Check payments table
db.get('SELECT COUNT(*) as count FROM payments', (err, result) => {
  console.log(`payments table: ${result.count} records`);

  // Check payment_submissions table
  db.get('SELECT COUNT(*) as count FROM payment_submissions', (err, result2) => {
    console.log(`payment_submissions table: ${result2.count} records\n`);

    // Show recent payments by driver
    console.log('Recent payments by driver (SQLite):');
    db.all(
      `SELECT driver_id, COUNT(*) as count, SUM(amount) as total
       FROM payment_submissions
       WHERE driver_id IS NOT NULL
       GROUP BY driver_id
       ORDER BY driver_id DESC
       LIMIT 10`,
      (err, rows) => {
        if (rows) {
          rows.forEach(r => {
            console.log(`  Driver ${r.driver_id}: ${r.count} payments, ZMW${r.total}`);
          });
        }
        db.close();
      }
    );
  });
});

setTimeout(() => process.exit(0), 2000);
