/**
 * Automatic Sync Service
 * Continuously syncs vehicles and drivers from Supabase to SQLite
 * Runs every 5 minutes to keep databases in sync
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { supabase } = require('../supabase-config');

const dbPath = path.join(__dirname, '../../blackbird_erp.db');
let db = null;

// Initialize database connection
const initDb = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[AUTO-SYNC] Error connecting to SQLite:', err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Sync vehicles from Supabase to SQLite
const syncVehicles = async () => {
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[AUTO-SYNC] Error fetching vehicles from Supabase:', error.message);
      return 0;
    }

    if (!vehicles || vehicles.length === 0) {
      return 0;
    }

    let synced = 0;

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
            if (!err) {
              synced++;
            }
            resolve();
          }
        );
      });
    }

    return synced;
  } catch (error) {
    console.error('[AUTO-SYNC] Error syncing vehicles:', error.message);
    return 0;
  }
};

// Sync drivers from Supabase to SQLite
const syncDrivers = async () => {
  try {
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[AUTO-SYNC] Error fetching drivers from Supabase:', error.message);
      return 0;
    }

    if (!drivers || drivers.length === 0) {
      return 0;
    }

    let synced = 0;

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
            if (!err) {
              synced++;
            }
            resolve();
          }
        );
      });
    }

    return synced;
  } catch (error) {
    console.error('[AUTO-SYNC] Error syncing drivers:', error.message);
    return 0;
  }
};

// Main sync function
const performSync = async () => {
  try {
    const vehiclesSynced = await syncVehicles();
    const driversSynced = await syncDrivers();

    if (vehiclesSynced > 0 || driversSynced > 0) {
      console.log(`[AUTO-SYNC] ✓ Synced ${vehiclesSynced} vehicles, ${driversSynced} drivers`);
    }
  } catch (error) {
    console.error('[AUTO-SYNC] Fatal sync error:', error.message);
  }
};

// Start auto-sync service
const startAutoSync = async () => {
  try {
    await initDb();
    console.log('[AUTO-SYNC] ✓ Auto-sync service started');

    // Perform initial sync
    await performSync();

    // Sync every 5 minutes
    setInterval(() => {
      performSync().catch(err => {
        console.error('[AUTO-SYNC] Periodic sync error:', err.message);
      });
    }, 5 * 60 * 1000); // 5 minutes

    console.log('[AUTO-SYNC] ✓ Scheduled to sync every 5 minutes');
  } catch (error) {
    console.error('[AUTO-SYNC] Failed to start:', error.message);
  }
};

module.exports = { startAutoSync };
