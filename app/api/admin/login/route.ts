import { NextResponse } from 'next/server';
import { createAdminCookieResponse } from '@/lib/admin';

const validCredentials = [
  {
    email: 'admin@stallions.com',
    password: process.env.ADMIN_PASSWORD || 'stallions123'
  }
];

export async function POST(request: Request) {
  const body = await request.json();
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const isValid = validCredentials.some(cred => cred.email === email && cred.password === password);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  return createAdminCookieResponse(response);
}
