/**
 * Migrate payment_submissions from SQLite to Supabase payments
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { insert } = require('./server/supabase-config');

const db = new sqlite3.Database('./blackbird_erp.db');

async function migrate() {
  try {
    console.log('\n🔄 Migrating SQLite payment_submissions to Supabase...\n');

    // Get all approved submissions from SQLite
    const approvedSubmissions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ps.*, d.name as driver_name 
         FROM payment_submissions ps
         JOIN drivers d ON ps.driver_id = d.id
         WHERE ps.submission_status = 'approved' AND ps.driver_id IS NOT NULL`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    console.log(`Found ${approvedSubmissions.length} approved submissions to migrate\n`);

    if (approvedSubmissions.length === 0) {
      console.log('No submissions to migrate');
      db.close();
      return;
    }

    // Insert in batches to avoid overwhelming Supabase
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < approvedSubmissions.length; i += batchSize) {
      const batch = approvedSubmissions.slice(i, i + batchSize);

      const data = batch.map(ps => ({
        payment_date: ps.submission_date,
        payer_name: ps.driver_name,
        payment_type: 'weekly_cash',
        amount: ps.amount,
        week: ps.week,
        driver_id: ps.driver_id,
        payment_status: 'Paid',
        description: ps.notes || `Payment ID: ${ps.id}`,
        created_at: ps.created_at,
        updated_at: ps.updated_at
      }));

      try {
        await insert('payments', data);
        inserted += batch.length;
        console.log(`✅ Inserted ${batch.length} payments (total: ${inserted}/${approvedSubmissions.length})`);
      } catch (err) {
        console.error(`❌ Batch error:`, err.message);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✨ Migration complete: ${inserted} payments synced to Supabase`);
    db.close();

  } catch (err) {
    console.error('Error:', err.message);
    db.close();
  }
}

migrate().then(() => process.exit(0));
setTimeout(() => process.exit(0), 30000);
