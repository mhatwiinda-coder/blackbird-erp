/**
 * Get payments table columns from Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Error:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('\n✅ Payments table columns:\n');
      Object.keys(data[0]).forEach(col => {
        const val = data[0][col];
        const type = Array.isArray(val) ? 'array' : typeof val;
        console.log(`  - ${col} (${type})`);
      });
    } else {
      console.log('No records in payments table');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

check().then(() => process.exit(0));
setTimeout(() => process.exit(1), 3000);
