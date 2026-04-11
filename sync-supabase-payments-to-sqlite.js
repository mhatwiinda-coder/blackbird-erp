/**
 * Sync payments from Supabase to SQLite payment_submissions
 * This handles the historical payments migrated from Excel
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { select } = require('./server/supabase-config');

const db = new sqlite3.Database('./blackbird_erp.db');

async function syncPayments() {
  try {
    console.log('\n📊 Syncing Supabase payments to SQLite...\n');

    // Get all payments from Supabase that have driver_id
    const payments = await select('payments', {
      select: '*',
      filters: { driver_id: null } // Use opposite - get ones without null
    });

    // Actually, let's get all and filter
    const allPayments = await select('payments', { select: '*' });
    console.log(`Found ${allPayments.length} total payments in Supabase`);

    const paymentsWithDriverId = allPayments.filter(p => p.driver_id);
    console.log(`${paymentsWithDriverId.length} have driver_id assigned\n`);

    if (paymentsWithDriverId.length === 0) {
      console.log('⚠️  No payments with driver_id found in Supabase');
      console.log('Payments in Supabase may have payer_name instead of driver_id');
      console.log('\nTo fix this, you need to:');
      console.log('1. Go to Supabase > SQL Editor');
      console.log('2. Update driver_id based on payer_name matching drivers.name:');
      console.log('\n   UPDATE payments SET driver_id = drivers.id');
      console.log('   FROM drivers');
      console.log('   WHERE LOWER(payments.payer_name) = LOWER(drivers.name)');
      db.close();
      return;
    }

    // Sync to SQLite
    let synced = 0;
    let failed = 0;

    for (const payment of paymentsWithDriverId) {
      try {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO payment_submissions 
             (driver_id, submission_date, amount, week, notes, submission_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              payment.driver_id,
              payment.payment_date,
              payment.amount,
              payment.week || null,
              payment.description,
              'approved', // Historical payments are already approved
              payment.created_at,
              payment.updated_at
            ],
            (err) => {
              if (err) {
                console.error(`  ❌ Driver ${payment.driver_id}: ${err.message}`);
                failed++;
                reject(err);
              } else {
                console.log(`  ✅ Driver ${payment.driver_id}: ZMW${payment.amount}`);
                synced++;
                resolve();
              }
            }
          );
        });
      } catch (err) {
        // Continue on error
      }
    }

    console.log(`\n✨ Sync complete: ${synced} synced, ${failed} failed`);
    db.close();

  } catch (err) {
    console.error('Fatal error:', err);
    db.close();
    process.exit(1);
  }
}

syncPayments().then(() => {
  process.exit(0);
});

setTimeout(() => {
  console.log('Timeout');
  process.exit(0);
}, 10000);
