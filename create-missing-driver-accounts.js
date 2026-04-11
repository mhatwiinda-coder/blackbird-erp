/**
 * Create missing driver user accounts in Supabase
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const client = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createMissingAccounts() {
  try {
    console.log('\n🔧 Creating missing driver user accounts...\n');

    // Get drivers that need accounts
    const driverIds = [18, 19, 22];

    // Get driver names
    const { data: drivers, error: driverError } = await client
      .from('drivers')
      .select('id, name')
      .in('id', driverIds);

    if (driverError) {
      console.error('❌ Error fetching drivers:', driverError);
      return;
    }

    console.log(`Found ${drivers.length} drivers to create accounts for\n`);

    for (const driver of drivers) {
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

      // Create user account in Supabase
      const { data, error } = await client
        .from('users')
        .insert([
          {
            driver_id: driver.id,
            account_type: 'driver',
            password_hash: passwordHash,
            role: uniqueRole
          }
        ])
        .select();

      if (error) {
        console.error(`❌ Failed for ID ${driver.id} (${driver.name}):`, error.message);
      } else {
        console.log(`✅ Created account for ID ${driver.id} (${driver.name})`);
        console.log(`   Password: ${plainPassword}\n`);
      }
    }

    console.log('Done!\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createMissingAccounts().then(() => {
  process.exit(0);
});
