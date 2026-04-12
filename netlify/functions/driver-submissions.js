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

    // GET /api/driver-submissions - List all payments (from payments table)
    if (httpMethod === 'GET' && !id) {
      const { status, limit = 20, offset = 0 } = queryStringParameters || {};

      let query = supabase
        .from('payments')
        .select(`
          id,
          payment_date,
          amount,
          description,
          payer_name,
          payment_type,
          week,
          payment_status,
          created_at,
          updated_at
        `);

      if (status) query = query.eq('payment_status', status);

      const { data, error } = await query
        .order('payment_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], count: data?.length || 0 })
      };
    }

    // GET /api/driver-submissions/:id - Get single payment
    if (httpMethod === 'GET' && id && !action) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data })
      };
    }

    // POST /api/driver-submissions - Submit new payment
    if (httpMethod === 'POST' && !id) {
      const { payer_name, amount, payment_type, description, week, payment_date } = JSON.parse(body);

      if (!payer_name || !amount) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Payer name and amount required' })
        };
      }

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          payer_name,
          amount,
          payment_type: payment_type || 'weekly_cash',
          description,
          week,
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          payment_status: 'Paid',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT /api/driver-submissions/:id - Update payment status
    if (httpMethod === 'PUT' && id && !action) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // DELETE /api/driver-submissions/:id - Delete payment
    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Payment deleted' })
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
