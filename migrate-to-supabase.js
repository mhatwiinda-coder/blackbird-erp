/**
 * BLACKBIRD ERP - SQLite to Supabase Migration Script
 *
 * BEFORE RUNNING:
 * 1. Create a .env file with:
 *    SUPABASE_URL=https://your-project.supabase.co
 *    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *
 * 2. Run: npm install @supabase/supabase-js
 * 3. Run: node migrate-to-supabase.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('Add these to your .env file and try again');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sqliteDb = new sqlite3.Database('./blackbird_erp.db', (err) => {
  if (err) {
    console.error('❌ SQLite connection error:', err.message);
    process.exit(1);
  }
});

// Tables to migrate (in order to respect foreign keys)
const TABLES = [
  'drivers',
  'vehicles',
  'users',
  'quotations',
  'invoices',
  'payments',
  'jobs',
  'rent_to_own_agreements',
  'rent_to_own_payments',
  'driver_submissions'
];

let migrationStats = {
  total: 0,
  success: 0,
  failed: 0,
  errors: []
};

async function migrateData() {
  console.log('\n🚀 Starting Supabase Migration...\n');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  for (const table of TABLES) {
    await migrateTable(table);
  }

  printSummary();
}

async function migrateTable(tableName) {
  return new Promise((resolve) => {
    sqliteDb.all(`SELECT * FROM ${tableName}`, [], async (err, rows) => {
      if (err) {
        console.log(`⚠️  Skipped ${tableName} (table not found)`);
        return resolve();
      }

      if (!rows || rows.length === 0) {
        console.log(`⊘ ${tableName} is empty`);
        return resolve();
      }

      console.log(`\n📦 Migrating ${tableName}...`);
      console.log(`   Found ${rows.length} rows`);

      let tableSuccess = 0;
      let tableFailed = 0;

      // Migrate in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);

        try {
          const { error } = await supabase
            .from(tableName)
            .insert(batch, { returning: 'minimal' });

          if (error) {
            // If insert fails due to duplicates, try upsert
            if (error.code === '23505') {
              console.log(`   ℹ️  Duplicate keys detected, attempting upsert...`);
              const { error: upsertError } = await supabase
                .from(tableName)
                .upsert(batch, { onConflict: 'id', returning: 'minimal' });

              if (upsertError) {
                console.error(`   ✗ Batch ${Math.floor(i/100)+1}: ${upsertError.message}`);
                tableFailed += batch.length;
                migrationStats.errors.push({ table: tableName, error: upsertError.message });
              } else {
                tableSuccess += batch.length;
              }
            } else {
              console.error(`   ✗ Batch ${Math.floor(i/100)+1}: ${error.message}`);
              tableFailed += batch.length;
              migrationStats.errors.push({ table: tableName, error: error.message });
            }
          } else {
            tableSuccess += batch.length;
          }
        } catch (err) {
          console.error(`   ✗ Batch ${Math.floor(i/100)+1}: ${err.message}`);
          tableFailed += batch.length;
          migrationStats.errors.push({ table: tableName, error: err.message });
        }
      }

      migrationStats.total += rows.length;
      migrationStats.success += tableSuccess;
      migrationStats.failed += tableFailed;

      console.log(`   ✓ ${tableSuccess} rows inserted`);
      if (tableFailed > 0) {
        console.log(`   ✗ ${tableFailed} rows failed`);
      }

      resolve();
    });
  });
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total rows to migrate: ${migrationStats.total}`);
  console.log(`✓ Successfully migrated: ${migrationStats.success}`);
  console.log(`✗ Failed: ${migrationStats.failed}`);

  if (migrationStats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    migrationStats.errors.forEach(e => {
      console.log(`   - ${e.table}: ${e.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (migrationStats.failed === 0) {
    console.log('✅ MIGRATION COMPLETE - All data successfully migrated!');
    console.log('\nNext steps:');
    console.log('1. Update your .env to use Supabase URLs');
    console.log('2. Run: npm install');
    console.log('3. Switch your backend to use Supabase APIs');
    console.log('4. Test locally then deploy to Netlify');
  } else {
    console.log('⚠️  MIGRATION COMPLETED WITH ERRORS');
    console.log('Review the errors above and retry if needed.');
  }

  console.log('='.repeat(60) + '\n');

  sqliteDb.close();
  process.exit(migrationStats.failed > 0 ? 1 : 0);
}

// Start migration
migrateData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
