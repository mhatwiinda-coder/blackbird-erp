const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/dashboard' : '/api/dashboard';
    const endpoint = path.replace(basePath, '').split('/').filter(Boolean)[0];

    if (httpMethod === 'GET' && endpoint === 'stats') {
      const [driversRes, vehiclesRes, paymentsRes] = await Promise.all([
        supabase.from('drivers').select('id', { count: 'exact' }),
        supabase.from('vehicles').select('id', { count: 'exact' }),
        supabase.from('payments').select('amount').eq('payment_status', 'Paid')
      ]);
      const totalRevenue = (paymentsRes.data || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      return {
        statusCode: 200,
        body: JSON.stringify({ data: { total_drivers: driversRes.count || 0, total_vehicles: vehiclesRes.count || 0, total_revenue: totalRevenue, active_jobs: 0 }})
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
      const { data: payments } = await supabase.from('payments').select('amount, payment_date').eq('payment_status', 'Paid');
      const monthlyRevenue = {};
      (payments || []).forEach(p => {
        if (p.payment_date) {
          const month = new Date(p.payment_date).getMonth();
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(p.amount || 0);
        }
      });
      const data = Object.keys(monthlyRevenue).map(month => ({ month: parseInt(month), revenue: monthlyRevenue[month] }));
      return { statusCode: 200, body: JSON.stringify({ data }) };
    }

    if (httpMethod === 'GET' && endpoint === 'top-drivers') {
      const { data: payments } = await supabase.from('payments').select('payer_name, amount, payment_status').eq('payment_status', 'Paid');
      const driverEarnings = {};
      (payments || []).forEach(p => {
        const name = p.payer_name || 'Unknown';
        driverEarnings[name] = (driverEarnings[name] || 0) + parseFloat(p.amount || 0);
      });
      const data = Object.keys(driverEarnings).map(name => ({ name, total_earnings: driverEarnings[name] })).sort((a, b) => b.total_earnings - a.total_earnings).slice(0, 10);
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
