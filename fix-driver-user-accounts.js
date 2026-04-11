/**
 * Fix driver user accounts by updating existing records
 * Updates users table to set driver_id for drivers without proper accounts
 */

const { select, update } = require('./server/supabase-config');
const bcrypt = require('bcryptjs');

async function fixDriverUserAccounts() {
  try {
    console.log('\n📋 Fixing driver user accounts...\n');

    // Get all drivers
    const drivers = await select('drivers', { select: 'id, name' });
    console.log(`Found ${drivers.length} total drivers\n`);

    // List of known problematic driver IDs
    const problematicDrivers = [18, 19, 22];

    for (const driverId of problematicDrivers) {
      const driver = drivers.find(d => d.id === driverId);
      if (!driver) {
        console.log(`⚠️  Driver ID ${driverId} not found`);
        continue;
      }

      const firstName = driver.name.split(' ')[0];
      const plainPassword = `${firstName}@123`;

      // Hash password
      const passwordHash = await new Promise((resolve, reject) => {
        bcrypt.hash(plainPassword, 10, (err, hash) => {
          if (err) reject(err);
          else resolve(hash);
        });
      });

      const uniqueRole = `driver_${driverId}`;

      // Try to update existing user record
      try {
        const result = await update('users', {
          driver_id: driverId,
          account_type: 'driver',
          password_hash: passwordHash,
          role: uniqueRole
        }, { driver_id: driverId });

        console.log(`✅ Updated account for ID ${driverId} (${driver.name})`);
        console.log(`   Password: ${plainPassword}\n`);
      } catch (updateErr) {
        console.error(`❌ Failed to update account for ID ${driverId}:`, updateErr.message);
      }
    }

    console.log('Done!\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDriverUserAccounts().then(() => {
  process.exit(0);
});
