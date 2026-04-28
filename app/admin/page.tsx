'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type RegistrationStatus = 'pending' | 'verified' | 'rejected';
type AdminView = 'players' | 'lot';
type PlayerFilter = 'all' | RegistrationStatus;

type Registration = {
  id: number;
  name: string;
  phone: string;
  status: RegistrationStatus;
  photoUrl: string;
  aadhaarUrl: string;
  paymentProofUrl: string;
  createdAt: string;
};

type ImagePreview = {
  url: string;
  title: string;
};

function getStatusLabel(status: RegistrationStatus) {
  if (status === 'rejected') return 'Unsold';
  if (status === 'verified') return 'Sold';
  return 'Pending';
}

function getStatusClass(status: RegistrationStatus) {
  if (status === 'verified') return 'status-verified';
  if (status === 'rejected') return 'status-rejected';
  return 'status-pending';
}

export default function AdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeView, setActiveView] = useState<AdminView>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<PlayerFilter>('pending');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(true);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [lotPlayer, setLotPlayer] = useState<Registration | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lotMessage, setLotMessage] = useState<string | null>(null);

  async function loadRegistrations() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/all', { cache: 'no-store' });
      if (response.status === 401) {
        setAuthorized(false);
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Load failed');
      }

      setRegistrations(data.registrations);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function updateStatus(id: number, newStatus: RegistrationStatus) {
    setError(null);
    setSaving(true);

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (response.status === 401) {
        setAuthorized(false);
        return false;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error || 'Unable to update registration.');
        return false;
      }

      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === id ? { ...registration, status: newStatus } : registration
        )
      );
      setSelectedReg((current) =>
        current && current.id === id ? { ...current, status: newStatus } : current
      );
      setLotPlayer((current) =>
        current && current.id === id ? { ...current, status: newStatus } : current
      );

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update registration.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => {
      window.location.href = '/admin/login';
    });
  }

  function openImage(url: string, title: string) {
    setImagePreview({ url, title });
  }

  function startLot() {
    const pool = registrations.filter((registration) => registration.status !== 'verified');
    if (pool.length === 0) {
      setLotPlayer(null);
      setLotMessage('No available registered players are left for the lot.');
      return;
    }

    setIsSpinning(true);
    setLotPlayer(null);
    setLotMessage(`Selecting randomly from ${pool.length} eligible registrations...`);

    window.setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const pickedPlayer = pool[randomIndex];
      setLotPlayer(pickedPlayer);
      setLotMessage(
        pickedPlayer.status === 'rejected'
          ? 'Unsold player selected again and remains in the lot pool.'
          : 'New player selected from the current registration pool.'
      );
      setIsSpinning(false);
    }, 900);
  }

  async function handleLotDecision(newStatus: RegistrationStatus) {
    if (!lotPlayer) return;

    const player = lotPlayer;
    const updated = await updateStatus(player.id, newStatus);
    if (!updated) return;

    setLotMessage(
      newStatus === 'verified'
        ? `${player.name} was accepted and will not appear in future lots.`
        : `${player.name} was marked unsold and can appear again in the next lot draw.`
    );
    setLotPlayer(null);
  }

  const filtered = registrations.filter((registration) => {
    const matchesSearch =
      registration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      registration.phone.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || registration.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const pendingCount = registrations.filter((registration) => registration.status === 'pending').length;
  const verifiedCount = registrations.filter((registration) => registration.status === 'verified').length;
  const rejectedCount = registrations.filter((registration) => registration.status === 'rejected').length;
  const eligibleLotCount = registrations.filter((registration) => registration.status !== 'verified').length;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap');

        :root {
          --bg: #0b1f3a;
          --surface: #112240;
          --card: #ffffff;
          --border: #d0dff0;
          --blue: #1a5fc8;
          --blue-lt: #2e74e0;
          --sky: #e8f1fc;
          --navy-txt: #0b1f3a;
          --body-txt: #334e72;
          --muted: #7a94b4;
          --gold: #e8a500;
          --radius-lg: 16px;
        }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: #fff;
        }

        .spl-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .spl-page { position: relative; z-index: 1; min-height: 100vh; }

        .spl-nav {
          background: #0d2249;
          border-bottom: 2px solid #1a3a6a;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .spl-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .spl-logo {
          width: 36px;
          height: 36px;
          background: var(--blue);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          color: #fff;
        }
        .spl-brand-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 2px;
          color: var(--gold);
        }

        .logout-btn {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #fca5a5;
          border: 1px solid #7f1d1d;
          padding: 6px 16px;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
        }

        .admin-container { max-width: 1280px; margin: 0 auto; padding: 40px 24px; }
        .admin-shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 24px; align-items: start; }
        .content-panel { min-width: 0; }
        @media (max-width: 980px) {
          .admin-shell { grid-template-columns: 1fr; }
        }

        .side-panel {
          background: rgba(13, 34, 73, 0.92);
          border: 1px solid #1a3a6a;
          border-radius: 18px;
          padding: 22px;
          position: sticky;
          top: 24px;
          box-shadow: 0 24px 48px rgba(2, 11, 24, 0.35);
        }
        @media (max-width: 980px) {
          .side-panel { position: static; }
        }
        .side-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #7ab4f0;
          margin-bottom: 12px;
        }
        .side-nav {
          display: grid;
          gap: 10px;
          margin-bottom: 20px;
        }
        .side-nav-btn {
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid #1e3f6e;
          background: #071529;
          color: #d9e8fb;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
        }
        .side-nav-btn:hover {
          transform: translateY(-1px);
          border-color: #2e74e0;
        }
        .side-nav-btn.active {
          background: linear-gradient(135deg, rgba(26, 95, 200, 0.95), rgba(46, 116, 224, 0.8));
          border-color: #4a8bf0;
        }
        .side-nav-title {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 1px;
          font-size: 24px;
          line-height: 1;
        }
        .side-nav-copy {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: #c0d7f5;
        }
        .summary-stack {
          display: grid;
          gap: 10px;
        }
        .summary-card {
          background: rgba(7, 21, 41, 0.9);
          border: 1px solid #1e3f6e;
          border-radius: 12px;
          padding: 14px 16px;
        }
        .summary-value {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 30px;
          letter-spacing: 1px;
          color: #fff;
          line-height: 1;
        }
        .summary-copy {
          font-size: 12px;
          color: #9ab8de;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .dash-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .dash-head { flex-direction: column; align-items: flex-start; }
        }
        .dash-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 42px;
          letter-spacing: 1px;
          line-height: 1;
        }
        .dash-subtitle {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px;
          color: #7ab4f0;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .section-card {
          background: rgba(13, 34, 73, 0.92);
          border: 1px solid #1a3a6a;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 24px 48px rgba(2, 11, 24, 0.35);
        }
        .section-card + .section-card { margin-top: 20px; }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .panel-head { flex-direction: column; }
        }
        .panel-copy { max-width: 640px; }
        .panel-copy p {
          margin-top: 8px;
          color: #b8d0ef;
          font-size: 14px;
          line-height: 1.6;
        }
        .panel-chip {
          background: rgba(7, 21, 41, 0.9);
          border: 1px solid #1e3f6e;
          border-radius: 999px;
          padding: 8px 14px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #dce9fb;
          white-space: nowrap;
        }

        .controls-row {
          background: #0d2249;
          border: 1px solid #1a3a6a;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .search-box {
          flex: 1;
          min-width: 250px;
          background: #071529;
          border: 1px solid #1e3f6e;
          border-radius: 8px;
          padding: 10px 16px;
          color: #fff;
          outline: none;
        }
        .filter-tabs {
          display: flex;
          background: #071529;
          padding: 4px;
          border-radius: 8px;
          border: 1px solid #1e3f6e;
          overflow-x: auto;
        }
        .tab-btn {
          padding: 6px 16px;
          border-radius: 6px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          border: none;
          color: #5b7eaa;
          background: transparent;
          transition: 0.2s;
          white-space: nowrap;
        }
        .tab-btn.active { background: var(--blue); color: #fff; }

        .player-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .player-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
        }
        .player-card:hover { transform: translateY(-4px); }
        .card-inner { padding: 16px; display: flex; gap: 16px; align-items: center; }
        .p-img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--sky);
        }
        .p-info { flex: 1; }
        .p-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          color: var(--navy-txt);
          letter-spacing: 1px;
        }
        .p-phone { font-size: 13px; color: var(--muted); }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .status-pending { background: #fff7ed; color: #9a3412; }
        .status-verified { background: #f0fdf4; color: #166534; }
        .status-rejected { background: #fef2f2; color: #b91c1c; }

        .empty-state {
          background: rgba(7, 21, 41, 0.85);
          border: 1px dashed #32558b;
          border-radius: 14px;
          padding: 32px 24px;
          text-align: center;
          color: #b8d0ef;
        }
        .empty-state strong {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 1px;
          color: #fff;
          margin-bottom: 8px;
        }

        .text-btn {
          background: transparent;
          color: var(--blue-lt);
          border: none;
          cursor: pointer;
          padding: 0;
          font-size: 13px;
          font-weight: 600;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-content {
          background: #fff;
          width: 100%;
          max-width: 900px;
          border-radius: 20px;
          max-height: 90vh;
          overflow-y: auto;
          color: var(--navy-txt);
          position: relative;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4);
        }
        .modal-body {
          padding: 32px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        @media (max-width: 768px) {
          .modal-body { grid-template-columns: 1fr; }
        }
        .profile-photo-large {
          width: 120px;
          height: 120px;
          border-radius: 18px;
          object-fit: cover;
          cursor: zoom-in;
          border: 3px solid var(--sky);
          box-shadow: 0 16px 30px rgba(26, 95, 200, 0.16);
        }
        .doc-view {
          background: #f4f8fe;
          border-radius: 12px;
          padding: 12px;
          border: 1px solid var(--border);
        }
        .doc-img {
          width: 100%;
          border-radius: 8px;
          cursor: zoom-in;
        }
        .doc-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 8px;
          display: block;
        }
        .action-row {
          margin-top: 24px;
          display: flex;
          gap: 12px;
        }
        .btn-v,
        .btn-r,
        .lot-btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }
        .btn-v:hover,
        .btn-r:hover,
        .lot-btn:hover {
          transform: translateY(-1px);
        }
        .btn-v:disabled,
        .btn-r:disabled,
        .lot-btn:disabled {
          opacity: 0.65;
          cursor: wait;
          transform: none;
        }
        .btn-v { background: #166534; color: #fff; }
        .btn-r { background: #991b1b; color: #fff; }
        .lot-btn {
          background: linear-gradient(135deg, #e8a500, #facc15);
          color: var(--navy-txt);
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 2px;
          box-shadow: 0 16px 36px rgba(232, 165, 0, 0.24);
        }

        .lot-stage {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 24px;
          align-items: stretch;
        }
        @media (max-width: 980px) {
          .lot-stage { grid-template-columns: 1fr; }
        }
        .lot-hero {
          background: radial-gradient(circle at top right, rgba(232, 165, 0, 0.24), transparent 34%), rgba(7, 21, 41, 0.82);
          border: 1px solid #1e3f6e;
          border-radius: 18px;
          padding: 28px;
          min-height: 340px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .lot-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
        .lot-meta-item {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid #2a4f83;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 12px;
          color: #dce9fb;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .lot-note {
          margin-top: 14px;
          color: #c5dbf6;
          font-size: 14px;
          min-height: 22px;
          line-height: 1.6;
        }
        .lot-result {
          background: #fff;
          border-radius: 18px;
          color: var(--navy-txt);
          overflow: hidden;
          min-height: 340px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 48px rgba(2, 11, 24, 0.3);
        }
        .lot-result-body {
          padding: 28px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .lot-photo {
          width: 176px;
          height: 176px;
          border-radius: 22px;
          object-fit: cover;
          margin: 0 auto 20px;
          cursor: zoom-in;
          border: 4px solid var(--sky);
        }
        .lot-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--body-txt);
          background: linear-gradient(180deg, #f5f9ff 0%, #edf4fc 100%);
          padding: 24px;
        }
        .lot-empty strong {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 1px;
          font-size: 28px;
          margin-bottom: 10px;
          color: var(--navy-txt);
        }

        .viewer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 10, 22, 0.96);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .viewer-frame {
          position: relative;
          width: min(96vw, 1400px);
          height: min(94vh, 940px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .viewer-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.04);
        }
        .viewer-close {
          position: absolute;
          top: 16px;
          right: 16px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(8, 18, 38, 0.8);
          color: #fff;
          border-radius: 999px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 700;
        }
        .viewer-caption {
          position: absolute;
          left: 16px;
          bottom: 16px;
          background: rgba(8, 18, 38, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #d9e8fb;
        }
      `
        }}
      />

      <div className="spl-bg">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#0b1f3a" />
          <circle cx="90%" cy="10%" r="120" fill="none" stroke="#1e3f6e" strokeWidth="1" opacity="0.4" />
          <path d="M 0 100 Q 250 150 0 200" fill="none" stroke="#1e3f6e" strokeWidth="1" opacity="0.2" />
        </svg>
      </div>

      <div className="spl-page">
        <nav className="spl-nav">
          <Link className="spl-brand" href="/">
            <div className="spl-logo">SPL</div>
            <div className="spl-brand-name">Stallions Admin</div>
          </Link>
          <button type="button" onClick={logout} className="logout-btn">
            Log Out
          </button>
        </nav>

        {!authorized ? (
          <div className="admin-container" style={{ marginTop: '100px', textAlign: 'center' }}>
            <h2 className="dash-title">Access Denied</h2>
            <p className="p-phone">Session expired. Please login again.</p>
            <Link href="/admin/login" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
              Login
            </Link>
          </div>
        ) : (
          <main className="admin-container">
            <header className="dash-head">
              <div>
                <div className="dash-subtitle">Management Console</div>
                <h1 className="dash-title">Verification CRM</h1>
              </div>
              <div className="dash-subtitle">
                {activeView === 'players'
                  ? `Visible: ${filtered.length} Players`
                  : `Eligible for Lot: ${eligibleLotCount}`}
              </div>
            </header>

            <div className="admin-shell">
              <aside className="side-panel">
                <div className="side-label">Admin Navigation</div>
                <div className="side-nav">
                  <button
                    type="button"
                    className={`side-nav-btn ${activeView === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveView('players')}
                  >
                    <span className="side-nav-title">Players</span>
                    <span className="side-nav-copy">
                      Review registrations, documents, and approval status.
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`side-nav-btn ${activeView === 'lot' ? 'active' : ''}`}
                    onClick={() => setActiveView('lot')}
                  >
                    <span className="side-nav-title">Lot</span>
                    <span className="side-nav-copy">
                      Draw one random registration, then accept or decline.
                    </span>
                  </button>
                </div>

                <div className="side-label">Live Summary</div>
                <div className="summary-stack">
                  <div className="summary-card">
                    <span className="summary-value">{registrations.length}</span>
                    <span className="summary-copy">Total registrations</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-value">{pendingCount}</span>
                    <span className="summary-copy">Pending review</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-value">{verifiedCount}</span>
                    <span className="summary-copy">Sold / accepted</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-value">{rejectedCount}</span>
                    <span className="summary-copy">Unsold and reusable</span>
                  </div>
                </div>
              </aside>

              <div className="content-panel">
                {error ? (
                  <div className="section-card" style={{ marginBottom: 20, borderColor: '#7f1d1d' }}>
                    <div className="dash-subtitle" style={{ color: '#fca5a5' }}>
                      Action Needed
                    </div>
                    <p style={{ color: '#ffe4e6', marginTop: 8 }}>{error}</p>
                  </div>
                ) : null}

                {loading ? (
                  <div className="section-card">
                    <div className="empty-state">
                      <strong>Fetching Database</strong>
                      Loading the latest registrations for admin review.
                    </div>
                  </div>
                ) : activeView === 'players' ? (
                  <>
                    <div className="section-card">
                      <div className="panel-head">
                        <div className="panel-copy">
                          <div className="dash-subtitle">Player Review</div>
                          <h2 className="dash-title" style={{ fontSize: 34 }}>
                            Registrations
                          </h2>
                          <p>
                            Search by player name or phone, open a profile, then click any profile or
                            document image to inspect it in full screen.
                          </p>
                        </div>
                        <div className="panel-chip">{filtered.length} matching players</div>
                      </div>

                      <div className="controls-row" style={{ marginBottom: 0 }}>
                        <input
                          type="text"
                          className="search-box"
                          placeholder="Search by name or phone..."
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                        />
                        <div className="filter-tabs">
                          <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('pending')}
                          >
                            Pending
                          </button>
                          <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'verified' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('verified')}
                          >
                            Sold
                          </button>
                          <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('rejected')}
                          >
                            Unsold
                          </button>
                          <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('all')}
                          >
                            All
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="section-card">
                      {filtered.length === 0 ? (
                        <div className="empty-state">
                          <strong>No Players Found</strong>
                          Try another search term or switch the status filter to view more registrations.
                        </div>
                      ) : (
                        <div className="player-grid">
                          {filtered.map((registration) => (
                            <div
                              key={registration.id}
                              className="player-card"
                              onClick={() => setSelectedReg(registration)}
                            >
                              <div className="card-inner">
                                <img
                                  src={registration.photoUrl}
                                  className="p-img"
                                  alt={`${registration.name} profile`}
                                />
                                <div className="p-info">
                                  <div className="p-name">{registration.name}</div>
                                  <div className="p-phone">{registration.phone}</div>
                                  <span className={`status-badge ${getStatusClass(registration.status)}`}>
                                    {getStatusLabel(registration.status)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="section-card">
                    <div className="panel-head">
                      <div className="panel-copy">
                        <div className="dash-subtitle">Lottery Console</div>
                        <h2 className="dash-title" style={{ fontSize: 34 }}>
                          Random Lot Draw
                        </h2>
                        <p>
                          Start the lot to pull one random registration. Accepted players are marked
                          sold and removed from future draws. Declined players are marked unsold and
                          stay eligible for the next random pick.
                        </p>
                      </div>
                      <div className="panel-chip">{eligibleLotCount} players in lot pool</div>
                    </div>

                    <div className="lot-stage">
                      <div className="lot-hero">
                        <button
                          type="button"
                          className="lot-btn"
                          onClick={startLot}
                          disabled={isSpinning || saving || eligibleLotCount === 0}
                        >
                          {isSpinning ? 'Selecting...' : 'Start Lot'}
                        </button>

                        <div className="lot-meta">
                          <span className="lot-meta-item">Pending: {pendingCount}</span>
                          <span className="lot-meta-item">Unsold: {rejectedCount}</span>
                          <span className="lot-meta-item">Sold excluded: {verifiedCount}</span>
                        </div>

                        <p className="lot-note">
                          {lotMessage || 'Press Start Lot to select one player from the active pool.'}
                        </p>
                      </div>

                      <div className="lot-result">
                        {lotPlayer ? (
                          <div className="lot-result-body">
                            <img
                              src={lotPlayer.photoUrl}
                              className="lot-photo"
                              alt={`${lotPlayer.name} profile`}
                              onClick={() =>
                                openImage(lotPlayer.photoUrl, `${lotPlayer.name} profile picture`)
                              }
                            />
                            <div
                              className="p-name"
                              style={{ fontSize: 34, textAlign: 'center', marginBottom: 8 }}
                            >
                              {lotPlayer.name}
                            </div>
                            <div className="p-phone" style={{ textAlign: 'center', marginBottom: 8 }}>
                              {lotPlayer.phone}
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                              <span className={`status-badge ${getStatusClass(lotPlayer.status)}`}>
                                {getStatusLabel(lotPlayer.status)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="text-btn"
                              onClick={() => setSelectedReg(lotPlayer)}
                              style={{ margin: '0 auto 10px' }}
                            >
                              Review full profile
                            </button>
                            <div className="action-row" style={{ marginTop: 'auto' }}>
                              <button
                                type="button"
                                className="btn-v"
                                onClick={() => handleLotDecision('verified')}
                                disabled={saving}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn-r"
                                onClick={() => handleLotDecision('rejected')}
                                disabled={saving}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="lot-empty">
                            <div>
                              <strong>{isSpinning ? 'Selecting Player' : 'Ready For Draw'}</strong>
                              {isSpinning
                                ? 'The system is picking one random registration from the current lot pool.'
                                : 'The next random player will appear here with Accept and Decline controls.'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      {imagePreview ? (
        <div className="viewer-overlay" onClick={() => setImagePreview(null)}>
          <div className="viewer-frame" onClick={(event) => event.stopPropagation()}>
            <img src={imagePreview.url} className="viewer-image" alt={imagePreview.title} />
            <button
              type="button"
              className="viewer-close"
              onClick={() => setImagePreview(null)}
            >
              Close
            </button>
            <div className="viewer-caption">{imagePreview.title}</div>
          </div>
        </div>
      ) : null}

      {selectedReg ? (
        <div className="modal-overlay" onClick={() => setSelectedReg(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-body">
              <div>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
                  <img
                    src={selectedReg.photoUrl}
                    className="profile-photo-large"
                    alt={`${selectedReg.name} profile`}
                    onClick={() => openImage(selectedReg.photoUrl, `${selectedReg.name} profile picture`)}
                  />
                  <div>
                    <h2 className="p-name" style={{ fontSize: '32px' }}>
                      {selectedReg.name}
                    </h2>
                    <p className="p-phone">{selectedReg.phone}</p>
                    <p className="p-phone">
                      Registered: {new Date(selectedReg.createdAt).toLocaleDateString()}
                    </p>
                    <span className={`status-badge ${getStatusClass(selectedReg.status)}`}>
                      {getStatusLabel(selectedReg.status)}
                    </span>
                  </div>
                </div>

                <div className="doc-view" style={{ marginBottom: '20px' }}>
                  <span className="doc-label">Payment Proof (Rs. 300)</span>
                  <img
                    src={selectedReg.paymentProofUrl}
                    className="doc-img"
                    alt="Payment proof"
                    onClick={() =>
                      openImage(selectedReg.paymentProofUrl, `${selectedReg.name} payment proof`)
                    }
                  />
                </div>

                {selectedReg.status !== 'verified' ? (
                  <div className="action-row">
                    <button
                      type="button"
                      className="btn-v"
                      disabled={saving}
                      onClick={async () => {
                        const player = selectedReg;
                        const updated = await updateStatus(player.id, 'verified');
                        if (!updated) return;

                        setLotMessage(`${player.name} was accepted and removed from future lots.`);
                        setLotPlayer((current) =>
                          current && current.id === player.id ? null : current
                        );
                        setSelectedReg(null);
                      }}
                    >
                      Approve Player
                    </button>
                    <button
                      type="button"
                      className="btn-r"
                      disabled={saving}
                      onClick={async () => {
                        const player = selectedReg;
                        const updated = await updateStatus(player.id, 'rejected');
                        if (!updated) return;

                        setLotMessage(`${player.name} was marked unsold and can return in future lots.`);
                        setLotPlayer((current) =>
                          current && current.id === player.id ? null : current
                        );
                        setSelectedReg(null);
                      }}
                    >
                      Mark Unsold
                    </button>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="doc-view">
                  <span className="doc-label">Aadhaar / ID Card</span>
                  <img
                    src={selectedReg.aadhaarUrl}
                    className="doc-img"
                    alt="Aadhaar or ID card"
                    onClick={() =>
                      openImage(selectedReg.aadhaarUrl, `${selectedReg.name} Aadhaar or ID card`)
                    }
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReg(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              x
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
