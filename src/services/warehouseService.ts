'use server';

import { BigQuery } from '@google-cloud/bigquery';

// This assumes that authentication is handled automatically by the environment
// (e.g., when running on Google Cloud infrastructure like App Hosting or Cloud Run).
// For local development, you would need to set up authentication, e.g., by running
// `gcloud auth application-default login` in your terminal.
const bigqueryClient = new BigQuery();

/**
 * Fetches sample data from a BigQuery table.
 * NOTE: You will need to replace 'your_dataset_id' and 'your_table_id'
 * with your actual BigQuery dataset and table IDs.
 *
 * @returns {Promise<any[]>} A promise that resolves to an array of rows from the table.
 */
export async function getWarehouseData() {
  // IMPORTANT: Replace with your actual dataset and table IDs.
  const datasetId = 'your_dataset_id';
  const tableId = 'your_table_id';
  const query = `SELECT * FROM \`${datasetId}.${tableId}\` LIMIT 10`;

  try {
    const [rows] = await bigqueryClient.query({ query });
    console.log('Successfully fetched data from BigQuery:', rows);
    return rows;
  } catch (error) {
    console.error('ERROR fetching data from BigQuery:', error);
    // In a real application, you'd want more robust error handling.
    throw new Error('Failed to fetch data from the warehouse.');
  }
}

/**
 * Example of how you might use this service.
 * You could call this from a Server Component or a Genkit flow.
 */
async function exampleUsage() {
  try {
    const data = await getWarehouseData();
    // Do something with the data...
  } catch (error) {
    // Handle the error...
  }
}
