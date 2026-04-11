/**
 * Migration script to add RTO Payment Approval workflow columns
 * Run this once: node server/db/migrate-rto-approval.js
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

const addColumnIfNotExists = (tableName, columnName, columnDef) => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        console.error(`Error checking ${tableName}:`, err);
        return reject(err);
      }

      const hasColumn = columns.some(col => col.name === columnName);

      if (!hasColumn) {
        console.log(`Adding ${columnName} to ${tableName}...`);
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`, (err) => {
          if (err) {
            console.error(`✗ Error adding ${columnName}:`, err.message);
            return reject(err);
          }
          console.log(`✓ ${columnName} added to ${tableName}`);
          resolve();
        });
      } else {
        console.log(`✓ ${columnName} already exists in ${tableName}`);
        resolve();
      }
    });
  });
};

const runMigrations = async () => {
  try {
    // Enable foreign keys
    await new Promise((resolve, reject) => {
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err);
          return reject(err);
        }
        console.log('✓ Foreign keys enabled');
        resolve();
      });
    });

    // Add columns to rent_to_own_payments table
    console.log('\n--- Updating rent_to_own_payments table ---');

    await addColumnIfNotExists(
      'rent_to_own_payments',
      'approval_status',
      "approval_status TEXT DEFAULT 'pending'"
    );

    await addColumnIfNotExists(
      'rent_to_own_payments',
      'approved_by',
      'approved_by TEXT'
    );

    await addColumnIfNotExists(
      'rent_to_own_payments',
      'approved_at',
      'approved_at DATETIME'
    );

    await addColumnIfNotExists(
      'rent_to_own_payments',
      'rejection_reason',
      'rejection_reason TEXT'
    );

    await addColumnIfNotExists(
      'rent_to_own_payments',
      'driver_id',
      'driver_id INTEGER'
    );

    console.log('\n✓ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations
db.serialize(() => {
  runMigrations().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
});

db.on('error', (err) => {
  console.error('Database error:', err);
  process.exit(1);
});

// Close DB after timeout
setTimeout(() => {
  db.close();
}, 5000);
