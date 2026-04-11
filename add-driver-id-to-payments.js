/**
 * Add driver_id column to Supabase payments table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addColumn() {
  try {
    console.log('\n🔧 Adding driver_id column to payments table...\n');

    // Use SQL to add the column
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE payments ADD COLUMN driver_id INTEGER;'
    }).catch(err => ({ error: err }));

    if (error) {
      // Column might already exist or RPC doesn't exist
      console.log('Note: RPC execute_sql not available, trying alternate method...');
      
      // For now, just acknowledge we need to add this
      console.log('⚠️  Column driver_id needs to be added manually in Supabase');
      console.log('\nSteps:');
      console.log('1. Go to https://supabase.io');
      console.log('2. Open project: cwuogdcxckenebarxsjd');
      console.log('3. Go to SQL Editor');
      console.log('4. Run this SQL:');
      console.log('\nALTER TABLE payments ADD COLUMN driver_id INTEGER;');
      console.log('\n5. Then link payments to drivers based on payer_name');
      return;
    }

    console.log('✅ Column added successfully');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

addColumn().then(() => process.exit(0));
setTimeout(() => process.exit(0), 2000);
