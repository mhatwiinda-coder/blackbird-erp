const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/rent-to-own' : '/api/rent-to-own';
    const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const segment = pathSegments[0];
    const id = pathSegments[1];

    // GET /api/rent-to-own - List all agreements
    if (httpMethod === 'GET' && !segment) {
      const { status, driver_id, vehicle_id, search } = queryStringParameters || {};

      let query = supabase
        .from('rent_to_own_agreements')
        .select(`
          *,
          driver:drivers(name),
          vehicle:vehicles(plate, make_model)
        `);

      if (status) query = query.eq('agreement_status', status);
      if (driver_id) query = query.eq('driver_id', driver_id);
      if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [] })
      };
    }

    // GET /api/rent-to-own/approvals/pending - Pending approvals
    if (httpMethod === 'GET' && segment === 'approvals' && pathSegments[1] === 'pending') {
      const { data, error } = await supabase
        .from('rent_to_own_payments')
        .select(`
          *,
          agreement:rent_to_own_agreements(total_amount, paid_amount, remaining_balance, agreement_status, driver:drivers(name), vehicle:vehicles(plate, make_model))
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], count: data?.length || 0 })
      };
    }

    // GET /api/rent-to-own/:id - Single agreement
    if (httpMethod === 'GET' && id && !segment) {
      const { data, error } = await supabase
        .from('rent_to_own_agreements')
        .select(`
          *,
          driver:drivers(name),
          vehicle:vehicles(plate, make_model)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get payment history
      const { data: payments, error: paymentError } = await supabase
        .from('rent_to_own_payments')
        .select('*')
        .eq('agreement_id', id)
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      return {
        statusCode: 200,
        body: JSON.stringify({ ...data, payment_history: payments || [] })
      };
    }

    // POST /api/rent-to-own - Create agreement
    if (httpMethod === 'POST' && !segment) {
      const { driver_id, vehicle_id, total_amount, down_payment } = JSON.parse(body);

      if (!driver_id || !vehicle_id || !total_amount) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      const remaining_balance = total_amount - (down_payment || 0);
      const paid_amount = down_payment || 0;

      const { data, error } = await supabase
        .from('rent_to_own_agreements')
        .insert([{
          driver_id,
          vehicle_id,
          total_amount,
          paid_amount,
          remaining_balance,
          agreement_status: 'Active',
          agreement_date: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT /api/rent-to-own/:id - Update agreement
    if (httpMethod === 'PUT' && id && !segment) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('rent_to_own_agreements')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // POST /api/rent-to-own/:id/record-payment - Record payment
    if (httpMethod === 'POST' && id && pathSegments[1] === 'record-payment') {
      const { payment_amount, notes } = JSON.parse(body);

      // Get current agreement
      const { data: agreement, error: agreeError } = await supabase
        .from('rent_to_own_agreements')
        .select('*')
        .eq('id', id)
        .single();

      if (agreeError) throw agreeError;

      const new_paid = agreement.paid_amount + payment_amount;
      const new_remaining = agreement.remaining_balance - payment_amount;
      const is_completed = new_remaining <= 0;

      // Record payment
      const { data: payment, error: payError } = await supabase
        .from('rent_to_own_payments')
        .insert([{
          agreement_id: id,
          driver_id: agreement.driver_id,
          payment_amount,
          notes,
          approval_status: 'approved',
          created_at: new Date().toISOString()
        }])
        .select();

      if (payError) throw payError;

      // Update agreement
      const updateData = {
        paid_amount: new_paid,
        remaining_balance: new_remaining
      };

      if (is_completed) {
        updateData.agreement_status = 'Completed';
        updateData.ownership_transferred = true;
        updateData.ownership_transferred_date = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await supabase
        .from('rent_to_own_agreements')
        .update(updateData)
        .eq('id', id)
        .select();

      if (updateError) throw updateError;

      return {
        statusCode: 200,
        body: JSON.stringify({ data: updated[0], payment: payment[0] })
      };
    }

    // POST /api/rent-to-own/:id/approve-payment/:payment_id
    if (httpMethod === 'POST' && id && pathSegments[1] === 'approve-payment') {
      const payment_id = pathSegments[2];

      const { data, error } = await supabase
        .from('rent_to_own_payments')
        .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', payment_id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // POST /api/rent-to-own/:id/reject-payment/:payment_id
    if (httpMethod === 'POST' && id && pathSegments[1] === 'reject-payment') {
      const payment_id = pathSegments[2];
      const { rejection_reason } = JSON.parse(body);

      const { data, error } = await supabase
        .from('rent_to_own_payments')
        .update({
          approval_status: 'rejected',
          rejection_reason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', payment_id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // DELETE /api/rent-to-own/:id
    if (httpMethod === 'DELETE' && id && !segment) {
      const { error } = await supabase
        .from('rent_to_own_agreements')
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
