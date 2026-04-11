/**
 * Sync payments from Supabase to SQLite payment_submissions
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { select } = require('./server/supabase-config');

const db = new sqlite3.Database('./blackbird_erp.db');

async function syncPayments() {
  try {
    console.log('\n📊 Syncing Supabase payments to SQLite...\n');

    // Get all payments from Supabase
    const allPayments = await select('payments', { select: '*' });
    console.log(`Found ${allPayments.length} total payments in Supabase\n`);

    const paymentsWithDriverId = allPayments.filter(p => p.driver_id);
    console.log(`Payments with driver_id: ${paymentsWithDriverId.length}`);
    console.log(`Payments without driver_id: ${allPayments.length - paymentsWithDriverId.length}\n`);

    if (paymentsWithDriverId.length === 0) {
      console.log('⚠️  No payments have driver_id in Supabase');
      console.log('The system needs driver_id populated to sync properly.');
      db.close();
      return;
    }

    console.log('Starting sync...\n');

    let synced = 0;
    for (const payment of paymentsWithDriverId) {
      db.run(
        `INSERT OR IGNORE INTO payment_submissions 
         (driver_id, submission_date, amount, week, notes, submission_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payment.driver_id,
          payment.payment_date,
          payment.amount,
          payment.week || null,
          payment.description || null,
          'approved',
          payment.created_at,
          payment.updated_at
        ],
        (err) => {
          if (!err) {
            console.log(`✅ Driver ${payment.driver_id}: ZMW${payment.amount}`);
            synced++;
          }
        }
      );
    }

    setTimeout(() => {
      console.log(`\n✨ Synced ${synced} payments to SQLite`);
      db.close();
    }, 2000);

  } catch (err) {
    console.error('Error:', err.message);
    db.close();
  }
}

syncPayments();
