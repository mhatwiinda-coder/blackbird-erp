/**
 * Test the login endpoint
 */

const http = require('http');

const data = JSON.stringify({
  driverId: 22,
  password: 'LODIA@123'
});

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/auth/driver-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('\n🔐 Testing driver login endpoint...\n');
console.log('Request:', { driverId: 22, password: 'LODIA@123' });

const req = http.request(options, (res) => {
  console.log(`\nResponse Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(responseData);
      console.log('\nResponse Body:');
      console.log(json);
      
      if (json.token) {
        console.log('\n✅ Token received:', json.token.substring(0, 20) + '...');
      }
      if (json.driverId) {
        console.log('✅ Driver ID:', json.driverId);
      }
      if (json.driverName) {
        console.log('✅ Driver Name:', json.driverName);
      }
      if (json.error) {
        console.log('\n❌ Error:', json.error);
      }
    } catch (e) {
      console.log('\nRaw Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error);
  process.exit(1);
});

req.write(data);
req.end();

setTimeout(() => {
  console.log('\n(Request timeout)');
  process.exit(0);
}, 5000);
