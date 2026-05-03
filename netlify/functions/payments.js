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
      const { payer_name, payment_type, date_from, date_to, limit = 50, offset = 0 } = queryStringParameters || {};

      let query = supabase
        .from('payments')
        .select('*');

      if (payer_name) query = query.ilike('payer_name', `%${payer_name}%`);
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

    // GET /api/payments/:id - Single payment (exclude backdating)
    if (httpMethod === 'GET' && id && id !== 'backdating') {
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

    // ========== BACKDATED PAYMENTS (check first) ==========

    // GET /api/payments/backdating/:driver_id - List all payments for a driver (including manually recorded ones)
    if (httpMethod === 'GET' && id === 'backdating' && pathSegments[1]) {
      const driverId = pathSegments[1];

      // First, get the driver's name to match against payer_name for legacy payments
      const { data: driverData } = await supabase
        .from('drivers')
        .select('name')
        .eq('id', driverId)
        .single();

      const driverName = driverData?.name || '';

      // Query payments by driver_id (new payments with driver_id)
      const { data: byDriverId } = await supabase
        .from('payments')
        .select(`
          *,
          driver:drivers(name)
        `)
        .eq('driver_id', driverId)
        .order('payment_date', { ascending: false });

      // Query payments by payer_name (legacy payments without driver_id)
      const { data: byPayerName } = await supabase
        .from('payments')
        .select(`
          *,
          driver:drivers(name)
        `)
        .ilike('payer_name', driverName)
        .order('payment_date', { ascending: false });

      // Merge and deduplicate by ID
      const allPayments = [...(byDriverId || []), ...(byPayerName || [])];
      const seenIds = new Set();
      const uniquePayments = allPayments.filter(p => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: uniquePayments.map(p => ({
            id: p.id,
            driver_id: p.driver_id,
            driver_name: p.driver?.name || p.payer_name,
            amount: p.amount,
            payment_date: p.payment_date,
            payment_type: p.payment_type,
            week: p.week,
            month: p.month,
            description: p.description,
            payment_status: p.payment_status,
            created_at: p.created_at
          })),
          count: uniquePayments.length
        })
      };
    }

    // POST /api/payments/backdating/add - Add a new backdated payment
    if (httpMethod === 'POST' && id === 'backdating' && pathSegments[1] === 'add') {
      const { driver_id, amount, payment_date, week, month, description } = JSON.parse(body);

      if (!driver_id || !amount || !payment_date) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Driver ID, amount, and payment date are required' })
        };
      }

      // Get driver name for reference
      const { data: driverData } = await supabase
        .from('drivers')
        .select('name')
        .eq('id', driver_id)
        .single();

      const paymentData = {
        driver_id,
        payer_name: driverData?.name || `Driver ${driver_id}`,
        amount,
        payment_date,
        payment_type: 'Driver Submission',
        payment_status: 'Paid'
      };

      // Add optional fields
      if (week) paymentData.week = week;
      if (month) paymentData.month = month;
      if (description) paymentData.description = description;

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();

      if (error) throw error;

      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Backdated payment recorded',
          data: data[0]
        })
      };
    }

    // DELETE /api/payments/backdating/:id - Delete a backdated payment
    if (httpMethod === 'DELETE' && id === 'backdating' && pathSegments[1]) {
      const paymentId = pathSegments[1];

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Backdated payment deleted' })
      };
    }

    // ========== REGULAR PAYMENTS ==========

    // POST /api/payments - Create payment
    if (httpMethod === 'POST' && !id) {
      const { payer_name, driver_id, amount, payment_type = 'Manual', description, payment_status = 'Paid', week, month, payment_date } = JSON.parse(body);

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
          driver_id: driver_id || null,
          amount,
          payment_type,
          description,
          payment_status,
          week,
          month,
          payment_date: payment_date || new Date().toISOString().split('T')[0]
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
    if (httpMethod === 'DELETE' && id && id !== 'backdating') {
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
