/**
 * Test driver submission endpoint
 */

const http = require('http');

// First get a token
const loginData = JSON.stringify({
  driverId: 22,
  password: 'LODIA@123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/auth/driver-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('\n🔐 Step 1: Getting token for driver 22...\n');

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });

  res.on('end', () => {
    try {
      const loginResp = JSON.parse(data);
      const token = loginResp.token;

      console.log('✅ Token received\n');

      // Now test submission
      console.log('📝 Step 2: Testing POST /api/driver-submissions...\n');

      const submissionData = JSON.stringify({
        amount: 500,
        week: 2,
        month: 4,
        notes: 'Test submission'
      });

      const submissionOptions = {
        hostname: 'localhost',
        port: 8000,
        path: '/api/driver-submissions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': submissionData.length
        }
      };

      const subReq = http.request(submissionOptions, (res) => {
        let subData = '';
        res.on('data', chunk => { subData += chunk; });

        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          console.log('Response:');
          try {
            console.log(JSON.stringify(JSON.parse(subData), null, 2));
          } catch {
            console.log(subData);
          }
        });
      });

      subReq.on('error', err => console.error('Error:', err.message));
      subReq.write(submissionData);
      subReq.end();

    } catch (e) {
      console.log('Error parsing login response:', data);
    }
  });
});

loginReq.on('error', err => console.error('Login error:', err.message));
loginReq.write(loginData);
loginReq.end();

setTimeout(() => process.exit(0), 3000);
