import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});
console.log('Database connection pool created.');
export async function query(text: string, params: unknown[] = []) {
  const result = await pool.query(text, params);
  console.log('result', result);
  return result;
}
