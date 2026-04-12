-- MIGRATE TEST DATA: RTO AGREEMENTS AND DRIVER SUBMISSIONS FROM LOCAL SYSTEM
-- This creates sample test data to verify the full workflow
-- Run in Supabase: https://app.supabase.com/project/[ID]/sql/new

-- ============================================================================
-- TEST DATA: RTO AGREEMENTS (Sample agreements to test the RTO feature)
-- ============================================================================

INSERT INTO rent_to_own_agreements (driver_id, vehicle_id, total_price, paid_amount, remaining_balance, agreement_status, agreement_date, created_at)
SELECT
  d.id as driver_id,
  (SELECT id FROM vehicles WHERE plate = 'AAA1234' LIMIT 1) as vehicle_id,
  300000 as total_price,
  50000 as paid_amount,
  250000 as remaining_balance,
  'Active' as agreement_status,
  '2026-04-12' as agreement_date,
  now() as created_at
FROM drivers d WHERE d.name = 'Aaron Nyoni' LIMIT 1

UNION ALL

SELECT
  d.id,
  (SELECT id FROM vehicles WHERE plate = 'ABC 4541' LIMIT 1),
  400000,
  100000,
  300000,
  'Active',
  '2026-04-11',
  now()
FROM drivers d WHERE d.name = 'ESTHER CHIKO' LIMIT 1

UNION ALL

SELECT
  d.id,
  (SELECT id FROM vehicles WHERE plate = 'BBA 5656' LIMIT 1),
  250000,
  0,
  250000,
  'Active',
  '2026-04-10',
  now()
FROM drivers d WHERE d.name = 'Sisa Munks' LIMIT 1

UNION ALL

SELECT
  d.id,
  (SELECT id FROM vehicles WHERE plate = 'CAK 1234' LIMIT 1),
  350000,
  75000,
  275000,
  'Active',
  '2026-04-09',
  now()
FROM drivers d WHERE d.name = 'Mwiza Kamanga' LIMIT 1

UNION ALL

SELECT
  d.id,
  (SELECT id FROM vehicles WHERE plate = 'BBA1245' LIMIT 1),
  450000,
  150000,
  300000,
  'Active',
  '2026-04-08',
  now()
FROM drivers d WHERE d.name = 'MAINZA HATWIINDA' LIMIT 1

ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST DATA: RTO PAYMENTS (Associated with the agreements above)
-- ============================================================================

INSERT INTO rent_to_own_payments (agreement_id, amount, payment_date, payment_method, created_at)
SELECT
  (SELECT id FROM rent_to_own_agreements WHERE driver_id = (SELECT id FROM drivers WHERE name = 'Aaron Nyoni' LIMIT 1) LIMIT 1),
  25000,
  '2026-04-05',
  'Weekly Cashing',
  now()

UNION ALL

SELECT
  (SELECT id FROM rent_to_own_agreements WHERE driver_id = (SELECT id FROM drivers WHERE name = 'Aaron Nyoni' LIMIT 1) LIMIT 1),
  25000,
  '2026-04-12',
  'Weekly Cashing',
  now()

UNION ALL

SELECT
  (SELECT id FROM rent_to_own_agreements WHERE driver_id = (SELECT id FROM drivers WHERE name = 'ESTHER CHIKO' LIMIT 1) LIMIT 1),
  50000,
  '2026-04-10',
  'Weekly Cashing',
  now()

UNION ALL

SELECT
  (SELECT id FROM rent_to_own_agreements WHERE driver_id = (SELECT id FROM drivers WHERE name = 'ESTHER CHIKO' LIMIT 1) LIMIT 1),
  50000,
  '2026-04-03',
  'Weekly Cashing',
  now()

UNION ALL

SELECT
  (SELECT id FROM rent_to_own_agreements WHERE driver_id = (SELECT id FROM drivers WHERE name = 'Mwiza Kamanga' LIMIT 1) LIMIT 1),
  75000,
  '2026-04-08',
  'Weekly Cashing',
  now()

ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST DATA: DRIVER SUBMISSIONS (Weekly payment submissions from drivers)
-- ============================================================================

INSERT INTO driver_submissions (driver_id, submission_date, amount, week, month, notes, submission_status, created_at)
SELECT
  d.id,
  '2026-04-12',
  25000,
  2,
  4,
  'Weekly cashing from routes',
  'Pending' as submission_status,
  now()
FROM drivers d WHERE d.name = 'Allan Zulu' LIMIT 1

UNION ALL

SELECT
  d.id,
  '2026-04-12',
  30000,
  2,
  4,
  'Weekly cashing - Good week',
  'Pending',
  now()
FROM drivers d WHERE d.name = 'Arnold Mulefu' LIMIT 1

UNION ALL

SELECT
  d.id,
  '2026-04-11',
  35000,
  2,
  4,
  'Weekly cashing submitted',
  'Approved',
  now()
FROM drivers d WHERE d.name = 'Augustine Mutale' LIMIT 1

UNION ALL

SELECT
  d.id,
  '2026-04-10',
  28000,
  2,
  4,
  'Weekly cashing',
  'Approved',
  now()
FROM drivers d WHERE d.name = 'Bernard Zulu' LIMIT 1

UNION ALL

SELECT
  d.id,
  '2026-04-12',
  32000,
  2,
  4,
  'Weekly cashing - Excellent performance',
  'Pending',
  now()
FROM drivers d WHERE d.name = 'Boyd Mweemba' LIMIT 1

ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFY MIGRATIONS
-- ============================================================================

SELECT
  'RTO Agreements' as data_type,
  COUNT(*) as count,
  SUM(total_price) as total_agreements_value,
  SUM(paid_amount) as total_paid,
  SUM(remaining_balance) as total_remaining
FROM rent_to_own_agreements

UNION ALL

SELECT
  'RTO Payments',
  COUNT(*),
  SUM(amount),
  SUM(amount),
  NULL
FROM rent_to_own_payments

UNION ALL

SELECT
  'Driver Submissions',
  COUNT(*),
  SUM(amount),
  SUM(CASE WHEN submission_status = 'Approved' THEN amount ELSE 0 END),
  SUM(CASE WHEN submission_status = 'Pending' THEN amount ELSE 0 END)
FROM driver_submissions;

-- ============================================================================
-- SUMMARY STATISTICS
-- ============================================================================

-- Show test data ready for testing
SELECT
  'TEST DATA MIGRATION COMPLETE' as status,
  COUNT(DISTINCT da.id) as rto_agreements,
  COUNT(DISTINCT drp.id) as rto_payments,
  COUNT(DISTINCT ds.id) as driver_submissions,
  COUNT(DISTINCT ds2.id) as pending_submissions,
  COUNT(DISTINCT ds3.id) as approved_submissions
FROM rent_to_own_agreements da
LEFT JOIN rent_to_own_payments drp ON da.id = drp.agreement_id
LEFT JOIN driver_submissions ds ON ds.submission_status IN ('Pending', 'Approved')
LEFT JOIN driver_submissions ds2 ON ds2.submission_status = 'Pending'
LEFT JOIN driver_submissions ds3 ON ds3.submission_status = 'Approved'
WHERE da.id IS NOT NULL;
