const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

console.log('=== USERS TABLE SCHEMA ===\n');

db.all(
  `PRAGMA table_info(users)`,
  [],
  (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        console.log(`${r.name} | ${r.type} | PK: ${r.pk} | NOT NULL: ${r.notnull}`);
      });
    }
    
    console.log('\n=== USERS TABLE INDEXES ===\n');
    db.all(
      `PRAGMA index_list(users)`,
      [],
      (err, indexes) => {
        if (indexes) {
          indexes.forEach(idx => {
            console.log(`${idx.name} | Unique: ${idx.unique}`);
            db.all(`PRAGMA index_info(${idx.name})`, [], (err, cols) => {
              cols.forEach(col => console.log(`  - ${col.name}`));
            });
          });
        }
        db.close();
      }
    );
  }
);
