import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await query('CREATE SEQUENCE IF NOT EXISTS registrations_display_number_seq');

    // Create the registrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        display_number INTEGER NOT NULL DEFAULT nextval('registrations_display_number_seq'),
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        playing_role TEXT NOT NULL DEFAULT 'All rounder',
        photo_url TEXT NOT NULL,
        aadhaar_url TEXT NOT NULL,
        payment_proof_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create an index on phone for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations(phone)
    `);

    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_display_number ON registrations(display_number)
    `);

    return NextResponse.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Init DB Error]', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
