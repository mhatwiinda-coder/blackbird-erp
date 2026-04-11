const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'blackbird_erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

db.all('SELECT id, driver_id, role, password_hash FROM users WHERE driver_id = 156', [], async (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    process.exit(1);
  }
  
  if (!rows || rows.length === 0) {
    console.log('❌ No user found for driver 156');
    db.close();
    process.exit(1);
  }
  
  const user = rows[0];
  console.log('User found:');
  console.log('  - ID:', user.id);
  console.log('  - Driver ID:', user.driver_id);
  console.log('  - Role:', user.role);
  console.log('  - Hash:', user.password_hash.substring(0, 50) + '...');
  console.log('  - Hash length:', user.password_hash.length);
  
  const plainPassword = 'Sisa@123';
  console.log('\nTesting password:', plainPassword);
  
  bcrypt.compare(plainPassword, user.password_hash, (err, isMatch) => {
    if (err) {
      console.error('Error comparing:', err);
      db.close();
      process.exit(1);
    }
    
    if (isMatch) {
      console.log('✅ Password matches!');
    } else {
      console.log('❌ Password does NOT match');
      
      // Try hashing the same password again for comparison
      bcrypt.hash(plainPassword, 10, (err, newHash) => {
        if (err) {
          console.error('Error hashing:', err);
          db.close();
          process.exit(1);
        }
        
        console.log('\nTesting with freshly hashed password:');
        console.log('  - New hash:', newHash.substring(0, 50) + '...');
        
        bcrypt.compare(plainPassword, newHash, (err, isMatch2) => {
          if (err) {
            console.error('Error comparing new hash:', err);
            db.close();
            process.exit(1);
          }
          
          if (isMatch2) {
            console.log('  ✅ Fresh hash IS valid (bcrypt is working)');
            console.log('\nThe problem: Database hash is corrupted or from a different password');
            console.log('Solution: Update the password hash in the database');
            
            // Update the hash
            const updateQuery = 'UPDATE users SET password_hash = ? WHERE driver_id = 156';
            db.run(updateQuery, [newHash], function(err) {
              if (err) {
                console.error('Error updating:', err);
                db.close();
                process.exit(1);
              }
              
              console.log('\n✅ Password hash updated in database');
              console.log('Driver 156 can now login with: Sisa@123');
              db.close();
              process.exit(0);
            });
          } else {
            console.log('  ❌ Fresh hash is ALSO invalid (bcrypt itself is broken?)');
            db.close();
            process.exit(1);
          }
        });
      });
    }
    
    db.close();
    process.exit(0);
  });
});
