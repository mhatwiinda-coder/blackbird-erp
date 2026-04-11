/**
 * Sync vehicles from Supabase to SQLite
 * Run this once: node server/db/sync-vehicles-to-sqlite.js
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

const syncVehicles = async () => {
  try {
    console.log('\n📥 Fetching vehicles from Supabase...');

    // Fetch all vehicles from Supabase
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching from Supabase:', error);
      process.exit(1);
    }

    console.log(`Found ${vehicles.length} vehicles in Supabase`);

    // For each vehicle, insert or update in SQLite
    let synced = 0;
    let skipped = 0;

    for (const vehicle of vehicles) {
      await new Promise((resolve) => {
        const query = `
          INSERT INTO vehicles (id, plate, type, make_model, assigned_driver_id, vehicle_condition, road_tax_due, insurance_due, service_due_km, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            plate = excluded.plate,
            type = excluded.type,
            make_model = excluded.make_model,
            assigned_driver_id = excluded.assigned_driver_id,
            vehicle_condition = excluded.vehicle_condition,
            road_tax_due = excluded.road_tax_due,
            insurance_due = excluded.insurance_due,
            service_due_km = excluded.service_due_km,
            updated_at = excluded.updated_at
        `;

        db.run(
          query,
          [
            vehicle.id,
            vehicle.plate,
            vehicle.type,
            vehicle.make_model || null,
            vehicle.assigned_driver_id || null,
            vehicle.vehicle_condition || 'OK',
            vehicle.road_tax_due || null,
            vehicle.insurance_due || null,
            vehicle.service_due_km || null,
            vehicle.created_at || new Date().toISOString(),
            vehicle.updated_at || new Date().toISOString()
          ],
          function(err) {
            if (err) {
              console.error(`Error syncing vehicle ${vehicle.plate}:`, err.message);
              skipped++;
            } else {
              synced++;
              console.log(`✓ Synced: ${vehicle.plate} (${vehicle.type})`);
            }
            resolve();
          }
        );
      });
    }

    console.log(`\n✓ Sync complete: ${synced} vehicles synced, ${skipped} skipped`);

    // Verify count
    db.get('SELECT COUNT(*) as count FROM vehicles', (err, result) => {
      if (err) {
        console.error('Error counting vehicles:', err);
      } else {
        console.log(`Total vehicles now in SQLite: ${result.count}`);
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
syncVehicles();
