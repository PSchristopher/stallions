'use client';

import { useRef, useState } from 'react';

const paymentUpiId = 'jerinvijay507@oksbi';
const paymentPhone = '+91 70122 25381';
const paymentAmount = '300.00';
const paymentDisplayAmount = '300';
const paymentPayee = 'Jerinvijay';
const paymentParams = new URLSearchParams({
  pa: paymentUpiId,
  pn: paymentPayee,
  am: paymentAmount,
  cu: 'INR',
});
const paymentUri = `upi://pay?${paymentParams.toString()}`;
const paymentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(paymentUri)}`;
const uploadFileFields = ['photo', 'aadhaar', 'paymentProof'] as const;
const maxUploadFileBytes = 1.2 * 1024 * 1024;
const maxUploadImageEdge = 1400;

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isUploadField(name: string): name is (typeof uploadFileFields)[number] {
  return uploadFileFields.includes(name as (typeof uploadFileFields)[number]);
}

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxUploadImageEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.78;
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

  while (blob && blob.size > maxUploadFileBytes && quality > 0.5) {
    quality -= 0.08;
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  }

  if (!blob) {
    return file;
  }

  if (blob.size >= file.size && file.size <= maxUploadFileBytes) {
    return file;
  }

  const safeName = file.name.replace(/\.[^.]+$/, '') || 'upload';
  return new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' });
}

async function buildCompressedForm(form: HTMLFormElement) {
  const source = new FormData(form);
  const compressed = new FormData();

  for (const [key, value] of source.entries()) {
    if (value instanceof File && isUploadField(key)) {
      const file = await compressImage(value);

      if (file.size > maxUploadFileBytes) {
        throw new Error(`${key} image is still ${formatMb(file.size)} after compression. Please upload a smaller or cropped image.`);
      }

      compressed.append(key, file);
      continue;
    }

    compressed.append(key, value);
  }

  return compressed;
}

export default function RegisterPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const form = await buildCompressedForm(event.currentTarget);
      const response = await fetch('/api/register', {
        method: 'POST',
        body: form
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error || 'Unable to submit registration.');
        return;
      }

      setMessage('Registration submitted successfully. Admin will verify payment soon.');
      formRef.current?.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit registration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="section-header">
        <div>
          <span className="eyebrow">Player Registration</span>
          <h1>Join SPL Stallions</h1>
          <p>Upload your photo, Aadhaar proof, and payment screenshot to secure your spot in the tournament.</p>
        </div>
      </section>

      <div className="card">
        <h2>Registration details</h2>
        <p className="page-subtitle">
          The registration fee is <strong>₹300</strong>. Please upload the payment proof clearly so the admin can verify quickly.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr',
            gap: 18,
            alignItems: 'center',
            margin: '20px 0',
            padding: 18,
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)'
          }}
        >
          <a href={paymentUri} aria-label="Pay SPL registration fee using UPI">
            <img
              src={paymentQrUrl}
              alt="UPI QR code for SPL registration fee"
              style={{ width: '100%', display: 'block', borderRadius: 8, background: '#fff', padding: 8 }}
            />
          </a>
          <div>
            <p className="page-subtitle" style={{ marginBottom: 10 }}>
              Pay <strong>₹{paymentDisplayAmount}</strong> to <strong>{paymentUpiId}</strong>
            </p>
            <p className="page-subtitle" style={{ marginBottom: 14 }}>
              Contact: <a href="tel:+917012225381">{paymentPhone}</a>
            </p>
            <a href={paymentUri}>Pay ₹{paymentDisplayAmount} with UPI</a>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Full Name</label>
            <input id="name" name="name" type="text" required placeholder="Player full name" />
          </div>

          <div className="field">
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" name="phone" type="tel" required placeholder="10-digit phone number" />
          </div>

          <div className="field">
            <label htmlFor="playingRole">Playing Role</label>
            <select id="playingRole" name="playingRole" required defaultValue="">
              <option value="" disabled>Select your role</option>
              <option value="All rounder">All rounder</option>
              <option value="Batter">Batter</option>
              <option value="Bowler">Bowler</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="photo">Player Photo</label>
            <input id="photo" name="photo" type="file" accept="image/*" required />
          </div>

          <div className="field">
            <label htmlFor="aadhaar">Aadhaar Card Photo</label>
            <input id="aadhaar" name="aadhaar" type="file" accept="image/*" required />
          </div>

          <div className="field">
            <label htmlFor="paymentProof">Payment Screenshot (₹300 proof)</label>
            <input id="paymentProof" name="paymentProof" type="file" accept="image/*" required />
            <p style={{ marginTop: 8, color: '#facc15', fontSize: 13, lineHeight: 1.5 }}>
              Original payment screenshot is mandatory. Screenshots for payments made to any other UPI ID or phone number will not be considered for verification.
            </p>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Registration'}</button>
        </form>
      </div>
    </main>
  );
}
