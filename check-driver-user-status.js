/**
 * Check user account status for specific drivers
 */

const { select } = require('./server/supabase-config');

async function checkStatus() {
  try {
    console.log('\n📋 Checking user accounts for drivers 18, 19, 22...\n');

    // Check for users linked to these drivers
    const drivers = [18, 19, 22];

    for (const driverId of drivers) {
      const users = await select('users', {
        select: '*',
        filters: { driver_id: driverId }
      });

      console.log(`Driver ID ${driverId}:`);
      if (users && users.length > 0) {
        users.forEach((user, i) => {
          console.log(`  User ${i}: id=${user.id}, driver_id=${user.driver_id}, account_type=${user.account_type}, role=${user.role}`);
        });
      } else {
        console.log(`  ❌ NO user account found\n`);
      }
    }

    // Also check all users with account_type='driver'
    console.log('\n👥 All driver accounts in system:');
    const allDriverUsers = await select('users', {
      select: 'id, driver_id, account_type, role',
      filters: { account_type: 'driver' }
    });

    console.log(`Found ${allDriverUsers.length} driver accounts\n`);

    const missingDriverIds = [18, 19, 22].filter(id => !allDriverUsers.some(u => u.driver_id === id));
    if (missingDriverIds.length > 0) {
      console.log(`⚠️  Missing accounts for drivers: ${missingDriverIds.join(', ')}\n`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStatus().then(() => {
  process.exit(0);
});
