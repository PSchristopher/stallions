'use client';

import { useRef, useState } from 'react';

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

    const form = new FormData(event.currentTarget);

    const response = await fetch('/api/register', {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result?.error || 'Unable to submit registration.');
      return;
    }

    setMessage('Registration submitted successfully. Admin will verify payment soon.');
    formRef.current?.reset();
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
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Registration'}</button>
        </form>
      </div>
    </main>
  );
}
