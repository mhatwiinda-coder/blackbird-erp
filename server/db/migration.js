/**
 * Migration script to add driver account support to existing databases
 * Run this once to update your database schema
 *
 * Usage: node server/db/migration.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../blackbird_erp.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to database');
});

// Run migration
const runMigration = () => {
  db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) console.error('Error enabling foreign keys:', err);
      else console.log('✓ Foreign keys enabled');
    });

    // Check if driver_id column already exists
    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (err) {
        console.error('Error checking users table:', err);
        return;
      }

      const hasDriverId = columns.some(col => col.name === 'driver_id');
      const hasAccountType = columns.some(col => col.name === 'account_type');

      if (!hasDriverId) {
        console.log('Adding driver_id column to users table...');
        db.run(
          `ALTER TABLE users ADD COLUMN driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE`,
          (err) => {
            if (err) console.error('✗ Error adding driver_id:', err.message);
            else console.log('✓ driver_id column added');
          }
        );
      } else {
        console.log('✓ driver_id column already exists');
      }

      if (!hasAccountType) {
        console.log('Adding account_type column to users table...');
        db.run(
          `ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'admin'`,
          (err) => {
            if (err) console.error('✗ Error adding account_type:', err.message);
            else console.log('✓ account_type column added');
          }
        );
      } else {
        console.log('✓ account_type column already exists');
      }

      // Create index on driver_id
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_users_driver_id ON users(driver_id)`,
        (err) => {
          if (err) console.error('✗ Error creating index:', err.message);
          else console.log('✓ Index idx_users_driver_id created');
        }
      );

      // Create payment_submissions table if it doesn't exist
      db.run(
        `CREATE TABLE IF NOT EXISTS payment_submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          driver_id INTEGER NOT NULL,
          submission_date TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          week INTEGER,
          month INTEGER,
          notes TEXT,
          submission_status TEXT DEFAULT 'pending',
          approved_by_role TEXT,
          approved_by_date TEXT,
          rejection_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
        )`,
        (err) => {
          if (err) console.error('✗ Error creating payment_submissions table:', err.message);
          else console.log('✓ payment_submissions table created');
        }
      );

      // Create indexes for payment_submissions
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_payment_submissions_driver_id ON payment_submissions(driver_id)`,
        (err) => {
          if (err) console.error('✗ Error creating index:', err.message);
          else console.log('✓ Index idx_payment_submissions_driver_id created');
        }
      );

      db.run(
        `CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(submission_status)`,
        (err) => {
          if (err) console.error('✗ Error creating index:', err.message);
          else console.log('✓ Index idx_payment_submissions_status created');
        }
      );
    });

    // Close database after a delay to allow all queries to finish
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('\n✓ Migration completed successfully!');
        }
        process.exit(err ? 1 : 0);
      });
    }, 1000);
  });
};

// Run the migration
runMigration();
