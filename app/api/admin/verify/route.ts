import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin';

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const id = Number(body?.id);
  const status = body?.status || 'verified';

  if (!id) {
    return NextResponse.json({ error: 'Registration id is required.' }, { status: 400 });
  }

  if (!['verified', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  await query('UPDATE registrations SET status = $1 WHERE id = $2', [status, id]);
  return NextResponse.json({ success: true });
}
