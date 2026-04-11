const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./blackbird_erp.db');

// Complete deduplicated driver data from Excel
const drivers = [
  { name: 'Emmanuel Chisenga', phone: '773755899', plate: 'CAK 3169', type: 'CAR' },
  { name: 'Maxwell chileshe', phone: '974799918', plate: 'CAF 2098', type: 'CAR' },
  { name: 'Augustine Mutale', phone: '966832664', plate: 'CAE 1892', type: 'CAR' },
  { name: 'Jonathan', phone: '969836756', plate: 'AED 4721', type: 'CAR' },
  { name: 'Rabson Lungu', phone: '977320959', plate: 'CAK 3354', type: 'CAR' },
  { name: 'Gift Silupumbwe', phone: '971608862', plate: 'CAK 3412', type: 'CAR' },
  { name: 'Patrick Mwansa', phone: '979753182', plate: 'CAK 2876', type: 'CAR' },
  { name: 'John Phiri', phone: '746567890', plate: 'AEB 4721', type: 'CAR' },
  { name: 'Uwenya Mutale', phone: '973102434', plate: 'CAK 3773', type: 'BIKE' },
  { name: 'Nicholas Kafiso', phone: '970012492', plate: 'CAK 3773', type: 'BIKE' },
  { name: 'Bernard Zulu', phone: '978284402', plate: 'CAK 3807', type: 'BIKE' },
  { name: 'Arnold Mulefu', phone: '975814007', plate: 'CAK 3775', type: 'BIKE' },
  { name: 'Renox Sakala', phone: '976908821', plate: 'CAK 3494', type: 'BIKE' },
  { name: 'Passmore Liyungu', phone: '771144445', plate: 'CAK 3775', type: 'BIKE' },
  { name: 'Samon Chipepo', phone: '976889123', plate: 'CAK 3666', type: 'BIKE' },
  { name: 'Paul Munshya', phone: '778299880', plate: 'CAK 3749', type: 'BIKE' },
  { name: 'Joseph Mwanza', phone: '777754544', plate: 'CAF 4805', type: 'CAR' },
  { name: 'Boyd Mweemba', phone: '973937353', plate: 'BK 1522', type: 'CAR' },
  { name: 'Derrick Chnkuli', phone: '972430845', plate: 'CAK 3412', type: 'CAR' },
  { name: 'Enock Manodwane', phone: '770131515', plate: 'CAK 4117', type: 'CAR' },
  { name: 'Aaron Nyoni', phone: '771158291', plate: 'BLD 3765', type: 'BIKE' },
  { name: 'Given Chilangwa', phone: '972254545', plate: 'CAK 2876', type: 'CAR' },
  { name: 'Lucky Mubita', phone: '978709748', plate: 'BLD 8740', type: 'BIKE' },
  { name: 'kennedy Bwalya', phone: '970254548', plate: 'DLB 758', type: 'BIKE' },
  { name: 'Felix Mitisombe', phone: '771508393', plate: 'BLD 8745', type: 'BIKE' },
  { name: 'Happy Matoka', phone: '973144823', plate: 'BLD 8745', type: 'BIKE' },
  { name: 'Samuel Chansa', phone: '974486675', plate: 'BLD 8741', type: 'BIKE' },
  { name: 'Namakando lucky', phone: '974486675', plate: 'BLD 8741', type: 'BIKE' },
  { name: 'Steven bolta', phone: '972247899', plate: 'BLD 8742', type: 'BIKE' },
  { name: 'shadreck zimba', phone: '972227608', plate: 'BLD 8744', type: 'BIKE' },
  { name: 'clyde sianga', phone: '775364815', plate: 'BLD 8747', type: 'BIKE' },
  { name: 'Edward zulu', phone: '975161732', plate: 'CAK 3880', type: 'CAR' },
  { name: 'Bright Beenzu', phone: '971088334', plate: 'BLD 8759', type: 'BIKE' },
  { name: 'joshua kafunda', phone: '970852558', plate: 'CAK 3765', type: 'CAR' },
  { name: 'kelvin Chinakila', phone: '971088334', plate: 'BBC 1522', type: 'CAR' },
  { name: 'Hosea Phiri', phone: '970852558', plate: 'CAK 3354', type: 'CAR' },
  { name: 'Shermigany Musonda', phone: '970539567', plate: 'BLD 8744', type: 'BIKE' },
  { name: 'Allan Zulu', phone: '970539567', plate: 'BLD 8757', type: 'BIKE' },
  { name: 'Christopher Mvula', phone: '770808468', plate: 'CAK 3802', type: 'CAR' },
  { name: 'Joshua Mubita', phone: '972834544', plate: 'BK 3752', type: 'BIKE' },
  { name: 'Enock Mbawa', phone: '778001953', plate: 'CAK 3880', type: 'CAR' },
  { name: 'Misheck Banda', phone: '972812345', plate: 'CAK 2676', type: 'CAR' },
  { name: 'John Chipeta', phone: '974018550', plate: 'CAK 3412', type: 'CAR' },
  { name: 'Enoch Shashipa', phone: '778207083', plate: 'BLD 3771', type: 'CAR' },
];

console.log('🔄 Synchronizing drivers with vehicles from Excel...\n');

let processed = 0;
let updated = 0;

drivers.forEach((driverData) => {
  // Update existing driver
  db.get(
    'SELECT id FROM drivers WHERE LOWER(name) = LOWER(?)',
    [driverData.name],
    (err, driver) => {
      processed++;

      if (driver) {
        db.run(
          'UPDATE drivers SET phone = ?, plate = ?, type = ? WHERE id = ?',
          [driverData.phone, driverData.plate, driverData.type, driver.id],
          () => {
            console.log(`✓ ${driverData.name} → ${driverData.plate}`);
            updated++;
          }
        );
      } else {
        // Create new driver
        db.run(
          'INSERT INTO drivers (name, phone, plate, type, status) VALUES (?, ?, ?, ?, ?)',
          [driverData.name, driverData.phone, driverData.plate, driverData.type, 'Active'],
          () => {
            console.log(`✓ ${driverData.name} → ${driverData.plate}`);
            updated++;
          }
        );
      }

      // Ensure vehicle exists with this plate
      if (driverData.plate) {
        db.get('SELECT id FROM vehicles WHERE LOWER(plate) = LOWER(?)', [driverData.plate], (err, vehicle) => {
          if (!vehicle) {
            db.run('INSERT INTO vehicles (plate, type, vehicle_condition) VALUES (?, ?, ?)',
              [driverData.plate, driverData.type, 'Good']);
          }
        });
      }

      // When done
      if (processed === drivers.length) {
        setTimeout(() => {
          console.log(`\n✅ Synchronized ${updated} drivers!`);
          console.log('🎉 Refresh the ERP to see updated data\n');
          db.close();
        }, 1500);
      }
    }
  );
});
