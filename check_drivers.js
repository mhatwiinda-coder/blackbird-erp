const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Get recently added drivers
db.all("SELECT id, name, phone FROM drivers ORDER BY id DESC LIMIT 10", [], (err, rows) => {
  if (err) {
    console.error(err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('\n=== RECENTLY ADDED DRIVERS ===\n');
  rows.forEach((row) => {
    const firstName = row.name.split(' ')[0];
    const password = firstName + '@123';
    console.log(`Driver ID: ${row.id}`);
    console.log(`Name: ${row.name}`);
    console.log(`Phone: ${row.phone}`);
    console.log(`LOGIN CREDENTIALS:`);
    console.log(`  Driver ID: ${row.id}`);
    console.log(`  Password: ${password}`);
    console.log('---');
  });
  
  db.close();
});
