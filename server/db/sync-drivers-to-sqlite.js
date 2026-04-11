/**
 * Sync drivers from Supabase to SQLite
 * Run this once: node server/db/sync-drivers-to-sqlite.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { supabase } = require('../supabase-config');

const dbPath = path.join(__dirname, '../../blackbird_erp.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to SQLite database');
});

const syncDrivers = async () => {
  try {
    console.log('\n📥 Fetching drivers from Supabase...');

    // Fetch all drivers from Supabase
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching from Supabase:', error);
      process.exit(1);
    }

    console.log(`Found ${drivers.length} drivers in Supabase`);

    // For each driver, insert or update in SQLite
    let synced = 0;
    let skipped = 0;

    for (const driver of drivers) {
      await new Promise((resolve) => {
        const query = `
          INSERT INTO drivers (id, name, phone, plate, type, assigned_date, national_id, license_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            phone = excluded.phone,
            plate = excluded.plate,
            type = excluded.type,
            assigned_date = excluded.assigned_date,
            national_id = excluded.national_id,
            license_number = excluded.license_number,
            status = excluded.status,
            updated_at = excluded.updated_at
        `;

        db.run(
          query,
          [
            driver.id,
            driver.name,
            driver.phone || null,
            driver.plate || null,
            driver.type || null,
            driver.assigned_date || null,
            driver.national_id || null,
            driver.license_number || null,
            driver.status || 'Active',
            driver.created_at || new Date().toISOString(),
            driver.updated_at || new Date().toISOString()
          ],
          function(err) {
            if (err) {
              console.error(`Error syncing driver ${driver.name}:`, err.message);
              skipped++;
            } else {
              synced++;
              console.log(`✓ Synced: ${driver.name} (ID: ${driver.id})`);
            }
            resolve();
          }
        );
      });
    }

    console.log(`\n✓ Sync complete: ${synced} drivers synced, ${skipped} skipped`);

    // Verify count
    db.get('SELECT COUNT(*) as count FROM drivers', (err, result) => {
      if (err) {
        console.error('Error counting drivers:', err);
      } else {
        console.log(`Total drivers now in SQLite: ${result.count}`);
      }
      db.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Fatal error:', error);
    db.close();
    process.exit(1);
  }
};

// Run sync
syncDrivers();
