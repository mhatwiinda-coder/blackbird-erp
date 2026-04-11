/**
 * Create user account for driver 156 (Sisa Munks)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { insert, select } = require('./server/supabase-config');

async function createAccount() {
  try {
    console.log('\n🔧 Creating user account for driver 156...\n');

    // Get driver info
    const drivers = await select('drivers', {
      select: 'id, name',
      filters: { id: 156 }
    });

    if (!drivers || drivers.length === 0) {
      console.log('❌ Driver ID 156 not found in database');
      process.exit(1);
    }

    const driver = drivers[0];
    console.log('✅ Driver found:', driver.name);

    // Check if user already exists
    const existingUsers = await select('users', {
      select: 'id, driver_id',
      filters: { driver_id: 156 }
    });

    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️  User account already exists for driver 156');
      process.exit(0);
    }

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

    const uniqueRole = `driver_156`;

    // Create user account
    await insert('users', [{
      driver_id: 156,
      account_type: 'driver',
      password_hash: passwordHash,
      role: uniqueRole
    }]);

    console.log('✅ User account created!');
    console.log(`   Driver ID: 156`);
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
