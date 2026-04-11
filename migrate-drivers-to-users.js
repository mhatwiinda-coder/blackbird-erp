const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Get all drivers that don't have user accounts yet
db.all(
  `SELECT d.id, d.name FROM drivers d
   LEFT JOIN users u ON u.driver_id = d.id AND u.account_type = 'driver'
   WHERE u.id IS NULL`,
  [],
  (err, drivers) => {
    if (err) {
      console.error('Error fetching drivers:', err);
      db.close();
      process.exit(1);
    }

    if (drivers.length === 0) {
      console.log('✓ All drivers already have user accounts');
      db.close();
      process.exit(0);
    }

    console.log(`\nFound ${drivers.length} drivers without user accounts\n`);
    console.log('Creating user accounts...\n');

    let created = 0;
    let failed = 0;

    // Process each driver
    drivers.forEach((driver) => {
      const firstName = driver.name.split(' ')[0];
      const plainPassword = `${firstName}@123`;

      bcrypt.hash(plainPassword, 10, (hashErr, passwordHash) => {
        if (hashErr) {
          console.error(`✗ Failed to hash password for ${driver.name}`);
          failed++;
          return;
        }

        db.run(
          'INSERT INTO users (driver_id, account_type, password_hash, role) VALUES (?, ?, ?, ?)',
          [driver.id, 'driver', passwordHash, 'driver'],
          (insertErr) => {
            if (insertErr) {
              console.error(`✗ Failed to create user for ${driver.name} (ID: ${driver.id})`);
              failed++;
            } else {
              console.log(`✓ Created user for ${driver.name} (ID: ${driver.id}) - Password: ${plainPassword}`);
              created++;
            }

            // Close when all are processed
            if (created + failed === drivers.length) {
              console.log(`\n=== MIGRATION COMPLETE ===`);
              console.log(`✓ Created: ${created}`);
              console.log(`✗ Failed: ${failed}`);
              console.log(`\nDriver login credentials are now active!`);
              db.close();
              process.exit(0);
            }
          }
        );
      });
    });
  }
);
