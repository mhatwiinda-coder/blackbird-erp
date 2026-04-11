/**
 * Migrate users, checking for valid driver_ids first
 */
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sqliteDb = new sqlite3.Database('./blackbird_erp.db');

async function migrateUsers() {
  console.log('\n🔧 Fixing User Migration...\n');

  // Get all valid driver IDs from Supabase
  const { data: drivers, error: driverError } = await supabase
    .from('drivers')
    .select('id');

  if (driverError) {
    console.error('Error fetching drivers:', driverError);
    process.exit(1);
  }

  const validDriverIds = new Set(drivers.map(d => d.id));
  console.log(`✓ Found ${validDriverIds.size} valid drivers in Supabase\n`);

  // Get users from SQLite
  return new Promise((resolve) => {
    sqliteDb.all('SELECT * FROM users', [], async (err, users) => {
      if (err) {
        console.error('Error reading users:', err);
        resolve();
        return;
      }

      if (!users || users.length === 0) {
        console.log('No users to migrate');
        resolve();
        return;
      }

      let validUsers = [];
      let invalidUsers = [];

      users.forEach(user => {
        if (!user.driver_id || validDriverIds.has(user.driver_id)) {
          validUsers.push(user);
        } else {
          invalidUsers.push(user);
        }
      });

      console.log(`✓ Valid users: ${validUsers.length}`);
      console.log(`⚠️  Invalid driver_id references: ${invalidUsers.length}\n`);

      if (invalidUsers.length > 0) {
        console.log('Invalid users (will be skipped):');
        invalidUsers.slice(0, 10).forEach(u => {
          console.log(`  - ID ${u.id}: driver_id=${u.driver_id} (not found)`);
        });
        if (invalidUsers.length > 10) {
          console.log(`  ... and ${invalidUsers.length - 10} more`);
        }
        console.log();
      }

      // Migrate valid users
      let success = 0;
      let failed = 0;

      for (let i = 0; i < validUsers.length; i += 100) {
        const batch = validUsers.slice(i, i + 100);

        try {
          const { error } = await supabase
            .from('users')
            .upsert(batch, { onConflict: 'id' });

          if (error) {
            console.error(`✗ Batch ${Math.floor(i/100)+1}: ${error.message}`);
            failed += batch.length;
          } else {
            success += batch.length;
          }
        } catch (err) {
          console.error(`✗ Batch ${Math.floor(i/100)+1}: ${err.message}`);
          failed += batch.length;
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 USER MIGRATION SUMMARY');
      console.log('='.repeat(60));
      console.log(`✓ Successfully migrated: ${success}`);
      console.log(`✗ Failed: ${failed}`);
      console.log(`⊘ Skipped (invalid references): ${invalidUsers.length}`);
      console.log('='.repeat(60) + '\n');

      sqliteDb.close();
      resolve();
    });
  });
}

migrateUsers().then(() => {
  console.log('✅ User migration complete!');
  process.exit(0);
});
