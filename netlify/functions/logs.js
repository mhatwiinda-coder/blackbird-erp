const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/logs' : '/api/logs'; const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const id = pathSegments[0];

    if (httpMethod === 'GET' && !id) {
      const { month, week, driver_id, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase.from('weekly_logs').select(`
        *,
        driver:drivers(name, plate, type),
        vehicle:vehicles(plate, make_model)
      `);

      if (month) query = query.eq('month', parseInt(month));
      if (week) query = query.eq('week', parseInt(week));
      if (driver_id) query = query.eq('driver_id', parseInt(driver_id));

      const { data, error, count } = await query
        .order('month', { ascending: false })
        .order('week', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], total: count || 0 })
      };
    }

    if (httpMethod === 'GET' && id) {
      const { data, error } = await supabase
        .from('weekly_logs')
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
      const { driver_id, vehicle_id, month, week, days_on_road, start_mileage, end_mileage } = JSON.parse(body);

      const { data, error } = await supabase
        .from('weekly_logs')
        .insert([{
          driver_id,
          vehicle_id,
          month,
          week,
          days_on_road,
          start_mileage,
          end_mileage,
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
        .from('weekly_logs')
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
        .from('weekly_logs')
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
