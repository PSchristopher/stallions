import crypto from 'crypto';
import { NextResponse } from 'next/server';

const cookieName = process.env.ADMIN_COOKIE_NAME || 'stallions_admin';
const adminPassword = process.env.ADMIN_PASSWORD;
const adminSecret = process.env.ADMIN_SECRET || 'stallions-admin-secret';

if (!adminPassword) {
  throw new Error('ADMIN_PASSWORD environment variable is required for admin login.');
}

function getAdminToken() {
  return crypto.createHmac('sha256', adminSecret).update(adminPassword).digest('hex');
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [rawName, ...rest] = cookie.split('=');
    const name = rawName?.trim();
    if (!name) return;
    cookies[name] = rest.join('=').trim();
  });

  return cookies;
}

export function verifyAdminRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  return cookies[cookieName] === getAdminToken();
}

export function createAdminCookieResponse(response: NextResponse) {
  response.cookies.set({
    name: cookieName,
    value: getAdminToken(),
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24
  });
  return response;
}

export function clearAdminCookieResponse(response: NextResponse) {
  response.cookies.set({
    name: cookieName,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0
  });
  return response;
}
