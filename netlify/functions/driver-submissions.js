const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/driver-submissions' : '/api/driver-submissions';
    const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const id = pathSegments[0];
    const action = pathSegments[1];

    // GET /api/driver-submissions - List all driver submissions
    if (httpMethod === 'GET' && !id) {
      const { status, limit = 20, offset = 0 } = queryStringParameters || {};

      let query = supabase
        .from('driver_submissions')
        .select(`
          id,
          driver_id,
          submission_date,
          amount,
          week,
          month,
          notes,
          submission_status,
          approved_by_role,
          driver:drivers(name)
        `);

      if (status) query = query.eq('submission_status', status);

      const { data, error } = await query
        .order('submission_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], count: data?.length || 0 })
      };
    }

    // GET /api/driver-submissions/my-submissions - Get current driver's submissions
    if (httpMethod === 'GET' && pathSegments[0] === 'my-submissions') {
      const { status, limit = 20, offset = 0 } = queryStringParameters || {};

      // Get driver ID from auth token
      const token = event.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Authorization required' })
        };
      }

      // For now, we'll need to get driver_id from context or make an assumption
      // The token should be validated to extract driver_id
      // For MVP, return all submissions (client can filter)
      let query = supabase
        .from('driver_submissions')
        .select(`
          id,
          driver_id,
          submission_date,
          amount,
          week,
          month,
          notes,
          submission_status,
          approved_by_role,
          driver:drivers(name)
        `);

      if (status) query = query.eq('submission_status', status);

      const { data, error } = await query
        .order('submission_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], count: data?.length || 0 })
      };
    }

    // GET /api/driver-submissions/:id - Get single driver submission
    if (httpMethod === 'GET' && id && !action) {
      const { data, error } = await supabase
        .from('driver_submissions')
        .select(`
          *,
          driver:drivers(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data })
      };
    }

    // POST /api/driver-submissions - Submit new driver submission
    if (httpMethod === 'POST' && !id) {
      const { driver_id, amount, week, month, notes, submission_date } = JSON.parse(body);

      if (!driver_id || !amount) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Driver ID and amount required' })
        };
      }

      const { data, error } = await supabase
        .from('driver_submissions')
        .insert([{
          driver_id,
          amount,
          week,
          month,
          notes,
          submission_date: submission_date || new Date().toISOString().split('T')[0],
          submission_status: 'Pending',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT /api/driver-submissions/:id - Update driver submission
    if (httpMethod === 'PUT' && id && !action) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('driver_submissions')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // DELETE /api/driver-submissions/:id - Delete driver submission
    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('driver_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Driver submission deleted' })
      };
    }

    // POST /api/driver-submissions/:id/approve - Approve driver submission
    if (httpMethod === 'POST' && id && action === 'approve') {
      const { data: submission, error: fetchError } = await supabase
        .from('driver_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update submission status to Approved
      const { error: updateError } = await supabase
        .from('driver_submissions')
        .update({
          submission_status: 'Approved'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Create payment record from approved submission
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          payer_name: (await supabase.from('drivers').select('name').eq('id', submission.driver_id).single()).data?.name || `Driver ${submission.driver_id}`,
          amount: submission.amount,
          payment_type: 'Driver Submission',
          description: submission.notes || 'Driver submission',
          week: submission.week,
          payment_date: submission.submission_date,
          payment_status: 'Paid',
          created_at: new Date().toISOString()
        }]);

      if (paymentError) throw paymentError;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Submission approved and payment recorded' })
      };
    }

    // POST /api/driver-submissions/:id/reject - Reject driver submission
    if (httpMethod === 'POST' && id && action === 'reject') {
      const { rejectionReason } = JSON.parse(body);

      const { error } = await supabase
        .from('driver_submissions')
        .update({
          submission_status: 'Rejected'
        })
        .eq('id', id);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Submission rejected' })
      };
    }

    // PATCH /api/driver-submissions/:id - Edit driver submission
    if (httpMethod === 'PATCH' && id && !action) {
      const updateData = JSON.parse(body);

      // Only allow editing if still pending
      const { data: submission, error: fetchError } = await supabase
        .from('driver_submissions')
        .select('submission_status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (submission.submission_status !== 'Pending') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Can only edit pending submissions' })
        };
      }

      const { data, error } = await supabase
        .from('driver_submissions')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0], message: 'Submission updated' })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
