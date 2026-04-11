/**
 * Script to create sample driver accounts for testing
 * Run: node server/db/create-driver-accounts.js
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../../blackbird_erp.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to database');
});

// Hash password
const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    });
  });
};

// Create driver accounts
const createDriverAccounts = async () => {
  const drivers = [
    { driverId: 1, password: 'Driver@123', name: 'John Doe' },
    { driverId: 2, password: 'Driver@123', name: 'Jane Smith' },
    { driverId: 3, password: 'Driver@123', name: 'Mike Johnson' },
  ];

  for (const driver of drivers) {
    try {
      const hash = await hashPassword(driver.password);

      db.run(
        `INSERT OR REPLACE INTO users (driver_id, account_type, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [driver.driverId, 'driver', hash],
        (err) => {
          if (err) {
            console.error(`✗ Error creating account for driver ${driver.driverId}:`, err.message);
          } else {
            console.log(`✓ Created/updated driver account: ${driver.name} (ID: ${driver.driverId}, Pass: ${driver.password})`);
          }
        }
      );
    } catch (err) {
      console.error(`✗ Error hashing password for driver ${driver.driverId}:`, err.message);
    }
  }

  // Close database after a delay
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n✓ Sample driver accounts created successfully!');
        console.log('\nYou can now login with:');
        console.log('  Driver ID: 1, Password: Driver@123');
        console.log('  Driver ID: 2, Password: Driver@123');
        console.log('  Driver ID: 3, Password: Driver@123');
      }
      process.exit(err ? 1 : 0);
    });
  }, 1000);
};

createDriverAccounts();
