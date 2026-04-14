const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/deliveries' : '/api/deliveries'; const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const id = pathSegments[0];

    if (httpMethod === 'GET' && !id) {
      const { status, rider_id, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase.from('deliveries').select(`
        *,
        rider:drivers(name, phone)
      `);

      if (status) query = query.eq('status', status);
      if (rider_id) query = query.eq('rider_id', parseInt(rider_id));

      const { data, error, count } = await query
        .order('delivery_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], total: count || 0 })
      };
    }

    if (httpMethod === 'GET' && id) {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, rider:drivers(name, phone)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    if (httpMethod === 'POST' && !id) {
      const { recipient_name, recipient_phone, pickup_location, delivery_location, assigned_driver_id, assigned_vehicle_id } = JSON.parse(body);

      const { data, error } = await supabase
        .from('deliveries')
        .insert([{
          recipient_name,
          recipient_phone,
          pickup_location,
          delivery_location,
          assigned_driver_id,
          assigned_vehicle_id,
          delivery_status: 'Pending',
          delivery_date: new Date().toISOString()
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
        .from('deliveries')
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
        .from('deliveries')
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
