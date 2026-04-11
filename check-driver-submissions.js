/**
 * Check driver submissions in SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n📋 Checking payment_submissions table...\n');

// Check table schema
db.all(
  `PRAGMA table_info(payment_submissions)`,
  (err, columns) => {
    if (err) {
      console.log('❌ Error:', err.message);
      db.close();
      return;
    }

    if (!columns || columns.length === 0) {
      console.log('❌ Table payment_submissions NOT FOUND');
      db.close();
      return;
    }

    console.log('✅ Table schema:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

    // Check row count
    console.log('\n📊 Current records:');
    db.get(
      `SELECT COUNT(*) as count FROM payment_submissions`,
      (err, result) => {
        if (err) {
          console.log('  Error:', err.message);
        } else {
          console.log(`  Total: ${result.count} submissions`);
        }

        // Show recent submissions
        db.all(
          `SELECT id, driver_id, amount, submission_status, created_at FROM payment_submissions ORDER BY created_at DESC LIMIT 5`,
          (err, rows) => {
            if (err) {
              console.log('  Error fetching recent:', err.message);
            } else if (rows && rows.length > 0) {
              console.log('\n  Recent submissions:');
              rows.forEach(r => {
                console.log(`    ID ${r.id}: Driver ${r.driver_id}, ZMW${r.amount}, Status: ${r.submission_status}`);
              });
            } else {
              console.log('\n  No submissions yet');
            }
            db.close();
          }
        );
      }
    );
  }
);

setTimeout(() => {
  process.exit(0);
}, 3000);
