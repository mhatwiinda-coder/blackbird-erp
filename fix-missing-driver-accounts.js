/**
 * Fix missing driver user accounts
 * Creates missing user accounts for drivers that don't have login credentials
 */

const { select, insert } = require('./server/supabase-config');
const bcrypt = require('bcryptjs');

async function fixMissingDriverAccounts() {
  try {
    console.log('\n📋 Checking for drivers without user accounts...\n');

    // Get all drivers
    const drivers = await select('drivers', { select: 'id, name' });
    console.log(`Found ${drivers.length} total drivers`);

    // Get all drivers with user accounts
    const users = await select('users', {
      select: 'driver_id',
      filters: { account_type: 'driver' }
    });

    const driverIdsWithAccounts = new Set(users.map(u => u.driver_id).filter(Boolean));
    const missingDrivers = drivers.filter(d => !driverIdsWithAccounts.has(d.id));

    if (missingDrivers.length === 0) {
      console.log('✅ All drivers have user accounts!\n');
      return;
    }

    console.log(`\n⚠️  Found ${missingDrivers.length} drivers WITHOUT user accounts:\n`);
    missingDrivers.forEach(d => {
      console.log(`  - ID ${d.id}: ${d.name}`);
    });

    console.log(`\n🔧 Creating missing user accounts...\n`);

    let created = 0;
    let failed = 0;

    for (const driver of missingDrivers) {
      try {
        const firstName = driver.name.split(' ')[0];
        const plainPassword = `${firstName}@123`;

        // Hash password
        const passwordHash = await new Promise((resolve, reject) => {
          bcrypt.hash(plainPassword, 10, (err, hash) => {
            if (err) reject(err);
            else resolve(hash);
          });
        });

        const uniqueRole = `driver_${driver.id}`;

        // Create user account
        await insert('users', [{
          driver_id: driver.id,
          account_type: 'driver',
          password_hash: passwordHash,
          role: uniqueRole
        }]);

        console.log(`✅ Created account for ID ${driver.id} (${driver.name})`);
        console.log(`   Password: ${plainPassword}\n`);
        created++;
      } catch (err) {
        console.error(`❌ Failed to create account for ID ${driver.id}:`, err.message);
        failed++;
      }
    }

    console.log(`\n✨ Summary:`);
    console.log(`  Created: ${created} user accounts`);
    console.log(`  Failed: ${failed} accounts`);
    console.log(`  Total: ${created + failed} drivers processed\n`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMissingDriverAccounts().then(() => {
  console.log('Done!\n');
  process.exit(0);
});
