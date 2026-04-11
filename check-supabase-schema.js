require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('\n📋 Checking Supabase Schema...\n');

  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    console.error('Error fetching tables:', error);
    return;
  }

  const existingTables = data.map(t => t.table_name);
  console.log('Existing tables in Supabase:');
  existingTables.forEach(t => console.log(`  ✓ ${t}`));

  const requiredTables = [
    'drivers', 'vehicles', 'users', 'quotations', 'invoices',
    'payments', 'jobs', 'rent_to_own_agreements', 'rent_to_own_payments'
  ];

  console.log('\n📝 Required tables:');
  requiredTables.forEach(t => {
    const exists = existingTables.includes(t);
    console.log(`  ${exists ? '✓' : '✗'} ${t}`);
  });
}

checkSchema();
