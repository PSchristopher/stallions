import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const term = url.searchParams.get('query')?.trim() || '';

  if (!term) {
    return NextResponse.json({ registrations: [] });
  }

  const queryText = `SELECT id, name, phone, playing_role AS "playingRole", status, photo_url AS "photoUrl", aadhaar_url AS "aadhaarUrl", payment_proof_url AS "paymentProofUrl", created_at AS "createdAt" FROM registrations WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC LIMIT 20`;
  const values = [`%${term}%`];
  const result = await query(queryText, values);

  return NextResponse.json({ registrations: result.rows });
}
