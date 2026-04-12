const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/analytics' : '/api/analytics';
    const endpoint = path.replace(basePath, '').split('/').filter(Boolean)[0];

    // GET /api/analytics/summary - YTD metrics
    if (httpMethod === 'GET' && endpoint === 'summary') {
      const currentYear = new Date().getFullYear();
      const [paymentsRes, submissionsRes] = await Promise.all([
        supabase.from('payments').select('amount, payment_date').eq('payment_status', 'Paid'),
        supabase.from('driver_submissions').select('amount, submission_date').eq('submission_status', 'Approved')
      ]);

      let ytdRevenue = 0;
      let avgWeeklyCashing = 0;
      let submissionCount = 0;

      // Calculate YTD revenue and average cashing
      (paymentsRes.data || []).forEach(p => {
        if (p.payment_date) {
          const paymentYear = new Date(p.payment_date).getFullYear();
          if (paymentYear === currentYear) {
            ytdRevenue += parseFloat(p.amount || 0);
          }
        }
      });

      (submissionsRes.data || []).forEach(s => {
        if (s.submission_date) {
          const subYear = new Date(s.submission_date).getFullYear();
          if (subYear === currentYear) {
            avgWeeklyCashing += parseFloat(s.amount || 0);
            submissionCount += 1;
          }
        }
      });

      avgWeeklyCashing = submissionCount > 0 ? avgWeeklyCashing / submissionCount : 0;

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            ytd_revenue: ytdRevenue,
            ytd_distance: 0,
            avg_weekly_cashing: avgWeeklyCashing,
            total_submissions: submissionCount
          }
        })
      };
    }

    // GET /api/analytics/driver-performance - Monthly performance by driver
    if (httpMethod === 'GET' && endpoint === 'driver-performance') {
      const { data: drivers } = await supabase.from('drivers').select('id, name');
      const { data: payments } = await supabase.from('payments').select('payer_name, amount, payment_date, payment_status').eq('payment_status', 'Paid');

      const performanceData = [];

      (drivers || []).forEach(driver => {
        const monthlyData = { driver: driver.name, plate: '', type: '', jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, total: 0 };

        (payments || []).forEach(p => {
          if (p.payer_name === driver.name && p.payment_date) {
            const month = new Date(p.payment_date).getMonth();
            const monthKey = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][month];
            const amount = parseFloat(p.amount || 0);
            monthlyData[monthKey] += amount;
            monthlyData.total += amount;
          }
        });

        if (monthlyData.total > 0) {
          performanceData.push(monthlyData);
        }
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ data: performanceData.slice(0, 50) })
      };
    }

    // GET /api/analytics/fleet-utilisation - Fleet usage metrics
    if (httpMethod === 'GET' && endpoint === 'fleet-utilisation') {
      const { data: vehicles } = await supabase.from('vehicles').select('id, plate, assigned_driver_id, driver:drivers(name)');
      const { data: assignments } = await supabase.from('drivers').select('id, name, status');

      const fleetData = [];

      (vehicles || []).forEach(v => {
        if (v.driver && v.driver.name) {
          fleetData.push({
            driver: v.driver.name,
            plate: v.plate,
            usage_rate: 85,
            distance_this_month: 0,
            fuel_cost: 0,
            revenue: 0,
            status: 'Active'
          });
        }
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ data: fleetData })
      };
    }

    // GET /api/analytics/revenue-breakdown - Revenue by vehicle type
    if (httpMethod === 'GET' && endpoint === 'revenue-breakdown') {
      const { data: vehicles } = await supabase.from('vehicles').select('id, type, assigned_driver_id');
      const { data: payments } = await supabase.from('payments').select('payer_name, amount, payment_date, payment_status').eq('payment_status', 'Paid');

      const { data: drivers } = await supabase.from('drivers').select('id, name');

      const carRevenue = {};
      const bikeRevenue = {};

      (payments || []).forEach(p => {
        const driver = drivers.find(d => d.name === p.payer_name);
        if (driver) {
          const vehicle = vehicles.find(v => v.assigned_driver_id === driver.id);
          if (vehicle) {
            const amount = parseFloat(p.amount || 0);
            if (vehicle.type === 'CAR') {
              carRevenue[new Date(p.payment_date).getMonth()] = (carRevenue[new Date(p.payment_date).getMonth()] || 0) + amount;
            } else {
              bikeRevenue[new Date(p.payment_date).getMonth()] = (bikeRevenue[new Date(p.payment_date).getMonth()] || 0) + amount;
            }
          }
        }
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const carData = months.map((m, i) => carRevenue[i] || 0);
      const bikeData = months.map((m, i) => bikeRevenue[i] || 0);

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            months,
            cars: carData,
            bikes: bikeData
          }
        })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
  } catch (err) {
    console.error('Analytics error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
