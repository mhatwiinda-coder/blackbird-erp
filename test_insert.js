const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

const plainPassword = 'Uwenya@123';

bcrypt.hash(plainPassword, 10, (hashErr, passwordHash) => {
  if (hashErr) {
    console.error('Hash error:', hashErr);
    db.close();
    process.exit(1);
  }

  console.log('Attempting to insert user for driver 153...\n');

  db.run(
    'INSERT INTO users (driver_id, account_type, password_hash, role) VALUES (?, ?, ?, ?)',
    [153, 'driver', passwordHash, 'driver'],
    function(err) {
      if (err) {
        console.error('ERROR:', err.message);
        console.error('Code:', err.code);
      } else {
        console.log('✓ Successfully inserted user for driver 153');
      }
      db.close();
    }
  );
});
