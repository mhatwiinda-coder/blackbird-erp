const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'blackbird_erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

db.all('SELECT * FROM users WHERE driver_id = 156', [], (err, rows) => {
  if (err) {
    console.error('Error querying users table:', err);
    db.close();
    process.exit(1);
  }
  
  if (!rows || rows.length === 0) {
    console.log('❌ No user found with driver_id = 156 in SQLite');
    db.close();
    process.exit(0);
  }
  
  const user = rows[0];
  console.log('\n✅ User found in SQLite:');
  console.log('   - ID:', user.id);
  console.log('   - Driver ID:', user.driver_id);
  console.log('   - Role:', user.role);
  console.log('   - Account Type:', user.account_type);
  console.log('   - Password Hash (first 50 chars):', user.password_hash ? user.password_hash.substring(0, 50) + '...' : 'NULL');
  console.log('   - Password Hash Length:', user.password_hash ? user.password_hash.length : 0);
  
  // Also check if driver 156 exists
  db.all('SELECT * FROM drivers WHERE id = 156', [], (err, driverRows) => {
    if (err) {
      console.error('Error querying drivers:', err);
      db.close();
      process.exit(1);
    }
    
    if (driverRows && driverRows.length > 0) {
      console.log('\n✅ Driver 156 found:');
      console.log('   - Name:', driverRows[0].name);
      console.log('   - Phone:', driverRows[0].phone);
    } else {
      console.log('\n❌ Driver 156 not found in SQLite');
    }
    
    db.close();
    process.exit(0);
  });
});
