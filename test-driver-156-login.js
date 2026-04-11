const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://kkchafltbvzvxmoynyod.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrY2hhZmx0YnZ6dnhtb3lueW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2MzQyMjUsImV4cCI6MjA0NjIxMDIyNX0.nBDvJCPrJYEa8rAZQO7TpJKbBhK6nVXJV-uTXcl74Q0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDriver156Login() {
  console.log('\n=== Testing Driver 156 (Sisa Munks) Login ===\n');

  try {
    // 1. Check user account details in Supabase
    console.log('1. Checking Supabase users table for driver_id = 156...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('driver_id', 156);

    if (userError) {
      console.error('❌ Error querying users:', userError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ No user account found for driver_id = 156');
      return;
    }

    const user = users[0];
    console.log('✅ User account found:');
    console.log('   - ID:', user.id);
    console.log('   - Driver ID:', user.driver_id);
    console.log('   - Role:', user.role);
    console.log('   - Account Type:', user.account_type);
    console.log('   - Password Hash (first 50 chars):', user.password_hash ? user.password_hash.substring(0, 50) + '...' : 'NULL');
    console.log('   - Password Hash Length:', user.password_hash ? user.password_hash.length : 0);

    // 2. Check driver details
    console.log('\n2. Checking drivers table for driver_id = 156...');
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', 156);

    if (driverError) {
      console.error('❌ Error querying drivers:', driverError.message);
      return;
    }

    if (!drivers || drivers.length === 0) {
      console.error('❌ No driver record found for id = 156');
      return;
    }

    const driver = drivers[0];
    console.log('✅ Driver record found:');
    console.log('   - Name:', driver.name);
    console.log('   - Phone:', driver.phone);
    console.log('   - License:', driver.license_number);

    // 3. Test password comparison
    console.log('\n3. Testing password comparison...');
    const plainPassword = 'Sisa@123';
    console.log('   - Testing password:', plainPassword);

    if (!user.password_hash) {
      console.error('❌ Password hash is NULL in database! Cannot test comparison.');
      return;
    }

    const isMatch = await new Promise((resolve, reject) => {
      bcrypt.compare(plainPassword, user.password_hash, (err, match) => {
        if (err) reject(err);
        else resolve(match);
      });
    });

    if (isMatch) {
      console.log('✅ Password matches! Login should work.');
    } else {
      console.error('❌ Password does NOT match. Testing expected hash...');

      // Test by creating a new hash for comparison
      const testHash = await new Promise((resolve, reject) => {
        bcrypt.hash(plainPassword, 10, (err, hash) => {
          if (err) reject(err);
          else resolve(hash);
        });
      });

      console.log('   - New test hash:', testHash.substring(0, 50) + '...');

      // Try comparing with new hash
      const testMatch = await new Promise((resolve, reject) => {
        bcrypt.compare(plainPassword, testHash, (err, match) => {
          if (err) reject(err);
          else resolve(match);
        });
      });

      if (testMatch) {
        console.log('   - New hash IS valid (bcrypt working correctly)');
        console.log('   - Database hash appears corrupted or wrong');
        console.log('\n4. Regenerating password hash...');

        // Update the database with correct hash
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({ password_hash: testHash })
          .eq('id', user.id)
          .select();

        if (updateError) {
          console.error('❌ Error updating password hash:', updateError.message);
          return;
        }

        console.log('✅ Password hash updated successfully');
        console.log('   Driver 156 should now be able to login with: Sisa@123');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testDriver156Login();
