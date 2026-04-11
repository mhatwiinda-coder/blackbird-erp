const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const pathSegments = path.replace('/.netlify/functions/drivers', '').split('/').filter(Boolean);
    const id = pathSegments[0];

    // GET /api/drivers - List all drivers
    if (httpMethod === 'GET' && !id) {
      const { status, search, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase.from('drivers').select('*');

      if (status) query = query.eq('status', status);
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,plate.ilike.%${search}%`);

      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: data || [],
          total: count || 0
        })
      };
    }

    // GET /api/drivers/:id - Single driver
    if (httpMethod === 'GET' && id) {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    // POST /api/drivers - Create driver
    if (httpMethod === 'POST' && !id) {
      const { name, phone, plate, type, national_id, license_number } = JSON.parse(body);

      if (!name || !type) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Name and type required' })
        };
      }

      const { data, error } = await supabase
        .from('drivers')
        .insert([{
          name,
          phone,
          plate,
          type,
          national_id,
          license_number,
          status: 'Active',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT /api/drivers/:id - Update driver
    if (httpMethod === 'PUT' && id) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('drivers')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // DELETE /api/drivers/:id - Delete driver
    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('drivers')
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
