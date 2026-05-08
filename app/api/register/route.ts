import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { saveFile } from '@/lib/storage';

export const runtime = 'nodejs';

const playingRoles = ['All rounder', 'Batter', 'Bowler'] as const;
const maxUploadFileBytes = 1.2 * 1024 * 1024;
const maxTotalUploadBytes = 4 * 1024 * 1024;

async function requiredString(value: FormDataEntryValue | null, label: string) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

async function requiredFile(value: FormDataEntryValue | null, label: string) {
  if (!value || !(value instanceof File) || value.size === 0) {
    throw new Error(`${label} file is required.`);
  }

  if (!value.type.startsWith('image/')) {
    throw new Error(`${label} must be an image file.`);
  }

  if (value.size > maxUploadFileBytes) {
    throw new Error(`${label} is too large. Please upload an image under 1.2 MB.`);
  }

  return value as File;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = await requiredString(formData.get('name'), 'Name');
    const phone = await requiredString(formData.get('phone'), 'Phone');
    const playingRole = await requiredString(formData.get('playingRole'), 'Playing role');
    const photoFile = await requiredFile(formData.get('photo'), 'Player photo');
    const aadhaarFile = await requiredFile(formData.get('aadhaar'), 'Aadhaar photo');
    const paymentProofFile = await requiredFile(formData.get('paymentProof'), 'Payment proof');
    const totalUploadBytes = photoFile.size + aadhaarFile.size + paymentProofFile.size;

    if (totalUploadBytes > maxTotalUploadBytes) {
      throw new Error('Uploaded images are too large together. Please use smaller or cropped images.');
    }

    if (!playingRoles.includes(playingRole as (typeof playingRoles)[number])) {
      throw new Error('Please select a valid playing role.');
    }

    const existing = await query('SELECT id FROM registrations WHERE phone = $1', [phone]);
    if (existing.rowCount > 0) {
      return NextResponse.json({ error: 'Phone number already registered.' }, { status: 409 });
    }

    const photoUrl = await saveFile(photoFile, 'player-photo');
    const aadhaarUrl = await saveFile(aadhaarFile, 'aadhaar-photo');
    const paymentProofUrl = await saveFile(paymentProofFile, 'payment-proof');

    await query(
      'INSERT INTO registrations (name, phone, playing_role, photo_url, aadhaar_url, payment_proof_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [name, phone, playingRole, photoUrl, aadhaarUrl, paymentProofUrl, 'pending']
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Register API Error]', message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

