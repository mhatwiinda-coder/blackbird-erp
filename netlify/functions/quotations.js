const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/quotations' : '/api/quotations'; const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const id = pathSegments[0];
    const action = pathSegments[1];

    if (httpMethod === 'GET' && !id) {
      const { status, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase.from('quotations').select('*');

      if (status) query = query.eq('status', status);

      const { data, error, count } = await query
        .order('quote_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], total: count || 0 })
      };
    }

    if (httpMethod === 'GET' && id && !action) {
      const { data, error } = await supabase
        .from('quotations')
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
      const { customer_name, service_type, estimated_amount } = JSON.parse(body);

      const { data, error } = await supabase
        .from('quotations')
        .insert([{
          customer_name,
          service_type,
          estimated_amount,
          status: 'Pending',
          quote_date: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    if (httpMethod === 'PUT' && id && !action) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('quotations')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    if (httpMethod === 'DELETE' && id && !action) {
      const { error } = await supabase
        .from('quotations')
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
