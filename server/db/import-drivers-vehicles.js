/**
 * Import drivers and vehicles from Excel file into the database
 * Usage: node server/db/import-drivers-vehicles.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../blackbird_erp.db');
const excelPath = 'C:\\Users\\mhatw\\Downloads\\BLACK BIRD TRANSPORT SALES.xlsx';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to database');
});

// Read Excel file
let workbook;
try {
  workbook = xlsx.readFile(excelPath);
  console.log(`✓ Excel file loaded with sheets: ${workbook.SheetNames.join(', ')}`);
} catch (err) {
  console.error('✗ Error reading Excel file:', err.message);
  process.exit(1);
}

// Extract unique drivers and vehicles from monthly sheets
const driversSet = new Set();
const vehiclesSet = new Set();
const driverVehiclePairs = new Map(); // driver_name -> [vehicles]

const monthSheets = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

monthSheets.forEach(month => {
  if (!workbook.Sheets[month]) return;

  const worksheet = workbook.Sheets[month];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  // Skip header rows (typically first 3 rows)
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const driverName = String(row[0]).trim();
    const vehiclePlate = row[1] ? String(row[1]).trim() : null;

    if (driverName && driverName !== 'DRIVER/RIDER') {
      driversSet.add(driverName);

      if (vehiclePlate && vehiclePlate !== 'NUMBER PLATE' && vehiclePlate.length > 0) {
        vehiclesSet.add(vehiclePlate);

        // Map drivers to vehicles
        if (!driverVehiclePairs.has(driverName)) {
          driverVehiclePairs.set(driverName, new Set());
        }
        driverVehiclePairs.get(driverName).add(vehiclePlate);
      }
    }
  }
});

console.log(`\n📊 Data Summary:`);
console.log(`   Unique drivers: ${driversSet.size}`);
console.log(`   Unique vehicles: ${vehiclesSet.size}`);

// Convert to arrays and sort
const drivers = Array.from(driversSet).sort();
const vehicles = Array.from(vehiclesSet).sort();

console.log(`\n📋 Sample Drivers: ${drivers.slice(0, 5).join(', ')}`);
console.log(`📋 Sample Vehicles: ${vehicles.slice(0, 5).join(', ')}`);

// Helper to get vehicle type from plate
const getVehicleType = (plate) => {
  if (!plate) return 'CAR';
  const plateLower = plate.toLowerCase();
  if (plateLower.includes('bike')) return 'BIKE';
  return 'CAR';
};

// Helper to extract first name from full name
const getFirstName = (fullName) => {
  if (!fullName) return 'Driver';
  const parts = fullName.trim().split(' ');
  return parts[0];
};

// Import drivers
let driversImported = 0;
let driversFailed = 0;
const driverIdMap = new Map(); // Store mapping of driver name to ID

const importDrivers = () => {
  console.log(`\n🚗 Importing ${drivers.length} drivers...`);

  drivers.forEach((driverName, index) => {
    const firstName = getFirstName(driverName);
    const password = `${firstName}@123`; // Password format: FirstName@123

    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error(`✗ Error hashing password for ${driverName}:`, err.message);
        driversFailed++;
        return;
      }

      // Insert driver into drivers table
      db.run(
        `INSERT INTO drivers (name, phone, type, status, assigned_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [driverName, null, 'CAR', 'Active', new Date().toISOString().split('T')[0]],
        function(err) {
          if (err) {
            console.error(`✗ Error inserting driver ${driverName}:`, err.message);
            driversFailed++;
            return;
          }

          const driverId = this.lastID;
          driverIdMap.set(driverName, driverId);

          // Create user account for driver
          const role = `driver_${driverId}`;
          db.run(
            `INSERT OR REPLACE INTO users (role, driver_id, account_type, password_hash, created_at, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [role, driverId, 'driver', hash],
            (err) => {
              if (err) {
                console.error(`✗ Error creating user account for ${driverName}:`, err.message);
                driversFailed++;
              } else {
                console.log(`✓ Driver: ${driverName} (ID: ${driverId}, Password: ${password})`);
                driversImported++;
              }

              // Check if all drivers are done
              if (driversImported + driversFailed === drivers.length) {
                importVehicles();
              }
            }
          );
        }
      );
    });
  });
};

// Import vehicles
let vehiclesImported = 0;
let vehiclesFailed = 0;

const importVehicles = () => {
  console.log(`\n🚙 Importing ${vehicles.length} vehicles...`);

  vehicles.forEach((plate, index) => {
    const vehicleType = getVehicleType(plate);

    db.run(
      `INSERT INTO vehicles (plate, type, vehicle_condition, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [plate, vehicleType, 'OK'],
      function(err) {
        if (err) {
          // Ignore duplicate plate errors
          if (err.message.includes('UNIQUE')) {
            console.log(`⊘ Vehicle ${plate} already exists (skipped)`);
            vehiclesImported++;
          } else {
            console.error(`✗ Error inserting vehicle ${plate}:`, err.message);
            vehiclesFailed++;
          }
        } else {
          const vehicleId = this.lastID;
          console.log(`✓ Vehicle: ${plate} (Type: ${vehicleType})`);
          vehiclesImported++;
        }

        // Check if all vehicles are done
        if (vehiclesImported + vehiclesFailed === vehicles.length) {
          assignVehiclesToDrivers();
        }
      }
    );
  });
};

// Assign vehicles to drivers
const assignVehiclesToDrivers = () => {
  console.log(`\n🔗 Assigning vehicles to drivers...`);

  let assignmentsComplete = 0;
  let assignmentsTotal = 0;

  // First, count total assignments needed
  driverVehiclePairs.forEach((vehicleSet, driverName) => {
    assignmentsTotal += vehicleSet.size;
  });

  if (assignmentsTotal === 0) {
    console.log('⊘ No driver-vehicle assignments found');
    importComplete();
    return;
  }

  driverVehiclePairs.forEach((vehicleSet, driverName) => {
    const driverId = driverIdMap.get(driverName);
    if (!driverId) {
      console.log(`⊘ Driver ${driverName} not found in map`);
      return;
    }

    vehicleSet.forEach(plate => {
      // Find vehicle ID by plate
      db.get(
        'SELECT id FROM vehicles WHERE plate = ?',
        [plate],
        (err, vehicle) => {
          if (err || !vehicle) {
            console.log(`⊘ Vehicle ${plate} not found`);
            assignmentsComplete++;
          } else {
            // Update vehicle with driver assignment
            db.run(
              'UPDATE vehicles SET assigned_driver_id = ? WHERE id = ?',
              [driverId, vehicle.id],
              (err) => {
                if (!err) {
                  console.log(`✓ ${driverName} → ${plate}`);
                }
                assignmentsComplete++;
                if (assignmentsComplete === assignmentsTotal) {
                  importComplete();
                }
              }
            );
          }
        }
      );
    });
  });
};

const importComplete = () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✓ IMPORT COMPLETE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Drivers imported: ${driversImported}/${drivers.length}`);
  console.log(`   Vehicles imported: ${vehiclesImported}/${vehicles.length}`);
  console.log(`\n🔐 Driver Login Credentials Format:`);
  console.log(`   Username: [Driver ID]`);
  console.log(`   Password: [FirstName]@123`);
  console.log(`\n📝 Example:`);
  const firstDriver = drivers[0];
  if (firstDriver) {
    const firstName = getFirstName(firstDriver);
    console.log(`   Driver: ${firstDriver}`);
    console.log(`   Login ID: 1 (or their driver ID number)`);
    console.log(`   Password: ${firstName}@123`);
  }

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✓ Database connection closed');
    }
    process.exit(0);
  });
};

// Start import
importDrivers();
