const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite');
});

// Tables to export (in order to respect foreign keys)
const tables = [
  'drivers',
  'vehicles',
  'payments',
  'jobs',
  'deliveries',
  'invoices',
  'quotations',
  'mechanics',
  'logs',
  'users'
];

let sqlOutput = '-- AUTO-GENERATED SQL MIGRATION\n-- Generated from LOCAL SQLite Database\n-- Paste this into Supabase SQL Editor\n\n';

let tablesProcessed = 0;

tables.forEach(table => {
  db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
    if (err) {
      console.error(`Error reading ${table}:`, err.message);
      tablesProcessed++;
    } else if (rows && rows.length > 0) {
      // Get column names
      const columns = Object.keys(rows[0]);
      
      sqlOutput += `\n-- ${table.toUpperCase()} --\n`;
      
      rows.forEach(row => {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          return val;
        });
        
        sqlOutput += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      });
      
      console.log(`✓ Exported ${rows.length} rows from ${table}`);
      tablesProcessed++;
    } else {
      console.log(`- Skipped ${table} (empty)`);
      tablesProcessed++;
    }
    
    // When done, save to file
    if (tablesProcessed === tables.length) {
      fs.writeFileSync('./supabase-import.sql', sqlOutput);
      console.log(`\n✓ SQL file created: supabase-import.sql (${Math.round(Buffer.byteLength(sqlOutput)/1024)}KB)`);
      console.log('\nNext steps:');
      console.log('1. Open your Supabase dashboard');
      console.log('2. Go to SQL Editor');
      console.log('3. Create new query');
      console.log('4. Copy content from supabase-import.sql');
      console.log('5. Paste and run');
      db.close();
    }
  });
});
