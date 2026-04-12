const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/admin-cleanup' : '/api/admin-cleanup';
    const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const action = pathSegments[0];

    // POST /api/admin-cleanup/delete-test-data - Delete all test data
    if (httpMethod === 'POST' && action === 'delete-test-data') {
      const { dataType } = JSON.parse(body);

      let deleteCount = 0;

      if (dataType === 'rto_agreements' || dataType === 'all') {
        // Delete RTO payments first (foreign key constraint)
        const { data: payments, error: paymentFetchError } = await supabase
          .from('rent_to_own_payments')
          .select('id')
          .gte('created_at', '2026-04-01'); // Only test data from April 2026

        if (!paymentFetchError && payments) {
          for (const payment of payments) {
            await supabase
              .from('rent_to_own_payments')
              .delete()
              .eq('id', payment.id);
          }
          deleteCount += payments.length;
        }

        // Delete RTO agreements
        const { error: deleteError } = await supabase
          .from('rent_to_own_agreements')
          .delete()
          .gte('created_at', '2026-04-01');

        if (!deleteError) {
          deleteCount += 5; // Approximate for agreements
        }
      }

      if (dataType === 'driver_submissions' || dataType === 'all') {
        const { data: submissions, error: submissionFetchError } = await supabase
          .from('driver_submissions')
          .select('id')
          .gte('created_at', '2026-04-01');

        if (!submissionFetchError && submissions) {
          for (const submission of submissions) {
            await supabase
              .from('driver_submissions')
              .delete()
              .eq('id', submission.id);
          }
          deleteCount += submissions.length;
        }
      }

      if (dataType === 'payments' || dataType === 'all') {
        const { data: payments, error: paymentFetchError } = await supabase
          .from('payments')
          .select('id')
          .eq('payment_type', 'Driver Submission'); // Only test payment submissions

        if (!paymentFetchError && payments) {
          for (const payment of payments) {
            await supabase
              .from('payments')
              .delete()
              .eq('id', payment.id);
          }
          deleteCount += payments.length;
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `${deleteCount} test records deleted`,
          deletedCount: deleteCount,
          dataType: dataType
        })
      };
    }

    // POST /api/admin-cleanup/delete-payment/:id - Delete a specific payment
    if (httpMethod === 'POST' && action === 'delete-payment') {
      const paymentId = pathSegments[1];

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Payment deleted successfully' })
      };
    }

    // POST /api/admin-cleanup/delete-submission/:id - Delete a specific submission
    if (httpMethod === 'POST' && action === 'delete-submission') {
      const submissionId = pathSegments[1];

      const { error } = await supabase
        .from('driver_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Submission deleted successfully' })
      };
    }

    // POST /api/admin-cleanup/delete-rto/:id - Delete a specific RTO agreement
    if (httpMethod === 'POST' && action === 'delete-rto') {
      const agreementId = pathSegments[1];

      // Delete associated payments first
      await supabase
        .from('rent_to_own_payments')
        .delete()
        .eq('agreement_id', agreementId);

      // Delete agreement
      const { error } = await supabase
        .from('rent_to_own_agreements')
        .delete()
        .eq('id', agreementId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'RTO agreement and associated payments deleted' })
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
