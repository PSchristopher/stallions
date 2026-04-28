import { NextResponse } from 'next/server';
import { clearAdminCookieResponse } from '@/lib/admin';

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearAdminCookieResponse(response);
}
