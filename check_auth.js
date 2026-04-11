const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

// Check if driver_accounts table exists
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%driver%' OR name LIKE '%account%' OR name LIKE '%user%'", [], (err, rows) => {
  if (err) {
    console.error(err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('=== TABLES IN LOCAL DATABASE ===');
  rows.forEach(row => console.log(`- ${row.name}`));
  
  // Try to get users table info
  db.all("PRAGMA table_info(users)", [], (err, cols) => {
    if (!err && cols.length > 0) {
      console.log('\n=== USERS TABLE STRUCTURE ===');
      cols.forEach(col => console.log(`- ${col.name} (${col.type})`));
      
      // Get users for drivers
      db.all("SELECT id, username, driver_id, role FROM users WHERE driver_id IS NOT NULL LIMIT 5", [], (err, users) => {
        if (!err && users.length > 0) {
          console.log('\n=== DRIVER USERS (LOCAL) ===');
          users.forEach(u => console.log(`ID: ${u.id}, Username: ${u.username}, Driver ID: ${u.driver_id}, Role: ${u.role}`));
        } else {
          console.log('\n⚠️  NO DRIVER ACCOUNTS FOUND IN LOCAL USERS TABLE');
        }
        db.close();
      });
    } else {
      console.log('\n⚠️  USERS TABLE NOT FOUND IN LOCAL DATABASE');
      db.close();
    }
  });
});
