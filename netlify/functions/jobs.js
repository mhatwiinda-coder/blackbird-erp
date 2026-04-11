const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const pathSegments = path.replace('/.netlify/functions/jobs', '').split('/').filter(Boolean);
    const id = pathSegments[0];

    if (httpMethod === 'GET' && !id) {
      const { status, driver_id, search, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase.from('jobs').select(`
        *,
        driver:drivers(name, phone),
        vehicle:vehicles(plate, make_model)
      `);

      if (status) query = query.eq('status', status);
      if (driver_id) query = query.eq('assigned_driver_id', parseInt(driver_id));
      if (search) query = query.or(`job_type.ilike.%${search}%,location_from.ilike.%${search}%,location_to.ilike.%${search}%`);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], total: count || 0 })
      };
    }

    if (httpMethod === 'GET' && id) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, driver:drivers(*), vehicle:vehicles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    if (httpMethod === 'POST' && !id) {
      const { job_type, location_from, location_to, assigned_driver_id, assigned_vehicle_id, estimated_fare } = JSON.parse(body);

      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          job_type,
          location_from,
          location_to,
          assigned_driver_id,
          assigned_vehicle_id,
          estimated_fare,
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
        .from('jobs')
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
        .from('jobs')
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
