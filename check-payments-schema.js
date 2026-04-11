/**
 * Check payments table structure in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('\n📋 Supabase payments table schema:\n');

  try {
    // Get table info using information_schema
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'payments' })
      .catch(() => null);

    if (data) {
      console.log('Columns:');
      data.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      return;
    }

    // Alternative: fetch one record and inspect keys
    const { data: sample, error: err } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (err) {
      console.log('❌ Error:', err.message);
      return;
    }

    if (sample && sample.length > 0) {
      console.log('Available columns:');
      Object.keys(sample[0]).forEach(col => {
        console.log(`  - ${col}: ${typeof sample[0][col]}`);
      });
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

check().then(() => process.exit(0));
setTimeout(() => process.exit(1), 5000);
