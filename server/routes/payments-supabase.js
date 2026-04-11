/**
 * Payments Routes - Using Supabase Backend
 * Added support for:
 * - Payment type (weekly_cash vs rent_to_own)
 * - Backdated payments
 * - Rent-to-own payment tracking
 */

const express = require('express');
const { select, insert, update, delete: deleteRecord, supabase } = require('../supabase-config');
const router = express.Router();

// GET all payments with filters
router.get('/', async (req, res) => {
  try {
    const { driver_id, payment_type, status, is_backdated } = req.query;
    let options = { select: '*' };

    if (driver_id) {
      options.filters = options.filters || {};
      options.filters.driver_id = parseInt(driver_id);
    }

    if (payment_type) {
      options.filters = options.filters || {};
      options.filters.payment_type = payment_type;
    }

    if (is_backdated === 'true') {
      options.filters = options.filters || {};
      options.filters.is_backdated = true;
    }

    let payments = await select('payments', options);

    // Include category info
    for (let payment of payments) {
      const categories = await select('payment_categories', {
        select: '*',
        filters: { payment_id: payment.id }
      });
      payment.categories = categories || [];
    }

    res.json({ data: payments || [] });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single payment with details
router.get('/:id', async (req, res) => {
  try {
    const payments = await select('payments', {
      select: '*',
      filters: { id: parseInt(req.params.id) }
    });

    if (!payments || payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    // Get categories
    const categories = await select('payment_categories', {
      select: '*',
      filters: { payment_id: payment.id }
    });

    payment.categories = categories || [];

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create payment (weekly cash or rent-to-own)
router.post('/', async (req, res) => {
  try {
    const {
      payer_name,
      payment_type = 'weekly_cash',
      driver_id,
      rent_to_own_agreement_id,
      amount,
      description,
      payment_date = new Date().toISOString(),
      is_backdated = false,
      backdated_for_date = null
    } = req.body;

    if (!payer_name || !amount) {
      return res.status(400).json({ error: 'Payer name and amount required' });
    }

    // Insert payment
    const payments = await insert('payments', [{
      payer_name,
      payment_type,
      description,
      amount,
      payment_date,
      payment_status: 'Paid',
      is_backdated,
      backdated_for_date,
      rent_to_own_agreement_id: rent_to_own_agreement_id || null
    }]);

    if (!payments || payments.length === 0) {
      return res.status(500).json({ error: 'Failed to create payment' });
    }

    const paymentId = payments[0].id;

    // Create payment category record if driver_id provided
    if (driver_id) {
      try {
        await insert('payment_categories', [{
          payment_id: paymentId,
          driver_id,
          category_type: payment_type,
          rent_to_own_agreement_id: rent_to_own_agreement_id || null,
          amount,
          payment_date,
          is_backdated,
          backdated_for_date
        }]);
      } catch (catError) {
        console.error('Warning: Could not create category record:', catError);
        // Continue anyway - payment is created
      }
    }

    // If rent-to-own payment, update agreement balance
    if (payment_type === 'rent_to_own' && rent_to_own_agreement_id) {
      try {
        const agreements = await select('rent_to_own_agreements', {
          select: '*',
          filters: { id: rent_to_own_agreement_id }
        });

        if (agreements && agreements.length > 0) {
          const agreement = agreements[0];
          const newPaidAmount = (agreement.paid_amount || 0) + parseFloat(amount);
          const newBalance = Math.max(0, agreement.remaining_balance - parseFloat(amount));

          const updateData = {
            paid_amount: newPaidAmount,
            remaining_balance: newBalance,
            updated_at: new Date().toISOString()
          };

          // If balance is zero or less, mark as completed
          if (newBalance <= 0) {
            updateData.agreement_status = 'Completed';
            updateData.ownership_transferred = true;
            updateData.ownership_transferred_date = new Date().toISOString();
          }

          await update('rent_to_own_agreements', updateData, { id: rent_to_own_agreement_id });

          // Also record in rent_to_own_payments table
          await insert('rent_to_own_payments', [{
            agreement_id: rent_to_own_agreement_id,
            amount_paid: amount,
            payment_date,
            recorded_by: payer_name,
            notes: description
          }]);
        }
      } catch (rtoError) {
        console.error('Warning: Could not update rent-to-own agreement:', rtoError);
      }
    }

    res.json({
      id: paymentId,
      ...payments[0],
      message: 'Payment created successfully'
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST add backdated payment
router.post('/backdating/add', async (req, res) => {
  try {
    const {
      driver_id,
      payment_date,
      amount,
      category_type = 'weekly_cash',
      rent_to_own_agreement_id = null,
      description = 'Backdated payment'
    } = req.body;

    if (!driver_id || !payment_date || !amount) {
      return res.status(400).json({ error: 'Driver ID, payment date, and amount required' });
    }

    // Insert backdating record
    const backdatingRecords = await insert('payment_backdating', [{
      driver_id,
      payment_date,
      amount,
      category_type,
      rent_to_own_agreement_id,
      description,
      is_applied: false
    }]);

    if (!backdatingRecords || backdatingRecords.length === 0) {
      return res.status(500).json({ error: 'Failed to create backdating record' });
    }

    res.json({
      id: backdatingRecords[0].id,
      ...backdatingRecords[0],
      message: 'Backdated payment recorded. Will be applied to driver portal.'
    });
  } catch (error) {
    console.error('Error adding backdated payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET backdated payments for driver
router.get('/backdating/:driver_id', async (req, res) => {
  try {
    const driverId = parseInt(req.params.driver_id);
    const backdatingRecords = await select('payment_backdating', {
      select: '*',
      filters: { driver_id: driverId }
    });

    res.json({ data: backdatingRecords || [] });
  } catch (error) {
    console.error('Error fetching backdating records:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update payment
router.put('/:id', async (req, res) => {
  try {
    const { amount, description, payment_status } = req.body;
    const paymentId = parseInt(req.params.id);

    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (description) updateData.description = description;
    if (payment_status) updateData.payment_status = payment_status;
    updateData.updated_at = new Date().toISOString();

    const result = await update('payments', updateData, { id: paymentId });

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE payment
router.delete('/:id', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    await deleteRecord('payments', { id: paymentId });
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
