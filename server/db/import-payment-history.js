/**
 * Import payment history from Excel into payment_submissions table
 * Usage: node server/db/import-payment-history.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const xlsx = require('xlsx');

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
  console.log(`✓ Excel file loaded`);
} catch (err) {
  console.error('✗ Error reading Excel file:', err.message);
  process.exit(1);
}

// Map months to numbers
const monthMap = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
};

// Get driver name to ID mapping
const driverMap = new Map();

db.all('SELECT id, name FROM drivers', (err, rows) => {
  if (err) {
    console.error('Error fetching drivers:', err);
    process.exit(1);
  }

  rows.forEach(row => {
    driverMap.set(row.name.toLowerCase().trim(), row.id);
  });

  console.log(`✓ Loaded ${rows.length} driver mappings`);
  importPayments();
});

// Import payments from each monthly sheet
const importPayments = () => {
  let totalImported = 0;
  let totalFailed = 0;
  const months = Object.keys(monthMap);

  console.log(`\n💰 Importing payment history from Excel...\n`);

  months.forEach((monthName) => {
    if (!workbook.Sheets[monthName]) return;

    const worksheet = workbook.Sheets[monthName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Headers are in row 4 (index 3): DRIVER/RIDER, PHONE, PLATE, CAR/BIKE, ASSIGNED DATE, DAYS, START KM, END KM, DISTANCE, REMINDER, WEEKLY CASHING, CONDITION, COMMENTS
    // WEEKLY CASHING is column K (index 10)
    // DRIVER is column A (index 0)

    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;

      const driverName = String(row[0]).trim();
      const weeklyPayment = row[10]; // Column K - WEEKLY CASHING

      // Skip if no payment recorded
      if (!weeklyPayment || isNaN(parseFloat(weeklyPayment))) continue;

      const amount = parseFloat(weeklyPayment);
      if (amount <= 0) continue;

      // Find driver ID
      const driverId = driverMap.get(driverName.toLowerCase());
      if (!driverId) {
        console.log(`⊘ Driver "${driverName}" not found (skipped)`);
        continue;
      }

      // Determine week number from row (assuming weeks are grouped)
      // Simple approach: use row number mod 4 to estimate week
      const weekNum = ((i - 4) % 4) + 1;
      const submissionDate = new Date(2026, monthMap[monthName] - 1, Math.min(1 + (weekNum - 1) * 7, 28))
        .toISOString()
        .split('T')[0];

      // Insert into payment_submissions with 'approved' status since it's historical
      db.run(
        `INSERT OR IGNORE INTO payment_submissions
         (driver_id, submission_date, amount, week, month, submission_status, approved_by_role, approved_by_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [driverId, submissionDate, amount, weekNum, monthMap[monthName], 'approved', 'admin', submissionDate],
        (err) => {
          if (err) {
            console.error(`✗ Error importing payment for ${driverName}:`, err.message);
            totalFailed++;
          } else {
            console.log(`✓ ${driverName} (${monthName} W${weekNum}): ZMW ${amount.toLocaleString()}`);
            totalImported++;
          }

          // Check if all done
          if (totalImported + totalFailed === (data.length - 4) * months.length) {
            importComplete(totalImported, totalFailed);
          }
        }
      );
    }
  });
};

const importComplete = (imported, failed) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✓ PAYMENT IMPORT COMPLETE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\n✓ Payments imported: ${imported}`);
  console.log(`✗ Payments failed: ${failed}`);
  console.log(`\nAll historical payments are now marked as "APPROVED" in driver portals`);

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✓ Database connection closed');
    }
    process.exit(0);
  });
};
