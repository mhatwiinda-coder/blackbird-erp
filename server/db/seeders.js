const db = require('../config');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const seedDatabase = () => {
  // Read and execute schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schema, (err) => {
    if (err) {
      console.error('Error executing schema:', err);
      process.exit(1);
    }

    console.log('✓ Database schema created');

    // Create user accounts with hashed passwords
    const roles = [
      { role: 'ceo', password: 'CEO@1234' },
      { role: 'hr', password: 'HR@1234' },
      { role: 'accountant', password: 'ACCT@1234' },
      { role: 'secretary', password: 'SEC@1234' }
    ];

    let usersCreated = 0;

    roles.forEach((user) => {
      bcrypt.hash(user.password, 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          return;
        }

        db.run(
          'INSERT INTO users (role, password_hash) VALUES (?, ?)',
          [user.role, hash],
          (err) => {
            if (err && !err.message.includes('UNIQUE')) {
              console.error('Error inserting user:', err);
            } else if (!err) {
              console.log(`✓ User account created: ${user.role}`);
            }

            usersCreated++;
            if (usersCreated === roles.length) {
              seedDrivers();
            }
          }
        );
      });
    });
  });
};

const seedDrivers = () => {
  // Pre-seeded drivers from original erp.html
  const drivers = [
    { name: 'John Mugambi', phone: '0723456789', plate: 'KAA 123A', type: 'CAR' },
    { name: 'Peter Kipkemboi', phone: '0734567890', plate: 'KAB 124B', type: 'CAR' },
    { name: 'Samuel Omondi', phone: '0745678901', plate: 'KAC 125C', type: 'CAR' },
    { name: 'Isaac Kiprop', phone: '0756789012', plate: 'KAD 126D', type: 'CAR' },
    { name: 'Genesis Kipketer', phone: '0767890123', plate: 'KAE 127E', type: 'CAR' },
    { name: 'David Kiplagat', phone: '0778901234', plate: 'KAF 128F', type: 'CAR' },
    { name: 'James Kipchoge', phone: '0789012345', plate: 'KAG 129G', type: 'CAR' },
    { name: 'Kevin Kipkemboi', phone: '0790123456', plate: 'KAH 130H', type: 'CAR' },
    { name: 'Micheal Kiplagat', phone: '0701234567', plate: 'KAI 131I', type: 'CAR' },
    { name: 'Andrew Kemboi', phone: '0712345678', plate: 'KAJ 132J', type: 'CAR' },
    { name: 'Chris Kiplagat', phone: '0723456789', plate: 'KAK 133K', type: 'CAR' },
    { name: 'Victor Kipketer', phone: '0734567890', plate: 'KAL 134L', type: 'CAR' },
    { name: 'Paul Kipkember', phone: '0745678901', plate: 'KAM 135M', type: 'CAR' },
    { name: 'Timothy Kipchoge', phone: '0756789012', plate: 'KAN 136N', type: 'CAR' },
    { name: 'George Kiplagat', phone: '0767890123', plate: 'KAO 137O', type: 'CAR' },
    { name: 'Simon Kipkemboi', phone: '0778901234', plate: 'KB 138P', type: 'BIKE' }
  ];

  let driversCreated = 0;

  drivers.forEach((driver) => {
    db.run(
      'INSERT INTO drivers (name, phone, plate, type, assigned_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [driver.name, driver.phone, driver.plate, driver.type, new Date().toISOString().split('T')[0], 'Active'],
      function(err) {
        if (err) {
          console.error('Error inserting driver:', err);
        } else {
          console.log(`✓ Driver created: ${driver.name}`);
        }

        driversCreated++;
        if (driversCreated === drivers.length) {
          seedWeeklyLogs();
        }
      }
    );
  });
};

const seedWeeklyLogs = () => {
  // Get all drivers first
  db.all('SELECT id FROM drivers', (err, drivers) => {
    if (err || !drivers) {
      console.error('Error fetching drivers:', err);
      return;
    }

    // Pre-seeded weekly logs
    const logs = [
      { driver_id: 1, month: 0, week: 1, days_on_road: 5, weekly_cashing: 5000 },
      { driver_id: 2, month: 0, week: 1, days_on_road: 6, weekly_cashing: 6200 },
      { driver_id: 3, month: 0, week: 2, days_on_road: 5, weekly_cashing: 4800 },
      { driver_id: 4, month: 0, week: 2, days_on_road: 7, weekly_cashing: 7100 },
      { driver_id: 5, month: 0, week: 3, days_on_road: 4, weekly_cashing: 3900 },
      { driver_id: 6, month: 0, week: 3, days_on_road: 6, weekly_cashing: 5800 },
      { driver_id: 7, month: 1, week: 1, days_on_road: 5, weekly_cashing: 5200 },
      { driver_id: 8, month: 1, week: 1, days_on_road: 7, weekly_cashing: 7300 },
      { driver_id: 9, month: 1, week: 2, days_on_road: 6, weekly_cashing: 6100 },
      { driver_id: 10, month: 1, week: 2, days_on_road: 5, weekly_cashing: 4700 }
    ];

    let logsCreated = 0;

    logs.forEach((log) => {
      db.run(
        'INSERT INTO weekly_logs (driver_id, month, week, days_on_road, weekly_cashing, vehicle_condition, reminder) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [log.driver_id, log.month, log.week, log.days_on_road, log.weekly_cashing, 'OK', 'OK'],
        function(err) {
          if (err) {
            console.error('Error inserting log:', err);
          } else {
            console.log(`✓ Log created for driver ${log.driver_id}, month ${log.month}, week ${log.week}`);
          }

          logsCreated++;
          if (logsCreated === logs.length) {
            seedQuotations();
          }
        }
      );
    });
  });
};

const seedQuotations = () => {
  const quotations = [
    {
      customer_name: 'Acme Logistics Ltd',
      customer_phone: '254723000000',
      customer_email: 'info@acmelogistics.com',
      service_type: 'Transportation',
      pickup_location: 'Nairobi CBD',
      dropoff_location: 'Mombasa',
      estimated_amount: 15000,
      source: 'Website',
      status: 'Pending',
      quote_date: new Date().toISOString().split('T')[0]
    }
  ];

  quotations.forEach((quote) => {
    db.run(
      'INSERT INTO quotations (customer_name, customer_phone, customer_email, service_type, pickup_location, dropoff_location, estimated_amount, source, status, quote_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [quote.customer_name, quote.customer_phone, quote.customer_email, quote.service_type, quote.pickup_location, quote.dropoff_location, quote.estimated_amount, quote.source, quote.status, quote.quote_date],
      function(err) {
        if (err) {
          console.error('Error inserting quotation:', err);
        } else {
          console.log(`✓ Quotation created for ${quote.customer_name}`);
        }

        // Complete seeding
        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📋 Initial Credentials:');
        console.log('   CEO      | CEO@1234');
        console.log('   HR       | HR@1234');
        console.log('   Accountant | ACCT@1234');
        console.log('   Secretary  | SEC@1234');
        console.log('\n⚠️  Please change these passwords on first login!');
        process.exit(0);
      }
    );
  });
};

// Start seeding
console.log('🌱 Starting database seeding...\n');
seedDatabase();
