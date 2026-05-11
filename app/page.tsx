'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

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
type UploadField = (typeof uploadFileFields)[number];
type PreparedUploads = Partial<Record<UploadField, File>>;
const maxUploadFileBytes = 650 * 1024;
const maxTotalUploadBytes = 2 * 1024 * 1024;
const maxUploadImageEdge = 1000;

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

  let quality = 0.72;
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

  while (blob && blob.size > maxUploadFileBytes && quality > 0.35) {
    quality -= 0.07;
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

async function buildCompressedForm(form: HTMLFormElement, preparedUploads: PreparedUploads = {}) {
  const source = new FormData(form);
  const compressed = new FormData();
  let totalUploadBytes = 0;

  for (const [key, value] of source.entries()) {
    if (value instanceof File && isUploadField(key)) {
      const file = preparedUploads[key] ?? await compressImage(value);

      if (file.size > maxUploadFileBytes) {
        throw new Error(`${key} image is still ${formatMb(file.size)} after compression. Please crop it or choose a smaller image.`);
      }

      compressed.append(key, file);
      totalUploadBytes += file.size;
      continue;
    }

    compressed.append(key, value);
  }

  if (totalUploadBytes > maxTotalUploadBytes) {
    throw new Error('Uploaded images are still too large together. Please crop one or more images and try again.');
  }

  return compressed;
}

export default function RegisterPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});
  const [preparedUploads, setPreparedUploads] = useState<PreparedUploads>({});
  const [compressingFiles, setCompressingFiles] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const form = await buildCompressedForm(event.currentTarget, preparedUploads);
      const response = await fetch('/api/register', { method: 'POST', body: form });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error || 'Unable to submit registration. Please upload smaller images and try again.');
        return;
      }

      setMessage('Registration submitted! Admin will verify your payment soon.');
      formRef.current?.reset();
      setFilePreviews({});
      setPreparedUploads({});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit registration.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, key: UploadField) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setCompressingFiles((count) => count + 1);
    try {
      const compressedFile = await compressImage(file);

      if (compressedFile.size > maxUploadFileBytes) {
        throw new Error(`${key} image is ${formatMb(compressedFile.size)} after compression. Please crop it or choose a smaller image.`);
      }

      setPreparedUploads((uploads) => ({ ...uploads, [key]: compressedFile }));
      setFilePreviews((previews) => ({ ...previews, [key]: URL.createObjectURL(compressedFile) }));
    } catch (fileError) {
      e.currentTarget.value = '';
      setPreparedUploads((uploads) => {
        const nextUploads = { ...uploads };
        delete nextUploads[key];
        return nextUploads;
      });
      setFilePreviews((previews) => {
        const nextPreviews = { ...previews };
        delete nextPreviews[key];
        return nextPreviews;
      });
      setError(fileError instanceof Error ? fileError.message : 'Unable to prepare image. Please choose another image.');
    } finally {
      setCompressingFiles((count) => Math.max(0, count - 1));
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap');

        /* ── RESET ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── TOKENS ── */
        :root {
          --bg:        #0b1f3a;
          --surface:   #112240;
          --card:      #ffffff;
          --border:    #d0dff0;
          --blue:      #1a5fc8;
          --blue-lt:   #2e74e0;
          --sky:       #e8f1fc;
          --navy-txt:  #0b1f3a;
          --body-txt:  #334e72;
          --muted:     #7a94b4;
          --gold:      #e8a500;
          --gold-bg:   #fffbec;
          --red:       #d93025;
          --green:     #1a7a4a;
          --radius:    10px;
          --radius-lg: 16px;
        }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--navy-txt);
          min-height: 100vh;
        }

        /* ── CRICKET SVG BACKGROUND ── */
        .spl-bg {
          position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
        }

        /* Page wrapper */
        .spl-page {
          position: relative; z-index: 1;
          min-height: 100vh;
        }

        /* ── NAV ── */
        .spl-nav {
          background: #0d2249;
          border-bottom: 2px solid #1a3a6a;
          padding: 0 32px;
          display: flex; align-items: center; justify-content: space-between;
          height: 64px;
        }

        .spl-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }

        .spl-logo {
          width: 40px; height: 40px;
          background: var(--blue);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px; letter-spacing: 1px; color: #fff;
        }

        .spl-brand-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px; letter-spacing: 3px; color: var(--gold); line-height: 1;
        }
        .spl-brand-sub {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
          color: #5b7eaa; font-weight: 600;
        }

        .spl-nav-link {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: #7aa4d4; text-decoration: none;
          padding: 8px 16px;
          border: 1px solid #1f3d6e;
          border-radius: 7px;
          transition: all 0.15s;
        }
        .spl-nav-link:hover { background: #1a3a6a; color: #fff; border-color: #2a5a9e; }

        /* ── MAIN CONTENT AREA ── */
        .spl-main {
          max-width: 1100px; margin: 0 auto; padding: 40px 24px 60px;
        }

        /* ── PAGE HEADER ── */
        .spl-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 32px;
        }

        .spl-season-tag {
          display: inline-flex; align-items: center; gap: 8px;
          background: #0f3060;
          border: 1px solid #1f4d8a;
          border-radius: 6px;
          padding: 6px 14px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
          color: #7ab4f0;
        }
        .spl-season-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #4caf50;
        }

        .spl-date-tag {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 600; letter-spacing: 1px;
          color: #5b7eaa;
        }
        .spl-date-tag span { color: var(--gold); }

        /* ── TWO COLUMN ── */
        .spl-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .spl-grid { grid-template-columns: 1fr; }
        }

        /* ── LEFT PANEL ── */
        .spl-left { display: flex; flex-direction: column; gap: 20px; }

        .spl-hero-card {
          background: #0d2249;
          border: 1px solid #1a3a6a;
          border-radius: var(--radius-lg);
          padding: 28px 24px;
          position: relative; overflow: hidden;
        }
        /* cricket ball accent */
        .spl-hero-card::after {
          content: '';
          position: absolute; top: -30px; right: -30px;
          width: 120px; height: 120px;
          border-radius: 50%;
          border: 18px solid #1a3a6a;
          opacity: 0.4;
        }

        .spl-hero-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
          color: #3d7abf; margin-bottom: 10px;
        }

        .spl-hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 52px; line-height: 0.95; letter-spacing: 1px;
          color: #fff; margin-bottom: 14px;
        }
        .spl-hero-title .t-sky  { color: #7ab4f0; }
        .spl-hero-title .t-gold { color: var(--gold); }

        .spl-hero-desc {
          font-size: 14px; line-height: 1.65; color: #5b7eaa; margin-bottom: 20px;
        }

        /* ── STATS ROW ── */
        .spl-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          border: 1px solid #1a3a6a; border-radius: var(--radius); overflow: hidden;
        }
        .spl-stat {
          padding: 14px 12px; text-align: center;
          border-right: 1px solid #1a3a6a;
        }
        .spl-stat:last-child { border-right: none; }
        .spl-stat-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px; color: var(--gold); letter-spacing: 1px; line-height: 1;
        }
        .spl-stat-lbl {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px; text-transform: uppercase; letter-spacing: 2px;
          color: #3d6a99; font-weight: 600; margin-top: 3px;
        }

        .spl-payment-card {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .spl-payment-top {
          background: var(--gold-bg);
          border-bottom: 1px solid #f2df9c;
          padding: 14px 18px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .spl-payment-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: #9a6b00;
        }
        .spl-payment-amount {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 30px; letter-spacing: 1px; color: var(--navy-txt); line-height: 1;
        }
        .spl-payment-body {
          padding: 18px;
          grid-template-columns: 132px 1fr;
          gap: 16px;
          align-items: center;
        }
          // display: grid;

        .spl-payment-qr-link {
          display: block;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 8px;
          background: #fff;
          transition: transform 0.15s, border-color 0.15s;
        }
        .spl-payment-qr-link:hover { transform: translateY(-1px); border-color: var(--blue); }
        .spl-payment-qr {
          width: 100%;
          aspect-ratio: 1;
          display: block;
        }
        .spl-payment-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid #eef3fa;
          padding: 8px 0;
          font-size: 13px;
          color: var(--body-txt);
        }
        .spl-payment-line:first-child { padding-top: 0; }
        .spl-payment-line strong {
          color: var(--navy-txt);
          font-weight: 700;
          overflow-wrap: anywhere;
          text-align: right;
        }
        .spl-payment-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 14px;
        }
        .spl-pay-button,
        .spl-contact-button {
          min-height: 42px;
          border-radius: var(--radius);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .spl-pay-button {
          background: var(--blue);
          color: #fff;
        }
        .spl-pay-button:hover { background: var(--blue-lt); }
        .spl-contact-button {
          background: var(--sky);
          color: var(--blue);
          border: 1px solid var(--border);
        }
        .spl-payment-note {
          margin-top: 10px;
          font-size: 11px;
          color: var(--muted);
          line-height: 1.5;
        }
        @media (max-width: 460px) {
          .spl-payment-body { grid-template-columns: 1fr; }
          .spl-payment-qr-link { max-width: 180px; margin: 0 auto; }
          .spl-payment-actions { grid-template-columns: 1fr; }
        }

        /* ── INFO CARDS ── */
        .spl-info-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .spl-info-head {
          background: var(--sky);
          padding: 12px 18px;
          display: flex; align-items: center; gap: 8px;
          border-bottom: 1px solid var(--border);
        }
        .spl-info-head-icon {
          width: 26px; height: 26px; border-radius: 6px;
          background: var(--blue);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        }
        .spl-info-head-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: var(--blue);
        }

        .spl-checklist { list-style: none; }
        .spl-check-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 18px;
          border-bottom: 1px solid #eef3fa;
          font-size: 14px; color: var(--body-txt); font-weight: 500;
        }
        .spl-check-item:last-child { border-bottom: none; }
        .spl-check-icon {
          width: 28px; height: 28px; flex-shrink: 0;
          background: var(--sky);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center; font-size: 13px;
        }
        .spl-check-tag {
          margin-left: auto;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--muted); font-weight: 700;
          background: var(--sky); border-radius: 4px; padding: 2px 7px;
        }

        /* ── FORM CARD ── */
        .spl-form-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .spl-form-header {
          background: var(--blue);
          padding: 20px 28px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .spl-form-header-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px; letter-spacing: 2px; color: #fff;
        }
        .spl-form-header-sub { font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 2px; }
        .spl-form-header-fee {
          text-align: right;
        }
        .spl-fee-label {
          font-size: 11px; color: rgba(255,255,255,0.6);
          font-family: 'Barlow Condensed', sans-serif;
          letter-spacing: 1px; text-transform: uppercase; font-weight: 600;
        }
        .spl-fee-amount {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 30px; color: var(--gold); letter-spacing: 2px; line-height: 1;
        }
        .spl-fee-note { font-size: 10px; color: rgba(255,255,255,0.45); }

        .spl-form-body { padding: 28px; }

        /* Fields */
        .spl-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 560px) { .spl-field-row { grid-template-columns: 1fr; } }

        .spl-field { display: flex; flex-direction: column; gap: 6px; }

        .spl-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: var(--body-txt);
        }

        .spl-input {
          width: 100%;
          background: #f4f8fe;
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          padding: 11px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 500; color: var(--navy-txt);
          transition: border-color 0.15s, box-shadow 0.15s; outline: none;
        }
        .spl-input::placeholder { color: #b0c4de; }
        .spl-input:focus {
          border-color: var(--blue);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(26,95,200,0.1);
        }

        /* Divider */
        .spl-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 8px 0 20px;
        }
        .spl-divider-line { flex: 1; height: 1px; background: var(--border); }
        .spl-divider-text {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: var(--muted);
        }

        /* Upload grid */
        .spl-upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        @media (max-width: 560px) { .spl-upload-grid { grid-template-columns: 1fr; } }

        .spl-upload-wrap { display: flex; flex-direction: column; gap: 6px; }

        .spl-upload {
          position: relative; cursor: pointer;
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          background: #f4f8fe;
          min-height: 100px;
          transition: border-color 0.15s, background 0.15s;
          overflow: hidden;
        }
        .spl-upload:hover { border-color: var(--blue); background: var(--sky); }
        .spl-upload.active { border-style: solid; border-color: var(--blue); background: #fff; }

        .spl-upload input[type="file"] {
          position: absolute; inset: 0; opacity: 0; cursor: pointer;
          width: 100%; height: 100%; z-index: 2;
        }

        .spl-upload-placeholder {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px; padding: 20px 10px; text-align: center;
        }
        .spl-upload-emoji { font-size: 22px; line-height: 1; }
        .spl-upload-hint {
          font-size: 12px; color: var(--muted); font-weight: 500; line-height: 1.4;
        }
        .spl-upload-sub { font-size: 11px; color: #b0c4de; }

        .spl-upload-preview {
          width: 100%; height: 100px;
          object-fit: cover; display: block; position: relative; z-index: 1;
        }

        /* Full width upload */
        .spl-upload-full {
          position: relative; cursor: pointer;
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          background: #f4f8fe;
          min-height: 76px;
          transition: border-color 0.15s, background 0.15s;
          overflow: hidden; margin-bottom: 20px;
        }
        .spl-upload-full:hover { border-color: var(--blue); background: var(--sky); }
        .spl-upload-full.active { border-style: solid; border-color: var(--blue); background: #fff; }
        .spl-upload-full input[type="file"] {
          position: absolute; inset: 0; opacity: 0; cursor: pointer;
          width: 100%; height: 100%; z-index: 2;
        }
        .spl-upload-full-inner {
          display: flex; align-items: center; gap: 14px;
          padding: 18px 20px;
        }
        .spl-upload-full-emoji { font-size: 20px; }
        .spl-upload-full-text { font-size: 13px; color: var(--muted); font-weight: 500; }
        .spl-upload-full-preview {
          width: 100%; height: 76px; object-fit: cover;
          display: block; position: relative; z-index: 1;
        }
        .spl-payment-proof-note {
          margin: -10px 0 20px;
          padding: 10px 12px;
          border: 1px solid #f2df9c;
          border-radius: var(--radius);
          background: var(--gold-bg);
          color: #8a5f00;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 600;
        }

        /* Alerts */
        .spl-alert-err {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; margin-bottom: 14px;
          background: #fff5f5; border: 1.5px solid #fca5a5; border-radius: var(--radius);
          color: var(--red); font-size: 14px; font-weight: 500;
        }
        .spl-alert-ok {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; margin-bottom: 14px;
          background: #f0fdf4; border: 1.5px solid #86efac; border-radius: var(--radius);
          color: var(--green); font-size: 14px; font-weight: 600;
        }

        /* Submit */
        .spl-submit {
          width: 100%; padding: 15px 24px;
          background: var(--blue); color: #fff;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px; letter-spacing: 3px;
          border: none; border-radius: var(--radius); cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .spl-submit:hover { background: var(--blue-lt); transform: translateY(-1px); }
        .spl-submit:active { transform: translateY(0); }
        .spl-submit:disabled { background: #7aa4d4; cursor: not-allowed; transform: none; }

        .spl-form-footer {
          margin-top: 14px; text-align: center;
          font-size: 12px; color: var(--muted);
        }
      ` }} />

      {/* Cricket SVG Background */}
      <div className="spl-bg">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Pitch rectangle pattern */}
            <pattern id="pitch" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              {/* Vertical pitch lines */}
              <line x1="0" y1="0" x2="0" y2="200" stroke="#1a3a6a" strokeWidth="0.6" opacity="0.6" />
              <line x1="100" y1="0" x2="100" y2="200" stroke="#1a3a6a" strokeWidth="0.4" opacity="0.3" />
            </pattern>
            {/* Horizontal lines */}
            <pattern id="lines" x="0" y="0" width="200" height="120" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="200" y2="0" stroke="#142e5c" strokeWidth="0.5" opacity="0.5" />
            </pattern>
          </defs>
          {/* Base grid */}
          <rect width="100%" height="100%" fill="#0b1f3a" />
          <rect width="100%" height="100%" fill="url(#pitch)" />
          <rect width="100%" height="100%" fill="url(#lines)" />

          {/* Decorative cricket ball — top right */}
          <circle cx="88%" cy="12%" r="90" fill="none" stroke="#1e3f6e" strokeWidth="1.5" opacity="0.5" />
          <circle cx="88%" cy="12%" r="70" fill="none" stroke="#1e3f6e" strokeWidth="0.8" opacity="0.3" />
          {/* seam curve */}
          <path d="M 78% 8% Q 88% 12% 78% 16%" fill="none" stroke="#1e4a7a" strokeWidth="1.5" opacity="0.4" />
          <path d="M 98% 8% Q 88% 12% 98% 16%" fill="none" stroke="#1e4a7a" strokeWidth="1.5" opacity="0.4" />

          {/* Decorative stumps — bottom left */}
          <g opacity="0.12" transform="translate(60, 65%)">
            <rect x="0" y="0" width="5" height="60" rx="2" fill="#2a6cc4" />
            <rect x="14" y="0" width="5" height="60" rx="2" fill="#2a6cc4" />
            <rect x="28" y="0" width="5" height="60" rx="2" fill="#2a6cc4" />
            <rect x="-4" y="0" width="40" height="4" rx="1" fill="#2a6cc4" />
            <rect x="-4" y="5" width="40" height="4" rx="1" fill="#2a6cc4" />
          </g>

          {/* Large faint ball bottom right corner */}
          <circle cx="95%" cy="90%" r="200" fill="none" stroke="#162f55" strokeWidth="2" opacity="0.35" />
          <circle cx="95%" cy="90%" r="160" fill="none" stroke="#162f55" strokeWidth="1" opacity="0.2" />

          {/* Bat silhouette — subtle, top left */}
          <g opacity="0.07" transform="translate(20, 20) rotate(-35)">
            <rect x="0" y="0" width="22" height="110" rx="6" fill="#3a7fe0" />
            <rect x="8" y="110" width="6" height="45" rx="3" fill="#3a7fe0" />
          </g>

          {/* Faint pitch oval */}
          <ellipse cx="50%" cy="50%" rx="38%" ry="30%" fill="none" stroke="#152d56" strokeWidth="1.5" opacity="0.3" />
          <ellipse cx="50%" cy="50%" rx="30%" ry="22%" fill="none" stroke="#152d56" strokeWidth="0.8" opacity="0.2" />
          {/* Crease lines */}
          <line x1="30%" y1="38%" x2="70%" y2="38%" stroke="#152d56" strokeWidth="1" opacity="0.25" />
          <line x1="30%" y1="62%" x2="70%" y2="62%" stroke="#152d56" strokeWidth="1" opacity="0.25" />
        </svg>
      </div>

      <div className="spl-page">
        {/* NAV */}
        <nav className="spl-nav">
          <a className="spl-brand" href="#">
            <div className="spl-logo">SPL</div>
            <div>
              <div className="spl-brand-name">Stallions</div>
              <div className="spl-brand-sub">Premiere League</div>
            </div>
          </a>
          <Link href="/admin/login" className="spl-nav-link">Admin Portal</Link>
        </nav>

        <main className="spl-main">
          {/* Header row */}
          <div className="spl-header">
            <div className="spl-season-tag">
              <span className="spl-season-dot" />
              Season 2 — Registration Open
            </div>
            <div className="spl-date-tag">Match Day: <span>May 24, 2026</span></div>
          </div>

          <div className="spl-grid">
            {/* ── LEFT ── */}
            <div className="spl-left">
              {/* Hero */}
              <div className="spl-hero-card">
                <div className="spl-hero-label">SPL Stallions Premiere League</div>
                <h1 className="spl-hero-title">
                  Play<br />
                  <span className="t-sky">Big</span>{' '}
                  <span className="t-gold">Cricket.</span>
                </h1>
                <p className="spl-hero-desc">
                  Secure your spot in Season 2. Upload your details and ₹300 payment proof to get verified and step on the pitch.
                </p>
                <div className="spl-stats">
                  <div className="spl-stat">
                    <div className="spl-stat-num">8</div>
                    <div className="spl-stat-lbl">Franchises</div>
                  </div>
                  <div className="spl-stat">
                    <div className="spl-stat-num">6</div>
                    <div className="spl-stat-lbl">Overs</div>
                  </div>
                  <div className="spl-stat">
                    <div className="spl-stat-num">₹20K</div>
                    <div className="spl-stat-lbl">1st Prize</div>
                  </div>
                </div>
              </div>

              <div className="spl-payment-card">
                <div className="spl-payment-top">
                  <div>
                    <div className="spl-payment-title">Pay Registration Fee</div>
                    <div className="spl-payment-amount">₹{paymentDisplayAmount}</div>
                  </div>
                  <span className="spl-season-tag" style={{ background: '#fff', color: '#9a6b00', borderColor: '#f2df9c' }}>
                    UPI Ready
                  </span>
                </div>
                <div className="spl-payment-body">
                  {/* <a className="spl-payment-qr-link" href={paymentUri} aria-label="Pay SPL registration fee using UPI">
                    <img className="spl-payment-qr" src={paymentQrUrl} alt="UPI QR code for SPL registration fee" />
                  </a> */}
                  <div>
                    <div className="spl-payment-line">
                      <span>UPI ID</span>
                      <strong>{paymentUpiId}</strong>
                    </div>
                    <div className="spl-payment-line">
                      <span>Phone</span>
                      <strong>{paymentPhone}</strong>
                    </div>
                    <div className="spl-payment-line">
                      <span>Amount</span>
                      <strong>₹{paymentDisplayAmount}</strong>
                    </div>
                    <div className="spl-payment-actions">
                      {/* <a className="spl-pay-button" href={paymentUri}>Pay Now</a> */}
                      <a className="spl-contact-button" href="tel:+917012225381">Call</a>
                    </div>
                    <p className="spl-payment-note">
                      After payment, upload the screenshot in the payment proof field before submitting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              {/* <div className="spl-info-card">
                <div className="spl-info-head">
                  <div className="spl-info-head-icon">📋</div>
                  <span className="spl-info-head-title">What You'll Need</span>
                </div>
                <ul className="spl-checklist">
                  {[
                    ['👤', 'Full Name & Phone Number', 'Required'],
                    ['📸', 'Clear Player Portrait Photo', 'Image'],
                    ['🪪', 'Govt ID / Aadhaar Card', 'Image'],
                    ['💳', '₹300 Payment Screenshot', 'UPI/Bank'],
                  ].map(([icon, text, tag]) => (
                    <li className="spl-check-item" key={text as string}>
                      <div className="spl-check-icon">{icon}</div>
                      <span>{text}</span>
                      <span className="spl-check-tag">{tag}</span>
                    </li>
                  ))}
                </ul>
              </div> */}
            </div>

            {/* ── FORM ── */}
            <div className="spl-form-card">
              {/* Form header */}
              <div className="spl-form-header">
                <div>
                  <div className="spl-form-header-title">Player Registration</div>
                  <div className="spl-form-header-sub">Fill all fields to submit your entry</div>
                </div>
                <div className="spl-form-header-fee">
                  <div className="spl-fee-label">Entry Fee</div>
                  <div className="spl-fee-amount">₹300</div>
                  {/* <div className="spl-fee-note">Non-refundable</div> */}
                </div>
              </div>

              {/* Form body */}
              <div className="spl-form-body">
                <form ref={formRef} onSubmit={handleSubmit}>
                  {/* Name + Phone */}
                  <div className="spl-field-row">
                    <div className="spl-field">
                      <label className="spl-label" htmlFor="name">Full Name</label>
                      <input
                        id="name" name="name" type="text" required
                        placeholder="E.g. Rohit Sharma"
                        className="spl-input"
                      />
                    </div>
                    <div className="spl-field">
                      <label className="spl-label" htmlFor="phone">Phone Number</label>
                      <input
                        id="phone" name="phone" type="tel" required
                        placeholder="10-digit number"
                        className="spl-input"
                      />
                    </div>
                  </div>

                  <div className="spl-field" style={{ marginBottom: 16 }}>
                    <label className="spl-label" htmlFor="playingRole">Playing Role</label>
                    <select id="playingRole" name="playingRole" required defaultValue="" className="spl-input">
                      <option value="" disabled>Select your role</option>
                      <option value="All rounder">All rounder</option>
                      <option value="Batter">Batter</option>
                      <option value="Bowler">Bowler</option>
                    </select>
                  </div>

                  {/* Divider */}
                  <div className="spl-divider">
                    <div className="spl-divider-line" />
                    <span className="spl-divider-text">Upload Documents</span>
                    <div className="spl-divider-line" />
                  </div>

                  {/* Photo + Aadhaar */}
                  <div className="spl-upload-grid">
                    <div className="spl-upload-wrap">
                      <label className="spl-label">Player Photo</label>
                      <div className={`spl-upload ${filePreviews.photo ? 'active' : ''}`}>
                        <input
                          id="photo" name="photo" type="file" accept="image/*" required
                          onChange={(e) => handleFileChange(e, 'photo')}
                        />
                        {filePreviews.photo ? (
                          <img src={filePreviews.photo} alt="Player" className="spl-upload-preview" />
                        ) : (
                          <div className="spl-upload-placeholder">
                            <span className="spl-upload-emoji">📸</span>
                            <span className="spl-upload-hint">Tap to upload<br />portrait photo</span>
                            <span className="spl-upload-sub">JPG, PNG</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="spl-upload-wrap">
                      <label className="spl-label">Aadhaar / Govt ID</label>
                      <div className={`spl-upload ${filePreviews.aadhaar ? 'active' : ''}`}>
                        <input
                          id="aadhaar" name="aadhaar" type="file" accept="image/*" required
                          onChange={(e) => handleFileChange(e, 'aadhaar')}
                        />
                        {filePreviews.aadhaar ? (
                          <img src={filePreviews.aadhaar} alt="ID" className="spl-upload-preview" />
                        ) : (
                          <div className="spl-upload-placeholder">
                            <span className="spl-upload-emoji">🪪</span>
                            <span className="spl-upload-hint">Tap to upload<br />Aadhaar / ID</span>
                            <span className="spl-upload-sub">JPG, PNG</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment proof */}
                  <div className="spl-upload-wrap" style={{ marginBottom: 0 }}>
                    <label className="spl-label" style={{ marginBottom: 6, display: 'block' }}>₹300 Payment Screenshot</label>
                    <div className={`spl-upload-full ${filePreviews.paymentProof ? 'active' : ''}`}>
                      <input
                        id="paymentProof" name="paymentProof" type="file" accept="image/*" required
                        onChange={(e) => handleFileChange(e, 'paymentProof')}
                      />
                      {filePreviews.paymentProof ? (
                        <img src={filePreviews.paymentProof} alt="Payment" className="spl-upload-full-preview" />
                      ) : (
                        <div className="spl-upload-full-inner">
                          <span className="spl-upload-full-emoji">💳</span>
                          <span className="spl-upload-full-text">Tap to upload UPI / bank transfer screenshot</span>
                        </div>
                      )}
                    </div>
                    <p className="spl-payment-proof-note">
                      Original payment screenshot is mandatory. Screenshots for payments made to any other UPI ID or phone number will not be considered for verification.
                    </p>
                  </div>

                  {error && (
                    <div className="spl-alert-err">
                      <span>⚠</span> {error}
                    </div>
                  )}
                  {message && (
                    <div className="spl-alert-ok">
                      <span>✓</span> {message}
                    </div>
                  )}

                  <button type="submit" disabled={loading || compressingFiles > 0} className="spl-submit">
                    {compressingFiles > 0 ? 'Preparing images...' : loading ? 'Submitting...' : '🏏  Submit & Join the League'}
                  </button>

                  <p className="spl-form-footer">
                    Your data is secure · Admin verifies within 24 hrs · Contact organiser for support
                  </p>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
