/**
 * Supabase Configuration for Backend
 * Replaces SQLite database with Supabase PostgreSQL
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Initialize Supabase client with service role key for backend operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Helper function for SELECT queries
 */
async function select(table, options = {}) {
  let query = supabase.from(table).select(options.select || '*');

  if (options.filters) {
    Object.entries(options.filters).forEach(([col, val]) => {
      query = query.eq(col, val);
    });
  }

  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending !== false });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Helper function for INSERT
 */
async function insert(table, data, options = {}) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data, options);

  if (error) throw error;
  return result;
}

/**
 * Helper function for UPDATE
 */
async function update(table, data, filters = {}) {
  let query = supabase.from(table).update(data);

  Object.entries(filters).forEach(([col, val]) => {
    query = query.eq(col, val);
  });

  const { data: result, error } = await query;
  if (error) throw error;
  return result;
}

/**
 * Helper function for DELETE
 */
async function delete_(table, filters = {}) {
  let query = supabase.from(table).delete();

  Object.entries(filters).forEach(([col, val]) => {
    query = query.eq(col, val);
  });

  const { error } = await query;
  if (error) throw error;
  return true;
}

/**
 * Helper function for UPSERT
 */
async function upsert(table, data, onConflict = 'id') {
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, { onConflict });

  if (error) throw error;
  return result;
}

module.exports = {
  supabase,
  select,
  insert,
  update,
  delete: delete_,
  upsert
};
