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

    // GET /api/rent-to-own/approvals/pending - Recent pending payments
    if (httpMethod === 'GET' && segment === 'approvals' && pathSegments[1] === 'pending') {
      const { data: payments, error } = await supabase
        .from('rent_to_own_payments')
        .select(`
          id,
          amount,
          payment_method,
          payment_date,
          created_at,
          agreement_id,
          agreement:rent_to_own_agreements(total_price, paid_amount, remaining_balance, agreement_status, driver_id, vehicle_id, driver:drivers(id, name), vehicle:vehicles(id, plate, make_model))
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Flatten the response for easier frontend consumption
      const flattened = (payments || []).map(p => ({
        id: p.id,
        payment_amount: p.amount,
        payment_method: p.payment_method,
        payment_date: p.payment_date,
        created_at: p.created_at,
        agreement_id: p.agreement_id,
        driver_name: p.agreement?.driver?.name || 'Unknown',
        vehicle_name: p.agreement?.vehicle?.plate || 'Unknown',
        total_amount: p.agreement?.total_price || 0,
        paid_amount: p.agreement?.paid_amount || 0,
        remaining_balance: p.agreement?.remaining_balance || 0,
        agreement_status: p.agreement?.agreement_status || 'Active'
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({ data: flattened, count: flattened?.length || 0 })
      };
    }

    // GET /api/rent-to-own/available-drivers - Get all drivers for dropdown
    if (httpMethod === 'GET' && segment === 'available-drivers') {
      const { data: drivers, error: driverError } = await supabase
        .from('drivers')
        .select('id, name')
        .order('name', { ascending: true });

      if (driverError) throw driverError;

      return {
        statusCode: 200,
        body: JSON.stringify({ data: drivers || [] })
      };
    }

    // GET /api/rent-to-own/available-vehicles - Get all vehicles for dropdown
    if (httpMethod === 'GET' && segment === 'available-vehicles') {
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, plate, make_model')
        .order('plate', { ascending: true });

      if (vehicleError) throw vehicleError;

      return {
        statusCode: 200,
        body: JSON.stringify({ data: vehicles || [] })
      };
    }

    // GET /api/rent-to-own/:id - Single agreement with payment history
    if (httpMethod === 'GET' && segment && !isNaN(segment) && !id) {
      const { data, error } = await supabase
        .from('rent_to_own_agreements')
        .select(`
          *,
          driver:drivers(name),
          vehicle:vehicles(plate, make_model)
        `)
        .eq('id', parseInt(segment))
        .single();

      if (error) throw error;

      // Get payment history
      const { data: payments, error: paymentError } = await supabase
        .from('rent_to_own_payments')
        .select('*')
        .eq('agreement_id', parseInt(segment))
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;

      return {
        statusCode: 200,
        body: JSON.stringify({ ...data, payment_history: payments || [] })
      };
    }

    // POST /api/rent-to-own - Create agreement
    if (httpMethod === 'POST' && !segment) {
      const { driver_id, vehicle_id, total_amount, monthly_installment, start_date, expected_completion_date, notes } = JSON.parse(body);

      if (!driver_id || !vehicle_id || !total_amount) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields: driver_id, vehicle_id, total_amount' })
        };
      }

      const remaining_balance = total_amount;
      const paid_amount = 0;

      const { data, error } = await supabase
        .from('rent_to_own_agreements')
        .insert([{
          driver_id,
          vehicle_id,
          total_price: total_amount,
          paid_amount,
          remaining_balance,
          agreement_status: 'Active',
          agreement_date: start_date || new Date().toISOString().split('T')[0]
        }])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT /api/rent-to-own/:id - Update agreement
    if (httpMethod === 'PUT' && segment && !isNaN(segment) && !id) {
      const updateData = JSON.parse(body);
      const agreementId = parseInt(segment);

      const { data, error } = await supabase
        .from('rent_to_own_agreements')
        .update(updateData)
        .eq('id', agreementId)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // POST /api/rent-to-own/:id/record-payment - Record payment
    if (httpMethod === 'POST' && id && pathSegments[1] === 'record-payment') {
      const { amount, payment_method } = JSON.parse(body);

      // Get current agreement (use segment as agreement ID, not id)
      const agreementId = parseInt(segment);
      const { data: agreement, error: agreeError } = await supabase
        .from('rent_to_own_agreements')
        .select('*')
        .eq('id', agreementId)
        .single();

      if (agreeError) throw agreeError;

      const new_paid = agreement.paid_amount + amount;
      const new_remaining = agreement.remaining_balance - amount;
      const is_completed = new_remaining <= 0;

      // Record payment
      const { data: payment, error: payError } = await supabase
        .from('rent_to_own_payments')
        .insert([{
          agreement_id: agreementId,
          amount,
          payment_method: payment_method || 'cash',
          payment_date: new Date().toISOString().split('T')[0],
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
        .eq('id', agreementId)
        .select();

      if (updateError) throw updateError;

      return {
        statusCode: 200,
        body: JSON.stringify({ data: updated[0], payment: payment[0] })
      };
    }

    // DELETE /api/rent-to-own/:id - Delete agreement
    if (httpMethod === 'DELETE' && segment && !isNaN(segment) && !id) {
      const agreementId = parseInt(segment);
      const { error } = await supabase
        .from('rent_to_own_agreements')
        .delete()
        .eq('id', agreementId);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Agreement deleted' })
      };
    }

    // POST /api/rent-to-own/:agreement_id/approve-payment/:payment_id - Approve RTO payment
    if (httpMethod === 'POST' && segment && !isNaN(segment) && id === 'approve-payment' && pathSegments[2]) {
      const agreementId = parseInt(segment);
      const paymentId = parseInt(pathSegments[2]);

      // Mark payment as approved (update rent_to_own_payments if it has approval status)
      // For now, just return success - the payment was already recorded
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Payment approved' })
      };
    }

    // POST /api/rent-to-own/:agreement_id/reject-payment/:payment_id - Reject RTO payment
    if (httpMethod === 'POST' && segment && !isNaN(segment) && id === 'reject-payment' && pathSegments[2]) {
      const agreementId = parseInt(segment);
      const paymentId = parseInt(pathSegments[2]);
      const { rejectionReason } = JSON.parse(body || '{}');

      // Delete the payment record and reverse the agreement balance
      const { data: payment, error: fetchError } = await supabase
        .from('rent_to_own_payments')
        .select('amount')
        .eq('id', paymentId)
        .eq('agreement_id', agreementId)
        .single();

      if (fetchError) throw fetchError;

      // Delete payment
      const { error: deleteError } = await supabase
        .from('rent_to_own_payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) throw deleteError;

      // Reverse the agreement balance
      const { data: agreement } = await supabase
        .from('rent_to_own_agreements')
        .select('paid_amount, remaining_balance')
        .eq('id', agreementId)
        .single();

      if (agreement) {
        await supabase
          .from('rent_to_own_agreements')
          .update({
            paid_amount: agreement.paid_amount - payment.amount,
            remaining_balance: agreement.remaining_balance + payment.amount
          })
          .eq('id', agreementId);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Payment rejected and reversed' })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
