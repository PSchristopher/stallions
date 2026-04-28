'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json();
      setError(data?.error || 'Login failed.');
      return;
    }
    window.location.href = '/admin';
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0b1f3a; --surface: #112240;
          --border: #d0dff0; --blue: #1a5fc8; --blue-lt: #2e74e0;
          --sky: #e8f1fc; --navy-txt: #0b1f3a; --body-txt: #334e72;
          --muted: #7a94b4; --gold: #e8a500; --red: #d93025;
          --radius: 10px; --radius-lg: 16px;
        }
        body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--navy-txt); min-height: 100vh; }
        .spl-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .spl-page { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; }
        .spl-nav {
          background: #0d2249; border-bottom: 2px solid #1a3a6a;
          padding: 0 32px; display: flex; align-items: center; justify-content: space-between; height: 64px;
        }
        .spl-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .spl-logo {
          width: 40px; height: 40px; background: var(--blue); border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif; font-size: 15px; letter-spacing: 1px; color: #fff;
        }
        .spl-brand-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; color: var(--gold); line-height: 1; }
        .spl-brand-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #5b7eaa; font-weight: 600; }
        .spl-nav-back {
          font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: #7aa4d4; text-decoration: none; padding: 8px 16px; border: 1px solid #1f3d6e; border-radius: 7px; transition: all 0.15s;
        }
        .spl-nav-back:hover { background: #1a3a6a; color: #fff; border-color: #2a5a9e; }
        .spl-center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
        .spl-login-wrap { width: 100%; max-width: 440px; }
        .spl-login-top { text-align: center; margin-bottom: 28px; }
        .spl-login-emblem {
          display: inline-flex; align-items: center; justify-content: center;
          width: 68px; height: 68px; background: var(--blue); border-radius: 16px;
          font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 2px; color: #fff;
          border: 3px solid #2e74e0; margin-bottom: 16px;
        }
        .spl-login-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 3px; color: #fff; line-height: 1; margin-bottom: 6px; }
        .spl-login-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #5b7eaa; font-weight: 600; }
        .spl-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
        .spl-card-header {
          background: #0d2249; border-bottom: 2px solid #1a3a6a;
          padding: 16px 28px; display: flex; align-items: center; gap: 10px;
        }
        .spl-card-header-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); }
        .spl-card-header-label {
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase; color: #7aa4d4;
        }
        .spl-card-body { padding: 28px; }
        .spl-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
        .spl-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--body-txt); }
        .spl-input {
          width: 100%; background: #f4f8fe; border: 1.5px solid var(--border); border-radius: var(--radius);
          padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; color: var(--navy-txt);
          transition: border-color 0.15s, box-shadow 0.15s; outline: none;
        }
        .spl-input::placeholder { color: #b0c4de; }
        .spl-input:focus { border-color: var(--blue); background: #fff; box-shadow: 0 0 0 3px rgba(26,95,200,0.1); }
        .spl-divider { height: 1px; background: #eef3fa; margin: 0 0 18px; }
        .spl-alert-err {
          display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin-bottom: 14px;
          background: #fff5f5; border: 1.5px solid #fca5a5; border-radius: var(--radius);
          color: var(--red); font-size: 14px; font-weight: 500;
        }
        .spl-submit {
          width: 100%; padding: 15px 24px; background: var(--blue); color: #fff;
          font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px;
          border: none; border-radius: var(--radius); cursor: pointer;
          transition: background 0.15s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .spl-submit:hover { background: var(--blue-lt); transform: translateY(-1px); }
        .spl-submit:active { transform: translateY(0); }
        .spl-submit:disabled { background: #7aa4d4; cursor: not-allowed; transform: none; }
        .spl-secure-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 18px; }
        .spl-secure-txt { font-size: 11px; color: var(--muted); }
        .spl-card-footer { border-top: 1px solid #eef3fa; padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; }
        .spl-footer-note { font-size: 12px; color: var(--muted); }
        .spl-footer-link {
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase; color: var(--blue); text-decoration: none;
        }
        .spl-footer-link:hover { color: var(--blue-lt); }
      ` }} />

      {/* Cricket SVG Background */}
      <div className="spl-bg">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pitch" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="200" stroke="#1a3a6a" strokeWidth="0.6" opacity="0.6" />
              <line x1="100" y1="0" x2="100" y2="200" stroke="#1a3a6a" strokeWidth="0.4" opacity="0.3" />
            </pattern>
            <pattern id="lines" x="0" y="0" width="200" height="120" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="200" y2="0" stroke="#142e5c" strokeWidth="0.5" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="#0b1f3a" />
          <rect width="100%" height="100%" fill="url(#pitch)" />
          <rect width="100%" height="100%" fill="url(#lines)" />
          <circle cx="88%" cy="12%" r="90" fill="none" stroke="#1e3f6e" strokeWidth="1.5" opacity="0.5" />
          <circle cx="88%" cy="12%" r="70" fill="none" stroke="#1e3f6e" strokeWidth="0.8" opacity="0.3" />
          <path d="M 78% 8% Q 88% 12% 78% 16%" fill="none" stroke="#1e4a7a" strokeWidth="1.5" opacity="0.4" />
          <path d="M 98% 8% Q 88% 12% 98% 16%" fill="none" stroke="#1e4a7a" strokeWidth="1.5" opacity="0.4" />
          <circle cx="95%" cy="90%" r="200" fill="none" stroke="#162f55" strokeWidth="2" opacity="0.35" />
          <ellipse cx="50%" cy="50%" rx="38%" ry="30%" fill="none" stroke="#152d56" strokeWidth="1.5" opacity="0.3" />
          <line x1="30%" y1="38%" x2="70%" y2="38%" stroke="#152d56" strokeWidth="1" opacity="0.25" />
          <line x1="30%" y1="62%" x2="70%" y2="62%" stroke="#152d56" strokeWidth="1" opacity="0.25" />
        </svg>
      </div>

      <div className="spl-page">
        {/* NAV */}
        <nav className="spl-nav">
          <a className="spl-brand" href="/">
            <div className="spl-logo">SPL</div>
            <div>
              <div className="spl-brand-name">Stallions</div>
              <div className="spl-brand-sub">Premiere League</div>
            </div>
          </a>
          <Link href="/" className="spl-nav-back">← Back to Register</Link>
        </nav>

        <div className="spl-center">
          <div className="spl-login-wrap">
            {/* Top badge + title */}
            <div className="spl-login-top">
              <div className="spl-login-emblem">SPL</div>
              <div className="spl-login-title">Admin Portal</div>
              <div className="spl-login-sub">Tournament Management System</div>
            </div>

            {/* Card */}
            <div className="spl-card">
              <div className="spl-card-header">
                <div className="spl-card-header-dot" />
                <span className="spl-card-header-label">Secure Admin Sign In</span>
              </div>

              <div className="spl-card-body">
                <form onSubmit={handleSubmit}>
                  <div className="spl-field">
                    <label className="spl-label" htmlFor="adminEmail">Email Address</label>
                    <input
                      id="adminEmail" type="email" required
                      placeholder="admin@stallions.com"
                      className="spl-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="spl-field" style={{ marginBottom: 22 }}>
                    <label className="spl-label" htmlFor="adminPassword">Password</label>
                    <input
                      id="adminPassword" type="password" required
                      placeholder="••••••••"
                      className="spl-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="spl-divider" />

                  {error && (
                    <div className="spl-alert-err">
                      <span>⚠</span> {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="spl-submit">
                    {loading ? 'Authenticating...' : '🔐  Sign In to Dashboard'}
                  </button>

                  <div className="spl-secure-row">
                    <span className="spl-secure-txt">Encrypted · Access restricted to authorised admins</span>
                  </div>
                </form>
              </div>

              <div className="spl-card-footer">
                <span className="spl-footer-note">Season 2 · SPL 2026</span>
                <a href="#" className="spl-footer-link">Contact Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}