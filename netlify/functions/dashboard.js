const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/dashboard' : '/api/dashboard';
    const endpoint = path.replace(basePath, '').split('/').filter(Boolean)[0];

    if (httpMethod === 'GET' && endpoint === 'stats') {
      const [driversRes, vehiclesRes, paymentsRes, submissionsRes, rtoPaymentsRes] = await Promise.all([
        supabase.from('drivers').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('payments').select('amount, payment_status'),
        supabase.from('driver_submissions').select('amount, submission_status'),
        supabase.from('rent_to_own_payments').select('amount')
      ]);

      // Count active drivers and vehicles
      const totalDrivers = (driversRes.data || []).length;
      const totalVehicles = (vehiclesRes.data || []).length;

      // Calculate total revenue from all approved sources
      const paymentsRevenue = (paymentsRes.data || [])
        .filter(p => p.payment_status === 'Paid' || p.payment_status === 'Approved')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const submissionsRevenue = (submissionsRes.data || [])
        .filter(s => s.submission_status === 'Approved' || s.submission_status === 'approved')
        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

      const rtoRevenue = (rtoPaymentsRes.data || [])
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const totalRevenue = paymentsRevenue + submissionsRevenue + rtoRevenue;

      return {
        statusCode: 200,
        body: JSON.stringify({ data: { total_drivers: totalDrivers, total_vehicles: totalVehicles, total_revenue: totalRevenue, active_jobs: 0 }})
      };
    }

    if (httpMethod === 'GET' && endpoint === 'alerts') {
      const [submissionsRes, rtoRes] = await Promise.all([
        supabase.from('driver_submissions').select('id').eq('submission_status', 'Pending'),
        supabase.from('rent_to_own_payments').select('id').order('created_at', { ascending: false }).limit(5)
      ]);
      const alerts = [];
      if ((submissionsRes.data || []).length > 0) alerts.push({ type: 'submission', severity: 'info', message: submissionsRes.data.length + ' pending driver submission(s) awaiting approval' });
      if ((rtoRes.data || []).length > 0) alerts.push({ type: 'rto', severity: 'info', message: rtoRes.data.length + ' RTO payment(s) recorded' });
      return { statusCode: 200, body: JSON.stringify({ alerts }) };
    }

    if (httpMethod === 'GET' && endpoint === 'monthly-revenue') {
      const [paymentsRes, submissionsRes, rtoRes] = await Promise.all([
        supabase.from('payments').select('amount, payment_date, payment_status'),
        supabase.from('driver_submissions').select('amount, submission_date, submission_status'),
        supabase.from('rent_to_own_payments').select('amount, created_at')
      ]);

      const monthlyRevenue = {};

      // Add payments data
      (paymentsRes.data || [])
        .filter(p => p.payment_status === 'Paid' || p.payment_status === 'Approved')
        .forEach(p => {
          if (p.payment_date) {
            const month = new Date(p.payment_date).getMonth();
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(p.amount || 0);
          }
        });

      // Add submissions data
      (submissionsRes.data || [])
        .filter(s => s.submission_status === 'Approved' || s.submission_status === 'approved')
        .forEach(s => {
          if (s.submission_date) {
            const month = new Date(s.submission_date).getMonth();
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(s.amount || 0);
          }
        });

      // Add RTO payments data
      (rtoRes.data || []).forEach(r => {
        if (r.created_at) {
          const month = new Date(r.created_at).getMonth();
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(r.amount || 0);
        }
      });

      const data = Object.keys(monthlyRevenue).map(month => ({ month: parseInt(month), revenue: monthlyRevenue[month] }));
      return { statusCode: 200, body: JSON.stringify({ data }) };
    }

    if (httpMethod === 'GET' && endpoint === 'top-drivers') {
      const [paymentsRes, submissionsRes, driversRes] = await Promise.all([
        supabase.from('payments').select('driver_id, payer_name, amount, payment_status'),
        supabase.from('driver_submissions').select('driver_id, amount, submission_status, driver:drivers(name)'),
        supabase.from('drivers').select('id, name')
      ]);

      const driverEarnings = {};

      // Map driver IDs to names
      const driverMap = {};
      (driversRes.data || []).forEach(d => {
        driverMap[d.id] = d.name;
      });

      // Add payments data
      (paymentsRes.data || [])
        .filter(p => p.payment_status === 'Paid' || p.payment_status === 'Approved')
        .forEach(p => {
          const name = p.payer_name || (p.driver_id ? driverMap[p.driver_id] : null) || 'Unknown';
          driverEarnings[name] = (driverEarnings[name] || 0) + parseFloat(p.amount || 0);
        });

      // Add submissions data
      (submissionsRes.data || [])
        .filter(s => s.submission_status === 'Approved' || s.submission_status === 'approved')
        .forEach(s => {
          const name = s.driver?.name || (s.driver_id ? driverMap[s.driver_id] : null) || 'Unknown';
          driverEarnings[name] = (driverEarnings[name] || 0) + parseFloat(s.amount || 0);
        });

      const data = Object.keys(driverEarnings)
        .map(name => ({ name, total_earnings: driverEarnings[name] }))
        .sort((a, b) => b.total_earnings - a.total_earnings)
        .slice(0, 10);
      return { statusCode: 200, body: JSON.stringify({ data }) };
    }

    if (httpMethod === 'GET' && endpoint === 'pending') {
      const [submissionsRes, rtoPaymentsRes, agreementsRes] = await Promise.all([
        supabase.from('driver_submissions').select('id, driver_id, amount, submission_date, driver:drivers(name)').eq('submission_status', 'Pending').order('submission_date', { ascending: false }).limit(10),
        supabase.from('rent_to_own_payments').select('id, amount, created_at, agreement_id').order('created_at', { ascending: false }).limit(10),
        supabase.from('rent_to_own_agreements').select('id, paid_amount, remaining_balance, driver_id, driver:drivers(name)').eq('agreement_status', 'Active').order('created_at', { ascending: false }).limit(5)
      ]);
      return { statusCode: 200, body: JSON.stringify({ data: { pending_submissions: submissionsRes.data || [], pending_submissions_count: submissionsRes.data?.length || 0, recent_rto_payments: rtoPaymentsRes.data || [], active_rto_agreements: agreementsRes.data || [], active_rto_count: agreementsRes.data?.length || 0 }}) };
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Endpoint not found' }) };
  } catch (err) {
    console.error('Dashboard error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
