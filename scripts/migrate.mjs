import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Pool } from 'pg';

const command = process.argv[2] ?? 'up';
const rootDir = process.cwd();

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function migrationApplied(client, migrationName) {
  try {
    const result = await client.query(
      'SELECT COUNT(*)::int AS count FROM schema_migrations WHERE migration_name = $1',
      [migrationName]
    );
    return result.rows[0]?.count > 0;
  } catch (error) {
    if (error.code === '42P01') {
      return false;
    }
    throw error;
  }
}

async function runUp() {
  const client = await pool.connect();

  try {
    console.log('Running pending migrations...');
    const migrationsDir = path.join(rootDir, 'migrations');
    const migrations = fs
      .readdirSync(migrationsDir)
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort();

    for (const migrationName of migrations) {
      const applied = await migrationApplied(client, migrationName);

      if (applied) {
        console.log(`SKIP ${migrationName} already applied`);
        continue;
      }

      console.log(`Applying migration: ${migrationName}`);
      const sql = fs.readFileSync(path.join(migrationsDir, migrationName), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT DO NOTHING',
          [migrationName]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      console.log(`OK ${migrationName} applied`);
    }

    console.log('All migrations completed.');
  } finally {
    client.release();
  }
}

async function showStatus() {
  let result;

  try {
    result = await pool.query(
      'SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at'
    );
  } catch (error) {
    if (error.code === '42P01') {
      console.log('Migration status: no migrations have been applied yet.');
      return;
    }
    throw error;
  }

  console.log('Migration status:');
  for (const row of result.rows) {
    console.log(`${row.migration_name} ${row.applied_at.toISOString()}`);
  }
}

try {
  if (command === 'up') {
    await runUp();
  } else if (command === 'status') {
    await showStatus();
  } else {
    console.error('Usage: node scripts/migrate.mjs up|status');
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
