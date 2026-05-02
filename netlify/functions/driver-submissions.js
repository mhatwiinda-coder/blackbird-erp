const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/driver-submissions' : '/api/driver-submissions';
    const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const id = pathSegments[0];
    const action = pathSegments[1];

    // GET /api/driver-submissions - List all driver submissions
    if (httpMethod === 'GET' && !id) {
      const { status, limit = 20, offset = 0, start_date, end_date } = queryStringParameters || {};

      let query = supabase
        .from('driver_submissions')
        .select(`
          id,
          driver_id,
          submission_date,
          amount,
          week,
          month,
          notes,
          submission_status,
          approved_by_role,
          approval_date,
          rejection_reason,
          driver:drivers(id, name)
        `);

      if (status) query = query.eq('submission_status', status);
      if (start_date) query = query.gte('submission_date', start_date);
      if (end_date) query = query.lte('submission_date', end_date);

      const { data, error } = await query
        .order('submission_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], count: data?.length || 0 })
      };
    }

    // GET /api/driver-submissions/my-submissions - Get current driver's submissions
    if (httpMethod === 'GET' && pathSegments[0] === 'my-submissions') {
      const { driver_id, status, limit = 20, offset = 0, start_date, end_date } = queryStringParameters || {};

      // Require driver_id parameter
      if (!driver_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'driver_id parameter required' })
        };
      }

      // Get token for validation
      const token = event.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Authorization required' })
        };
      }

      // Filter by driver_id to return only this driver's submissions
      let query = supabase
        .from('driver_submissions')
        .select(`
          id,
          driver_id,
          submission_date,
          amount,
          week,
          month,
          notes,
          submission_status,
          approved_by_role,
          approval_date,
          rejection_reason,
          driver:drivers(id, name)
        `)
        .eq('driver_id', parseInt(driver_id));

      if (status) query = query.eq('submission_status', status);
      if (start_date) query = query.gte('submission_date', start_date);
      if (end_date) query = query.lte('submission_date', end_date);

      const { data, error } = await query
        .order('submission_date', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data || [], count: data?.length || 0 })
      };
    }

    // GET /api/driver-submissions/:id - Get single driver submission
    if (httpMethod === 'GET' && id && !action) {
      const { data, error } = await supabase
        .from('driver_submissions')
        .select(`
          *,
          driver:drivers(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data })
      };
    }

    // POST /api/driver-submissions - Submit new driver submission
    if (httpMethod === 'POST' && !id) {
      const { driver_id, amount, week, month, notes, submission_date, submission_type, agreement_id } = JSON.parse(body);

      if (!driver_id || !amount) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Driver ID and amount required' })
        };
      }

      if (amount <= 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Amount must be greater than 0' })
        };
      }

      const insertData = {
        driver_id,
        amount,
        week,
        month,
        notes,
        submission_date: submission_date || new Date().toISOString().split('T')[0],
        submission_status: 'Pending',
        created_at: new Date().toISOString()
      };

      // Add optional fields if they exist in schema
      if (submission_type) {
        insertData.submission_type = submission_type;
      }
      if (submission_type === 'rto' && agreement_id) {
        insertData.agreement_id = agreement_id;
      }

      const { data, error } = await supabase
        .from('driver_submissions')
        .insert([insertData])
        .select();

      if (error) throw error;
      return {
        statusCode: 201,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // PUT /api/driver-submissions/:id - Update driver submission
    if (httpMethod === 'PUT' && id && !action) {
      const updateData = JSON.parse(body);

      const { data, error } = await supabase
        .from('driver_submissions')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0] })
      };
    }

    // DELETE /api/driver-submissions/:id - Delete driver submission
    if (httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('driver_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Driver submission deleted' })
      };
    }

    // POST /api/driver-submissions/:id/approve - Approve driver submission
    if (httpMethod === 'POST' && id && action === 'approve') {
      const { approvedByRole } = JSON.parse(body || '{}');

      // Fetch submission with driver details
      const { data: submission, error: fetchError } = await supabase
        .from('driver_submissions')
        .select(`*,driver:drivers(id, name)`)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const driverName = submission.driver?.name || `Driver ${submission.driver_id}`;
      const now = new Date().toISOString();

      // Prepare update data for submission
      const updateData = {
        submission_status: 'Approved'
      };

      // Only update approval fields if they exist in the schema
      if ('approved_by_role' in submission || !submission.approved_by_role) {
        updateData.approved_by_role = approvedByRole;
        updateData.approval_date = now;
      }

      // Update submission status to Approved
      const { error: updateError } = await supabase
        .from('driver_submissions')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Handle different submission types
      let createdPayment = null;
      let createdRtoPayment = null;

      // Check if submission_type exists and is 'rto'
      const isRto = submission?.submission_type === 'rto' && submission?.agreement_id;

      if (isRto) {
        // For RTO submissions, create rent_to_own_payments entry
        const { data: rtoPayment, error: rtoPaymentError } = await supabase
          .from('rent_to_own_payments')
          .insert([{
            agreement_id: submission.agreement_id,
            amount: submission.amount,
            payment_method: 'driver_submission',
            payment_date: submission.submission_date,
            created_at: now
          }])
          .select();

        if (rtoPaymentError) {
          console.error('RTO Payment Error:', rtoPaymentError);
          // Continue even if RTO payment creation fails
        } else {
          createdRtoPayment = rtoPayment?.[0];

          // Update RTO agreement with new payment info
          const { data: agreement, error: agreeError } = await supabase
            .from('rent_to_own_agreements')
            .select('paid_amount, remaining_balance')
            .eq('id', submission.agreement_id)
            .single();

          if (!agreeError && agreement) {
            const newPaid = (agreement.paid_amount || 0) + submission.amount;
            const newRemaining = Math.max(0, (agreement.remaining_balance || 0) - submission.amount);
            const isCompleted = newRemaining <= 0;

            const { error: updateRtoError } = await supabase
              .from('rent_to_own_agreements')
              .update({
                paid_amount: newPaid,
                remaining_balance: newRemaining,
                ...(isCompleted && {
                  agreement_status: 'Completed',
                  ownership_transferred: true,
                  ownership_transferred_date: now
                })
              })
              .eq('id', submission.agreement_id);

            if (updateRtoError) console.error('RTO Update Error:', updateRtoError);
          }
        }
      } else {
        // For weekly submissions, create payments entry (default)
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert([{
            payer_name: driverName,
            amount: submission.amount,
            payment_type: 'Driver Weekly Cashing',
            description: submission.notes || 'Weekly driver submission',
            week: submission.week,
            payment_date: submission.submission_date,
            payment_status: 'Paid',
            created_at: now
          }])
          .select();

        if (paymentError) {
          console.error('Payment Error:', paymentError);
          throw paymentError;
        }
        createdPayment = payment?.[0];
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Submission approved and payment recorded',
          data: {
            submission_id: id,
            submission_status: 'Approved',
            submission_type: submission.submission_type || 'weekly',
            payment: createdPayment || createdRtoPayment
          }
        })
      };
    }

    // POST /api/driver-submissions/:id/reject - Reject driver submission
    if (httpMethod === 'POST' && id && action === 'reject') {
      const { rejectionReason, approvedByRole } = JSON.parse(body || '{}');
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('driver_submissions')
        .update({
          submission_status: 'Rejected',
          rejection_reason: rejectionReason || 'Rejected by staff',
          approved_by_role: approvedByRole,
          approval_date: now
        })
        .eq('id', id);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Submission rejected', rejection_reason: rejectionReason })
      };
    }

    // PATCH /api/driver-submissions/:id - Edit driver submission
    if (httpMethod === 'PATCH' && id && !action) {
      const updateData = JSON.parse(body);

      // Only allow editing if still pending
      const { data: submission, error: fetchError } = await supabase
        .from('driver_submissions')
        .select('submission_status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (submission.submission_status !== 'Pending') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Can only edit pending submissions' })
        };
      }

      const { data, error } = await supabase
        .from('driver_submissions')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ data: data[0], message: 'Submission updated' })
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
