import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin';

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query(
    'SELECT id, name, phone, status, photo_url AS "photoUrl", aadhaar_url AS "aadhaarUrl", payment_proof_url AS "paymentProofUrl", created_at AS "createdAt" FROM registrations ORDER BY created_at DESC',
    []
  );

  return NextResponse.json({ registrations: result.rows });
}
