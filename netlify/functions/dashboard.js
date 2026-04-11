const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    // GET dashboard summary data
    const [drivers, vehicles, payments, jobs, quotations] = await Promise.all([
      supabase.from('drivers').select('id').eq('status', 'Active'),
      supabase.from('vehicles').select('id'),
      supabase.from('payments').select('amount').order('payment_date', { ascending: false }).limit(30),
      supabase.from('jobs').select('id').eq('status', 'Active'),
      supabase.from('quotations').select('id').eq('status', 'Pending')
    ]);

    const activeDrivers = drivers.data?.length || 0;
    const fleetVehicles = vehicles.data?.length || 0;
    const totalRevenue = (payments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const activeJobs = jobs.data?.length || 0;
    const pendingQuotes = quotations.data?.length || 0;

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          activeDrivers,
          fleetVehicles,
          monthlyRevenue: totalRevenue,
          activeJobs,
          pendingQuotations: pendingQuotes
        }
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
