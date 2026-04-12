const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/driver-submissions' : '/api/driver-submissions'; const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const id = pathSegments[0];
    const action = pathSegments[1];

    // GET /api/driver-submissions - List submissions
    if (httpMethod === 'GET' && !id) {
      const { status, driver_id, limit = 20, offset = 0, search } = queryStringParameters || {};

      let query = supabase
        .from('payment_submissions')
        .select(`
          *,
          driver:drivers(name, phone, plate)
        `);

      if (status) query = query.eq('submission_status', status);
      if (driver_id) query = query.eq('driver_id', driver_id);
      if (search) {
        query = query.or(`driver.name.ilike.%${search}%,driver.phone.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('submission_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: data || [],
          total: count || 0,
          limit: parseInt(limit),
          offset: parseInt(offset)
        })
      };
    }

    // GET /api/driver-submissions/:id - Single submission
    if (httpMethod === 'GET' && id && !action) {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          driver:drivers(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    // POST /api/driver-submissions/:id/approve - Approve submission
    if (httpMethod === 'POST' && id && action === 'approve') {
      // Get submission details
      const { data: submission, error: submitError } = await supabase
        .from('payment_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (submitError) throw submitError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          driver_id: submission.driver_id,
          amount: submission.amount,
          payment_date: new Date().toISOString(),
          payment_type: 'Driver Submission',
          notes: submission.notes,
          approval_status: 'approved'
        }]);

      if (paymentError) throw paymentError;

      // Update submission status
      const { data, error } = await supabase
        .from('payment_submissions')
        .update({
          submission_status: 'approved',
          approved_by_role: 'secretary',
          approved_by_date: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // POST /api/driver-submissions/:id/reject - Reject submission
    if (httpMethod === 'POST' && id && action === 'reject') {
      const { rejection_reason } = JSON.parse(body);

      const { data, error } = await supabase
        .from('payment_submissions')
        .update({
          submission_status: 'rejected',
          rejection_reason,
          approved_by_date: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // POST /api/driver-submissions - Create submission (driver submits)
    if (httpMethod === 'POST' && !id) {
      const { driver_id, amount, week, month, notes } = JSON.parse(body);

      const { data, error } = await supabase
        .from('payment_submissions')
        .insert([{
          driver_id,
          amount,
          week,
          month,
          notes,
          submission_date: new Date().toISOString(),
          submission_status: 'pending'
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
