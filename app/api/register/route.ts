import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { saveFile } from '@/lib/storage';

export const runtime = 'nodejs';

const playingRoles = ['All rounder', 'Batter', 'Bowler'] as const;
const maxUploadFileBytes = 650 * 1024;
const maxTotalUploadBytes = 2 * 1024 * 1024;

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
    throw new Error(`${label} is too large. Please upload an image under 650 KB.`);
  }

  return value as File;
}

async function generateRollNumber() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const rollNumber = Math.floor(Math.random() * 900000) + 100000;
    const existing = await query('SELECT id FROM registrations WHERE roll_num = $1', [rollNumber]);

    if (existing.rowCount === 0) {
      return rollNumber;
    }
  }

  throw new Error('Unable to create a unique roll number. Please try again.');
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

    const [photoUrl, aadhaarUrl, paymentProofUrl] = await Promise.all([
      saveFile(photoFile, 'player-photo'),
      saveFile(aadhaarFile, 'aadhaar-photo'),
      saveFile(paymentProofFile, 'payment-proof')
    ]);
    const rollNumber = await generateRollNumber();

    const inserted = await query(
      'INSERT INTO registrations (roll_num, name, phone, playing_role, photo_url, aadhaar_url, payment_proof_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING display_number AS "displayNumber", roll_num AS "rollNumber"',
      [rollNumber, name, phone, playingRole, photoUrl, aadhaarUrl, paymentProofUrl, 'pending']
    );

    return NextResponse.json(
      {
        success: true,
        displayNumber: inserted.rows[0]?.displayNumber,
        rollNumber: inserted.rows[0]?.rollNumber
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Register API Error]', message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

