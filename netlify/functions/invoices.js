const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const pathSegments = path.replace('/.netlify/functions/invoices', '').split('/').filter(Boolean);
    const id = pathSegments[0];

    if (httpMethod === 'GET' && !id) {
      const { status, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase.from('invoices').select('*');

      if (status) query = query.eq('status', status);

      const { data, error, count } = await query
        .order('invoice_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], total: count || 0 })
      };
    }

    if (httpMethod === 'GET' && id) {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    if (httpMethod === 'POST' && !id) {
      const { customer_name, invoice_amount, invoice_date } = JSON.parse(body);

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          customer_name,
          invoice_amount,
          invoice_date,
          status: 'Pending',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    if (httpMethod === 'PUT' && id) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('invoices')
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
