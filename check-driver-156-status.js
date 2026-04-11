const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const dbPath = path.join(__dirname, 'blackbird_erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database\n');
});

// Check driver 156 in SQLite
db.all('SELECT * FROM drivers WHERE id = 156', [], (err, rows) => {
  if (err) {
    console.error('Error querying drivers:', err);
  }
  
  if (rows && rows.length > 0) {
    console.log('✅ Driver 156 exists in SQLite:');
    console.log('   - Name:', rows[0].name);
    console.log('   - Phone:', rows[0].phone);
    console.log('   - License:', rows[0].license_number);
  } else {
    console.log('❌ Driver 156 NOT FOUND in SQLite');
    db.close();
    process.exit(0);
  }
  
  // Check user account in SQLite
  db.all('SELECT * FROM users WHERE driver_id = 156', [], (err, userRows) => {
    if (err) {
      console.error('Error querying users:', err);
    }
    
    if (userRows && userRows.length > 0) {
      console.log('\n✅ User account found in SQLite:');
      console.log('   - Role:', userRows[0].role);
      console.log('   - Password Hash:', userRows[0].password_hash ? 'EXISTS' : 'NULL');
    } else {
      console.log('\n❌ User account NOT FOUND in SQLite for driver 156');
    }
    
    // Check Supabase
    const supabaseUrl = 'https://kkchafltbvzvxmoynyod.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrY2hhZmx0YnZ6dnhtb3lueW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2MzQyMjUsImV4cCI6MjA0NjIxMDIyNX0.nBDvJCPrJYEa8rAZQO7TpJKbBhK6nVXJV-uTXcl74Q0';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('\n🔍 Checking Supabase...');
    
    Promise.all([
      supabase.from('drivers').select('*').eq('id', 156),
      supabase.from('users').select('*').eq('driver_id', 156)
    ]).then(([driverRes, userRes]) => {
      const driverData = driverRes.data || [];
      const userData = userRes.data || [];
      
      if (driverData.length > 0) {
        console.log('✅ Driver 156 found in Supabase:');
        console.log('   - Name:', driverData[0].name);
      } else {
        console.log('❌ Driver 156 NOT found in Supabase');
      }
      
      if (userData.length > 0) {
        console.log('\n✅ User account found in Supabase:');
        console.log('   - ID:', userData[0].id);
        console.log('   - Role:', userData[0].role);
        console.log('   - Account Type:', userData[0].account_type);
        console.log('   - Password Hash:', userData[0].password_hash ? 'EXISTS (' + userData[0].password_hash.length + ' chars)' : 'NULL');
      } else {
        console.log('\n❌ User account NOT found in Supabase');
      }
      
      db.close();
      process.exit(0);
    }).catch(err => {
      console.error('Supabase error:', err.message);
      db.close();
      process.exit(1);
    });
  });
});
