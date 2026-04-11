/**
 * Create user account for driver 2 (Mwiza Kamanga)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { insert, select } = require('./server/supabase-config');

async function createAccount() {
  try {
    console.log('\n🔧 Creating user account for driver 2...\n');

    // Get driver info
    const drivers = await select('drivers', {
      select: 'id, name',
      filters: { id: 2 }
    });

    if (!drivers || drivers.length === 0) {
      console.log('❌ Driver ID 2 not found');
      process.exit(1);
    }

    const driver = drivers[0];
    console.log('Driver:', driver.name);

    // Get first name for password
    const firstName = driver.name.split(' ')[0];
    const plainPassword = `${firstName}@123`;

    // Hash password
    const passwordHash = await new Promise((resolve, reject) => {
      bcrypt.hash(plainPassword, 10, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });

    const uniqueRole = `driver_2`;

    // Create user account
    await insert('users', [{
      driver_id: 2,
      account_type: 'driver',
      password_hash: passwordHash,
      role: uniqueRole
    }]);

    console.log('✅ User account created!');
    console.log(`   Driver ID: 2`);
    console.log(`   Name: ${driver.name}`);
    console.log(`   Password: ${plainPassword}\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAccount().then(() => {
  process.exit(0);
});
