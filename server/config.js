const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../blackbird_erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    // Initialize schema on startup
    initializeSchema();
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Set busy timeout
db.configure('busyTimeout', 5000);

// Initialize database schema
function initializeSchema() {
  const schemaPath = path.resolve(__dirname, './db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Split schema into individual statements
  const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

  statements.forEach(statement => {
    db.run(statement + ';', (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Schema initialization error:', err.message);
      }
    });
  });
}

module.exports = db;

