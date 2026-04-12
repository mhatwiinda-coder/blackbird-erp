const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/notifications' : '/api/notifications';
    const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const action = pathSegments[0];

    // GET /api/notifications - Get all notifications for staff
    if (httpMethod === 'GET' && !action) {
      const { role, unread_only } = JSON.parse(body || '{}');

      let query = supabase
        .from('notifications')
        .select('*');

      // Filter by role if provided
      if (role) {
        query = query.or(`target_role.eq.${role},target_role.eq.all`);
      }

      // Filter unread only if requested
      if (unread_only === true) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: data || [],
          count: data?.length || 0
        })
      };
    }

    // GET /api/notifications/pending-count - Get count of pending notifications
    if (httpMethod === 'GET' && action === 'pending-count') {
      const { role } = JSON.parse(body || '{}');

      // Count pending driver submissions
      const { data: submissions, error: submissionError } = await supabase
        .from('driver_submissions')
        .select('id')
        .eq('submission_status', 'Pending');

      if (submissionError) throw submissionError;

      // Count pending RTO approvals
      const { data: rtoPayments, error: rtoError } = await supabase
        .from('rent_to_own_payments')
        .select('*')
        .limit(20);

      if (rtoError) throw rtoError;

      return {
        statusCode: 200,
        body: JSON.stringify({
          pending_submissions: submissions?.length || 0,
          recent_rto_payments: rtoPayments?.length || 0
        })
      };
    }

    // POST /api/notifications/create-submission-alert - Create alert when driver submits
    if (httpMethod === 'POST' && action === 'create-submission-alert') {
      const { submission_id, driver_id, amount } = JSON.parse(body);

      // Get driver name
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('name')
        .eq('id', driver_id)
        .single();

      if (driverError) throw driverError;

      // Create notification for secretary and hr
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          type: 'driver_submission_pending',
          title: `New Payment Submission from ${driver.name}`,
          message: `Driver ${driver.name} submitted K${amount} for approval`,
          target_role: 'all', // Notify both secretary and hr
          data: JSON.stringify({
            submission_id,
            driver_id,
            driver_name: driver.name,
            amount
          }),
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (notificationError) throw notificationError;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Notification created' })
      };
    }

    // POST /api/notifications/create-approval-alert - Create alert when submission approved
    if (httpMethod === 'POST' && action === 'create-approval-alert') {
      const { submission_id, driver_id, amount, approved_by } = JSON.parse(body);

      // Get driver name
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('name')
        .eq('id', driver_id)
        .single();

      if (driverError) throw driverError;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          type: 'driver_submission_approved',
          title: `Payment Approved: ${driver.name}`,
          message: `K${amount} from ${driver.name} has been approved and recorded`,
          target_role: 'all',
          data: JSON.stringify({
            submission_id,
            driver_id,
            driver_name: driver.name,
            amount,
            approved_by
          }),
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (notificationError) throw notificationError;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Approval notification created' })
      };
    }

    // POST /api/notifications/create-rto-payment-alert - Alert for RTO payments
    if (httpMethod === 'POST' && action === 'create-rto-payment-alert') {
      const { agreement_id, driver_id, amount, remaining_balance } = JSON.parse(body);

      // Get driver info
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('name')
        .eq('id', driver_id)
        .single();

      if (driverError) throw driverError;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          type: 'rto_payment_received',
          title: `RTO Payment: ${driver.name}`,
          message: `K${amount} received for RTO agreement. Remaining: K${remaining_balance}`,
          target_role: 'all',
          data: JSON.stringify({
            agreement_id,
            driver_id,
            driver_name: driver.name,
            payment_amount: amount,
            remaining_balance
          }),
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (notificationError) throw notificationError;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'RTO notification created' })
      };
    }

    // POST /api/notifications/:id/mark-read - Mark notification as read
    if (httpMethod === 'POST' && action === 'mark-read') {
      const notificationId = pathSegments[0];

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Notification marked as read' })
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
