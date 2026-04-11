const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'blackbird_erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database\n');
});

async function addDriver156() {
  return new Promise((resolve, reject) => {
    // First, add driver 156 to drivers table
    const driverQuery = `
      INSERT OR IGNORE INTO drivers (id, name, phone, license_number, status, created_at, updated_at)
      VALUES (156, 'Sisa Munks', '', '', 'Active', datetime('now'), datetime('now'))
    `;
    
    db.run(driverQuery, (err) => {
      if (err) {
        console.error('Error inserting driver:', err);
        reject(err);
        return;
      }
      console.log('✅ Driver 156 added/verified in SQLite');
      resolve();
    });
  });
}

async function createUserAccount() {
  return new Promise((resolve, reject) => {
    // Hash the password
    const plainPassword = 'Sisa@123';
    bcrypt.hash(plainPassword, 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        reject(err);
        return;
      }
      
      const userQuery = `
        INSERT OR REPLACE INTO users (driver_id, account_type, role, password_hash, created_at, updated_at)
        VALUES (156, 'driver', 'driver_156', ?, datetime('now'), datetime('now'))
      `;
      
      db.run(userQuery, [hash], (err) => {
        if (err) {
          console.error('Error creating user account:', err);
          reject(err);
          return;
        }
        console.log('✅ User account created for driver 156');
        console.log('   - Login: Driver ID 156, Password: Sisa@123');
        console.log('   - Role: driver_156');
        console.log('   - Password Hash:', hash.substring(0, 50) + '...');
        resolve();
      });
    });
  });
}

async function main() {
  try {
    await addDriver156();
    await createUserAccount();
    console.log('\n✅ Driver 156 (Sisa Munks) setup complete!');
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    db.close();
    process.exit(1);
  }
}

main();
