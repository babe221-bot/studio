'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetches sample data from a Supabase PostgreSQL table.
 * NOTE: Replace 'your_table_id' with your actual table.
 *
 * @returns {Promise<any[]>} A promise that resolves to an array of rows from the table.
 */
export async function getWarehouseData() {
  const tableId = 'your_table_id';

  try {
    const { data: rows, error } = await supabase.from(tableId).select('*').limit(10);

    if (error) {
      throw error;
    }

    console.log('Successfully fetched data from Supabase:', rows);
    return rows;
  } catch (error) {
    console.error('ERROR fetching data from Supabase:', error);
    throw new Error('Failed to fetch data from the warehouse.');
  }
}

/**
 * Example of how you might use this service.
 */
async function exampleUsage() {
  try {
    const data = await getWarehouseData();
    // Do something with the data...
  } catch (error) {
    // Handle the error...
  }
}
