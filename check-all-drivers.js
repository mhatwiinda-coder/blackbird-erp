const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'blackbird_erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

db.all('SELECT id, name, phone FROM drivers ORDER BY id DESC LIMIT 20', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  }
  
  console.log('Latest 20 drivers in SQLite:');
  console.log('ID\tName\t\t\tPhone');
  console.log('--\t----\t\t\t-----');
  rows.forEach(row => {
    console.log(`${row.id}\t${row.name}\t\t${row.phone}`);
  });
  
  db.close();
});
