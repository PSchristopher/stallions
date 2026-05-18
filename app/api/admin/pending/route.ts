import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin';

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query(
    'SELECT id, display_number AS "displayNumber", name, phone, playing_role AS "playingRole", status, created_at AS "createdAt" FROM registrations WHERE status = $1 ORDER BY created_at ASC',
    ['pending']
  );

  return NextResponse.json({ registrations: result.rows });
}
