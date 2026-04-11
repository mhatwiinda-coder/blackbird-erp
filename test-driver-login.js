/**
 * Test driver login to debug authentication
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { select } = require('./server/supabase-config');

async function testLogin() {
  try {
    console.log('\n🔐 Testing driver login...\n');

    // Test credentials
    const driverId = 22;
    const password = 'LODIA@123';

    console.log(`Attempting login for Driver ID: ${driverId}`);
    console.log(`Password attempt: ${password}\n`);

    // Check if user exists with driver_id
    const users = await select('users', {
      select: 'id, driver_id, password_hash, role, account_type',
      filters: { driver_id: driverId }
    });

    console.log(`Query result (${users.length} users found):`);
    if (users && users.length > 0) {
      users.forEach(u => {
        console.log(`  - ID: ${u.id}, driver_id: ${u.driver_id}, role: ${u.role}, account_type: ${u.account_type}`);
        console.log(`    password_hash length: ${u.password_hash ? u.password_hash.length : 'NULL'}`);
      });
    }

    if (!users || users.length === 0) {
      console.log('❌ No user found for this driver\n');
      return;
    }

    const user = users[0];

    // Test password
    const isMatch = await new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        if (err) reject(err);
        else resolve(isMatch);
      });
    });

    console.log(`\nPassword verification: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}\n`);

    if (!isMatch) {
      // Try some variations
      console.log('Testing password variations:');
      const variations = [
        'lodia@123',
        'Lodia@123',
        'LODIA@123',
        'Lodia@123'
      ];

      for (const pwd of variations) {
        const match = await new Promise((resolve, reject) => {
          bcrypt.compare(pwd, user.password_hash, (err, isMatch) => {
            if (err) reject(err);
            else resolve(isMatch);
          });
        });
        console.log(`  ${pwd}: ${match ? '✅' : '❌'}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin().then(() => {
  process.exit(0);
});
