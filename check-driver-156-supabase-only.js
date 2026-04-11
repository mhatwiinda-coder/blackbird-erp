const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kkchafltbvzvxmoynyod.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrY2hhZmx0YnZ6dnhtb3lueW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2MzQyMjUsImV4cCI6MjA0NjIxMDIyNX0.nBDvJCPrJYEa8rAZQO7TpJKbBhK6nVXJV-uTXcl74Q0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDriver156() {
  console.log('Checking Supabase for driver 156...\n');
  
  try {
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', 156);
    
    if (driverError) {
      console.error('Error querying drivers:', driverError);
      return;
    }
    
    if (driverData && driverData.length > 0) {
      console.log('✅ Driver 156 found in Supabase:');
      console.log('   - Name:', driverData[0].name);
      console.log('   - Phone:', driverData[0].phone);
      console.log('   - License:', driverData[0].license_number);
    } else {
      console.log('❌ Driver 156 NOT found in Supabase');
      return;
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('driver_id', 156);
    
    if (userError) {
      console.error('Error querying users:', userError);
      return;
    }
    
    if (userData && userData.length > 0) {
      console.log('\n✅ User account found in Supabase:');
      console.log('   - ID:', userData[0].id);
      console.log('   - Role:', userData[0].role);
      console.log('   - Password Hash:', userData[0].password_hash ? 'EXISTS (' + userData[0].password_hash.length + ' chars)' : 'NULL');
    } else {
      console.log('\n❌ User account NOT found for driver 156');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDriver156();
