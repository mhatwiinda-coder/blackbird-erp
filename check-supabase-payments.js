/**
 * Check if payments table exists in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n📋 Checking Supabase for payments table...\n');
console.log('URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  try {
    // Try to query payments table
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error querying payments:', error.message);
      console.log('   Code:', error.code);
      return;
    }

    console.log('✅ Payments table exists');
    console.log('   Sample data retrieved:', data ? data.length : 0, 'records');

    // Check for driver 22 payments
    const { data: d22, error: e22 } = await supabase
      .from('payments')
      .select('*')
      .eq('driver_id', 22);

    if (e22) {
      console.log('❌ Error querying driver 22:', e22.message);
    } else {
      console.log(`✅ Driver 22 payments: ${d22 ? d22.length : 0} records`);
    }

    // List all tables
    console.log('\n📊 Available tables in Supabase:');
    const { data: tables, error: tableError } = await supabase
      .rpc('get_tables');

    if (tableError) {
      console.log('   (Could not list tables)');
    } else if (tables) {
      tables.forEach(t => console.log('   -', t));
    }

  } catch (err) {
    console.error('Fatal error:', err.message);
  }
}

check().then(() => {
  process.exit(0);
});

setTimeout(() => {
  process.exit(1);
}, 5000);
