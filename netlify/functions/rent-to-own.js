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

      // Flatten nested data for frontend consumption
      const flattened = (data || []).map(a => ({
        id: a.id,
        driver_id: a.driver_id,
        vehicle_id: a.vehicle_id,
        total_price: a.total_price,
        total_amount: a.total_price, // Alias for frontend compatibility
        paid_amount: a.paid_amount,
        remaining_balance: a.remaining_balance,
        agreement_status: a.agreement_status,
        agreement_date: a.agreement_date,
        ownership_transferred: a.ownership_transferred,
        ownership_transferred_date: a.ownership_transferred_date,
        created_at: a.created_at,
        updated_at: a.updated_at,
        driver_name: a.driver?.name || 'Unknown',
        vehicle_name: a.vehicle?.make_model || 'Unknown',
        vehicle_plate: a.vehicle?.plate || 'Unknown'
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({ data: flattened })
      };
    }

    // GET /api/rent-to-own/approvals/pending - Recent pending payments only
    if (httpMethod === 'GET' && segment === 'approvals' && pathSegments[1] === 'pending') {
      const { data: payments, error } = await supabase
        .from('rent_to_own_payments')
        .select(`
          id,
          amount,
          payment_method,
          payment_date,
          approval_status,
          approved_at,
          driver_name,
          vehicle_plate,
          created_at,
          agreement_id,
          agreement:rent_to_own_agreements(total_price, paid_amount, remaining_balance, agreement_status, driver_id, vehicle_id, driver:drivers(name), vehicle:vehicles(plate, make_model))
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Flatten the response for easier frontend consumption
      const flattened = (payments || []).map(p => ({
        id: p.id,
        amount: p.amount,
        payment_amount: p.amount,
        payment_method: p.payment_method,
        payment_date: p.payment_date,
        created_at: p.created_at,
        agreement_id: p.agreement_id,
        driver_name: p.driver_name || p.agreement?.driver?.name || 'Unknown',
        vehicle_plate: p.vehicle_plate || p.agreement?.vehicle?.plate || 'Unknown',
        vehicle_name: p.agreement?.vehicle?.make_model || p.vehicle_plate || 'Unknown',
        total_amount: p.agreement?.total_price || 0,
        paid_amount: p.agreement?.paid_amount || 0,
        remaining_balance: p.agreement?.remaining_balance || 0,
        agreement_status: p.agreement?.agreement_status || 'Active',
        approval_status: p.approval_status || 'pending',
        approved_at: p.approved_at
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

      // Flatten nested data for frontend consistency
      const flattened = {
        id: data.id,
        driver_id: data.driver_id,
        vehicle_id: data.vehicle_id,
        total_price: data.total_price,
        total_amount: data.total_price,
        paid_amount: data.paid_amount,
        remaining_balance: data.remaining_balance,
        agreement_status: data.agreement_status,
        agreement_date: data.agreement_date,
        ownership_transferred: data.ownership_transferred,
        ownership_transferred_date: data.ownership_transferred_date,
        created_at: data.created_at,
        updated_at: data.updated_at,
        driver_name: data.driver?.name || 'Unknown',
        vehicle_name: data.vehicle?.make_model || 'Unknown',
        vehicle_plate: data.vehicle?.plate || 'Unknown',
        payment_history: payments || []
      };

      return {
        statusCode: 200,
        body: JSON.stringify(flattened)
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

    // POST /api/rent-to-own/:id/record-payment - Submit payment for approval (driver) or record immediately (admin)
    if (httpMethod === 'POST' && id && pathSegments[1] === 'record-payment') {
      const { amount, payment_method, payment_date, notes } = JSON.parse(body);

      // Validate amount
      if (!amount || amount <= 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Amount must be greater than 0' })
        };
      }

      // Get current agreement
      const agreementId = parseInt(segment);
      const { data: agreement, error: agreeError } = await supabase
        .from('rent_to_own_agreements')
        .select('*')
        .eq('id', agreementId)
        .single();

      if (agreeError) throw agreeError;
      if (!agreement) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Agreement not found' })
        };
      }

      const now = new Date().toISOString();

      // Determine if this is admin entry (has payment_method) or driver submission (no payment_method)
      const isAdminEntry = !!payment_method;
      const approvalStatus = isAdminEntry ? 'approved' : 'pending';

      // Record payment (excluding notes due to Supabase schema cache issue)
      const paymentData = {
        agreement_id: agreementId,
        amount,
        payment_method: payment_method || 'driver_submission',
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        approval_status: approvalStatus,
        created_at: now
      };

      // Only add optional fields if provided
      if (isAdminEntry) {
        paymentData.approved_at = now;
      }

      const { data: payment, error: payError } = await supabase
        .from('rent_to_own_payments')
        .insert([paymentData])
        .select();

      if (payError) throw payError;

      let responseData = {
        message: isAdminEntry
          ? 'Payment recorded and agreement updated'
          : 'Payment submitted for approval',
        payment: payment[0],
        agreement_id: agreementId
      };

      // Only update agreement if admin is recording it manually
      if (isAdminEntry) {
        const new_paid = agreement.paid_amount + amount;
        const new_remaining = Math.max(0, agreement.remaining_balance - amount);
        const is_completed = new_remaining <= 0;

        const updateData = {
          paid_amount: new_paid,
          remaining_balance: new_remaining
        };

        if (is_completed) {
          updateData.agreement_status = 'Completed';
          updateData.ownership_transferred = true;
          updateData.ownership_transferred_date = now;
        }

        const { data: updated, error: updateError } = await supabase
          .from('rent_to_own_agreements')
          .update(updateData)
          .eq('id', agreementId)
          .select();

        if (updateError) throw updateError;

        responseData.agreement_updated = {
          paid_amount: new_paid,
          remaining_balance: new_remaining,
          agreement_status: is_completed ? 'Completed' : 'Active'
        };
      }

      return {
        statusCode: isAdminEntry ? 200 : 201,
        body: JSON.stringify(responseData)
      };
    }

    // DELETE /api/rent-to-own/:id - Delete agreement (with cascade cleanup)
    if (httpMethod === 'DELETE' && segment && !isNaN(segment) && !id) {
      const agreementId = parseInt(segment);

      // First delete all related payments (cascade cleanup)
      const { error: paymentDeleteError } = await supabase
        .from('rent_to_own_payments')
        .delete()
        .eq('agreement_id', agreementId);

      if (paymentDeleteError) throw paymentDeleteError;

      // Then delete the agreement
      const { error } = await supabase
        .from('rent_to_own_agreements')
        .delete()
        .eq('id', agreementId);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Agreement and related payments deleted' })
      };
    }

    // POST /api/rent-to-own/:agreement_id/approve-payment/:payment_id - Approve RTO payment
    if (httpMethod === 'POST' && segment && !isNaN(segment) && id === 'approve-payment' && pathSegments[2]) {
      const agreementId = parseInt(segment);
      const paymentId = parseInt(pathSegments[2]);

      // Fetch the payment to get amount
      const { data: payment, error: fetchPaymentError } = await supabase
        .from('rent_to_own_payments')
        .select('amount')
        .eq('id', paymentId)
        .eq('agreement_id', agreementId)
        .single();

      if (fetchPaymentError) throw fetchPaymentError;

      // Fetch current agreement balances
      const { data: agreement, error: fetchAgreementError } = await supabase
        .from('rent_to_own_agreements')
        .select('paid_amount, remaining_balance')
        .eq('id', agreementId)
        .single();

      if (fetchAgreementError) throw fetchAgreementError;

      // Calculate new balances
      const newPaid = (agreement.paid_amount || 0) + payment.amount;
      const newRemaining = Math.max(0, (agreement.remaining_balance || 0) - payment.amount);
      const isCompleted = newRemaining <= 0;

      // Update payment approval status to approved
      const { data: updated, error: updateError } = await supabase
        .from('rent_to_own_payments')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('agreement_id', agreementId)
        .select();

      if (updateError) throw updateError;

      // Update agreement balances and status
      const updateData = {
        paid_amount: newPaid,
        remaining_balance: newRemaining
      };

      if (isCompleted) {
        updateData.agreement_status = 'Completed';
        updateData.ownership_transferred = true;
        updateData.ownership_transferred_date = new Date().toISOString();
      }

      const { error: updateAgreementError } = await supabase
        .from('rent_to_own_agreements')
        .update(updateData)
        .eq('id', agreementId);

      if (updateAgreementError) throw updateAgreementError;

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Payment approved and agreement updated',
          data: updated?.[0],
          agreement_updated: {
            paid_amount: newPaid,
            remaining_balance: newRemaining,
            agreement_status: isCompleted ? 'Completed' : 'Active'
          }
        })
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

    // DELETE /api/rent-to-own/:agreement_id/delete-payment/:payment_id - Delete an RTO payment and reverse balance
    if (httpMethod === 'DELETE' && segment && !isNaN(segment) && id === 'delete-payment' && pathSegments[2]) {
      const agreementId = parseInt(segment);
      const paymentId = parseInt(pathSegments[2]);

      // Fetch the payment to get the amount
      const { data: payment, error: fetchError } = await supabase
        .from('rent_to_own_payments')
        .select('amount')
        .eq('id', paymentId)
        .eq('agreement_id', agreementId)
        .single();

      if (fetchError) throw fetchError;
      if (!payment) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Payment not found' })
        };
      }

      // Delete the payment
      const { error: deleteError } = await supabase
        .from('rent_to_own_payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) throw deleteError;

      // Fetch current agreement balances to reverse them
      const { data: agreement } = await supabase
        .from('rent_to_own_agreements')
        .select('paid_amount, remaining_balance, agreement_status, ownership_transferred')
        .eq('id', agreementId)
        .single();

      if (agreement) {
        const updateData = {
          paid_amount: Math.max(0, agreement.paid_amount - payment.amount),
          remaining_balance: (agreement.remaining_balance || 0) + payment.amount
        };

        // If agreement was completed due to this payment, mark it as active again
        if (agreement.agreement_status === 'Completed' && agreement.ownership_transferred) {
          updateData.agreement_status = 'Active';
          updateData.ownership_transferred = false;
          updateData.ownership_transferred_date = null;
        }

        await supabase
          .from('rent_to_own_agreements')
          .update(updateData)
          .eq('id', agreementId);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Payment deleted and balance reversed' })
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
