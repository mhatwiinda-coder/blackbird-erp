// ============================================================================
// TEMPLATE FOR CREATING NEW NETLIFY FUNCTIONS
// Copy this file and rename to your endpoint (e.g., staff.js, mechanics.js)
// Then modify the table names and fields to match your needs
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const pathSegments = path.replace('/.netlify/functions/YOUR_ENDPOINT', '').split('/').filter(Boolean);
    const id = pathSegments[0];

    // GET all records
    if (httpMethod === 'GET' && !id) {
      const { limit = 50, offset = 0, status, search } = queryStringParameters || {};

      let query = supabase.from('YOUR_TABLE_NAME').select('*');

      // Add filters as needed
      if (status) query = query.eq('status', status);
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], total: count || 0 })
      };
    }

    // GET single record
    if (httpMethod === 'GET' && id) {
      const { data, error } = await supabase
        .from('YOUR_TABLE_NAME')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    // POST create record
    if (httpMethod === 'POST' && !id) {
      const recordData = JSON.parse(body);

      const { data, error } = await supabase
        .from('YOUR_TABLE_NAME')
        .insert([{
          ...recordData,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT update record
    if (httpMethod === 'PUT' && id) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('YOUR_TABLE_NAME')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // DELETE record
    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('YOUR_TABLE_NAME')
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

// ============================================================================
// REMAINING FUNCTIONS TO CREATE (Use template above)
// ============================================================================
// 1. staff.js - HR staff management
//    Table: "staff" or "users"
//    Fields: name, email, role, status, created_at
//
// 2. recruitment.js - Recruitment/hiring
//    Table: "recruits" or "applications"
//    Fields: full_name, position, status, applied_date
//
// 3. mechanics.js - Auto mechanics/maintenance
//    Table: "mechanics" or "maintenance"
//    Fields: name, specialization, status, created_at
//
// 4. website-activity.js - Website visitor tracking
//    Table: "website_activity"
//    Fields: visitor_ip, page_visited, timestamp, action
//
// Steps to create each:
// 1. Copy this file (TEMPLATE.js)
// 2. Rename to desired name (e.g., staff.js)
// 3. Replace "YOUR_TABLE_NAME" with actual table name
// 4. Replace "YOUR_ENDPOINT" in path with the function name
// 5. Add/remove fields as needed
// 6. Save and deploy!
