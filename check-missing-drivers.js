const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./blackbird_erp.db');

console.log('\n📋 Checking for drivers without user accounts...\n');

// Get all drivers
db.all('SELECT id, name FROM drivers ORDER BY id', [], (err, drivers) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  // Get all drivers that have user accounts
  db.all('SELECT DISTINCT driver_id FROM users WHERE account_type = "driver"', [], (err, usersWithAccounts) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    const driverIdsWithAccounts = new Set(usersWithAccounts.map(u => u.driver_id));
    const missingDrivers = drivers.filter(d => !driverIdsWithAccounts.has(d.id));

    if (missingDrivers.length === 0) {
      console.log('✅ All drivers have user accounts!');
    } else {
      console.log(`⚠️  ${missingDrivers.length} drivers are missing user accounts:\n`);
      missingDrivers.forEach(d => {
        const password = d.name.split(' ')[0] + '@123';
        console.log(`ID: ${d.id} | Name: ${d.name} | Password should be: ${password}`);
      });
    }

    console.log(`\nTotal Drivers: ${drivers.length}`);
    console.log(`Drivers with accounts: ${driverIdsWithAccounts.size}`);
    console.log(`Drivers without accounts: ${missingDrivers.length}`);

    db.close();
  });
});
