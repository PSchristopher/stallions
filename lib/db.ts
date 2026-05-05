import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export async function query(text: string, params: unknown[] = []) {
  return pool.query(text, params);
}
