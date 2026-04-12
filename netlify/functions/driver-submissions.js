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

    // GET /api/driver-submissions - List submissions
    if (httpMethod === 'GET' && !id) {
      const { status, limit = 20, offset = 0 } = queryStringParameters || {};

      let query = supabase
        .from('driver_submissions')
        .select(`
          *,
          driver:drivers(name, phone)
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

    // GET /api/driver-submissions/:id - Get single submission
    if (httpMethod === 'GET' && id && !action) {
      const { data, error } = await supabase
        .from('driver_submissions')
        .select(`
          *,
          driver:drivers(name, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data })
      };
    }

    // POST /api/driver-submissions - Submit payment
    if (httpMethod === 'POST' && !id) {
      const { driver_id, amount, week, month, notes } = JSON.parse(body);

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
          submission_date: new Date().toISOString().split('T')[0],
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

    // POST /api/driver-submissions/:id/approve - Approve submission
    if (httpMethod === 'POST' && id && action === 'approve') {
      const { staff_id, role } = JSON.parse(body);

      const { data, error } = await supabase
        .from('driver_submissions')
        .update({
          submission_status: 'Approved',
          approved_by_staff_id: staff_id,
          approved_by_role: role,
          approval_date: new Date().toISOString()
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
      const { reason } = JSON.parse(body);

      const { data, error } = await supabase
        .from('driver_submissions')
        .update({
          submission_status: 'Rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // DELETE /api/driver-submissions/:id - Delete submission
    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('driver_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Submission deleted' })
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
