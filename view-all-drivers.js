/**
 * View all drivers and their login credentials
 * This helps identify which drivers can login
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n' + '='.repeat(80));
console.log('COMPLETE DRIVER LIST WITH LOGIN CREDENTIALS');
console.log('='.repeat(80) + '\n');

db.all(`
  SELECT
    d.id,
    d.name,
    d.phone,
    d.status,
    u.id as user_id,
    u.password_hash as has_password
  FROM drivers d
  LEFT JOIN users u ON u.driver_id = d.id AND u.account_type = 'driver'
  ORDER BY d.id
`, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  let activeCount = 0;
  let withPasswordCount = 0;

  console.log('ID  | Name                          | Phone        | Status   | Can Login? | Expected Password');
  console.log('-'.repeat(110));

  rows.forEach(row => {
    const firstName = row.name.split(' ')[0];
    const expectedPassword = firstName + '@123';
    const canLogin = row.has_password ? '✅ YES' : '❌ NO';

    if (row.status === 'Active') activeCount++;
    if (row.has_password) withPasswordCount++;

    const id = String(row.id).padEnd(3);
    const name = (row.name || '?').padEnd(30);
    const phone = (row.phone || '-').padEnd(12);
    const status = (row.status || '?').padEnd(8);

    console.log(`${id} | ${name} | ${phone} | ${status} | ${canLogin}    | ${expectedPassword}`);
  });

  console.log('-'.repeat(110));
  console.log(`\nSummary:`);
  console.log(`  Total Drivers: ${rows.length}`);
  console.log(`  Active Drivers: ${activeCount}`);
  console.log(`  Drivers with Login: ${withPasswordCount}`);
  console.log(`  Drivers Missing Login: ${rows.length - withPasswordCount}`);

  // List drivers that can't login
  const missingLogin = rows.filter(r => !r.has_password);
  if (missingLogin.length > 0) {
    console.log(`\n⚠️  DRIVERS WITHOUT LOGIN CREDENTIALS:`);
    missingLogin.forEach(d => {
      console.log(`  - ID ${d.id}: ${d.name}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  db.close();
});
