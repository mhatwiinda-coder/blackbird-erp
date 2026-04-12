const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/payments' : '/api/payments'; const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const id = pathSegments[0];

    // GET /api/payments - List all payments
    if (httpMethod === 'GET' && !id) {
      const { driver_id, payment_type, date_from, date_to, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase
        .from('payments')
        .select(`
          *,
          driver:drivers(name, phone)
        `);

      if (driver_id) query = query.eq('driver_id', driver_id);
      if (payment_type) query = query.eq('payment_type', payment_type);
      if (date_from) query = query.gte('payment_date', date_from);
      if (date_to) query = query.lte('payment_date', date_to);

      const { data, error, count } = await query
        .order('payment_date', { ascending: false })
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

    // GET /api/payments/:id - Single payment
    if (httpMethod === 'GET' && id) {
      const { data, error } = await supabase
        .from('payments')
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

    // POST /api/payments - Create payment
    if (httpMethod === 'POST' && !id) {
      const { driver_id, amount, payment_type = 'Manual', notes } = JSON.parse(body);

      if (!driver_id || !amount) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Driver ID and amount required' })
        };
      }

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          driver_id,
          amount,
          payment_type,
          notes,
          payment_date: new Date().toISOString(),
          approval_status: 'approved'
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT /api/payments/:id - Update payment
    if (httpMethod === 'PUT' && id) {
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

    // DELETE /api/payments/:id - Delete payment
    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Deleted successfully' })
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
