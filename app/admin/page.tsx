'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Registration = {
  id: number;
  name: string;
  phone: string;
  status: string;
  photoUrl: string;
  aadhaarUrl: string;
  paymentProofUrl: string;
  createdAt: string;
};

export default function AdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified'>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(true);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);

  async function loadRegistrations() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/all');
      if (response.status === 401) {
        setAuthorized(false);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Load failed');
      setRegistrations(data.registrations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function updateStatus(id: number, newStatus: 'verified' | 'rejected') {
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus })
    });

    if (response.status === 401) {
      setAuthorized(false);
      return;
    }

    if (!response.ok) {
      const data = await response.json();
      setError(data?.error || 'Unable to update registration.');
      return;
    }

    setSelectedReg(null);
    loadRegistrations();
  }

  function logout() {
    fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  const filtered = registrations.filter(reg => {
    const matchesSearch = reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.phone.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || reg.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
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

        body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: #fff; }

        .spl-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .spl-page { position: relative; z-index: 1; min-height: 100vh; }

        /* NAV */
        .spl-nav {
          background: #0d2249; border-bottom: 2px solid #1a3a6a;
          padding: 0 32px; display: flex; align-items: center; justify-content: space-between; height: 64px;
        }
        .spl-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .spl-logo {
          width: 36px; height: 36px; background: var(--blue); border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif; font-size: 14px; color: #fff;
        }
        .spl-brand-name { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 2px; color: var(--gold); }
        
        .logout-btn {
          font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700;
          color: #fca5a5; border: 1px solid #7f1d1d; padding: 6px 16px; border-radius: 6px; cursor: pointer;
        }

        .admin-container { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }

        /* DASHBOARD HEADER */
        .dash-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
        .dash-title { font-family: 'Bebas Neue', sans-serif; font-size: 42px; letter-spacing: 1px; line-height: 1; }
        .dash-subtitle { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; color: #7ab4f0; letter-spacing: 2px; text-transform: uppercase; }

        /* CONTROLS */
        .controls-row {
          background: #0d2249; border: 1px solid #1a3a6a; border-radius: 12px;
          padding: 16px; display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
        }
        .search-box {
          flex: 1; min-width: 250px; background: #071529; border: 1px solid #1e3f6e;
          border-radius: 8px; padding: 10px 16px; color: #fff; outline: none;
        }
        .filter-tabs { display: flex; background: #071529; padding: 4px; border-radius: 8px; border: 1px solid #1e3f6e; }
        .tab-btn {
          padding: 6px 16px; border-radius: 6px; font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
          cursor: pointer; border: none; color: #5b7eaa; background: transparent; transition: 0.2s;
        }
        .tab-btn.active { background: var(--blue); color: #fff; }

        /* GRID */
        .player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .player-card {
          background: #fff; border-radius: 12px; overflow: hidden; cursor: pointer;
          transition: transform 0.2s; display: flex; flex-direction: column;
        }
        .player-card:hover { transform: translateY(-4px); }
        
        .card-inner { padding: 16px; display: flex; gap: 16px; align-items: center; }
        .p-img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--sky); }
        .p-info { flex: 1; }
        .p-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: var(--navy-txt); letter-spacing: 1px; }
        .p-phone { font-size: 13px; color: var(--muted); }
        
        .status-badge {
          display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px;
          font-family: 'Barlow Condensed', sans-serif; font-weight: 700; text-transform: uppercase; margin-top: 4px;
        }
        .status-pending { background: #fff7ed; color: #9a3412; }
        .status-verified { background: #f0fdf4; color: #166534; }

        /* MODAL */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px);
          z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-content {
          background: #fff; width: 100%; max-width: 900px; border-radius: 20px;
          max-height: 90vh; overflow-y: auto; color: var(--navy-txt); position: relative;
        }
        .modal-body { padding: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        @media (max-width: 768px) { .modal-body { grid-template-columns: 1fr; } }
        
        .doc-view { background: #f4f8fe; border-radius: 12px; padding: 12px; border: 1px solid var(--border); }
        .doc-img { width: 100%; border-radius: 8px; cursor: zoom-in; }
        .doc-label { 
            font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; 
            text-transform: uppercase; color: var(--blue); margin-bottom: 8px; display: block;
        }

        .action-row { margin-top: 24px; display: flex; gap: 12px; }
        .btn-v { flex: 1; padding: 12px; background: #166534; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-r { flex: 1; padding: 12px; background: #991b1b; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }

      ` }} />

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
          <button onClick={logout} className="logout-btn">Log Out</button>
        </nav>

        {!authorized ? (
          <div className="admin-container text-center" style={{ marginTop: '100px' }}>
            <h2 className="dash-title">Access Denied</h2>
            <p className="p-phone">Session expired. Please login again.</p>
            <Link href="/admin/login" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Login</Link>
          </div>
        ) : (
          <main className="admin-container">
            <header className="dash-head">
              <div>
                <div className="dash-subtitle">Management Console</div>
                <h1 className="dash-title">Verification CRM</h1>
              </div>
              <div className="dash-subtitle">Total: {filtered.length} Players</div>
            </header>

            <div className="controls-row">
              <input
                type="text"
                className="search-box"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="filter-tabs">
                <button
                  className={`tab-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('pending')}
                >Pending</button>
                <button
                  className={`tab-btn ${filterStatus === 'verified' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('verified')}
                >Verified</button>
                <button
                  className={`tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >All</button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 dash-subtitle">Fetching Database...</div>
            ) : (
              <div className="player-grid">
                {filtered.map((reg) => (
                  <div key={reg.id} className="player-card" onClick={() => setSelectedReg(reg)}>
                    <div className="card-inner">
                      <img src={reg.photoUrl} className="p-img" alt="" />
                      <div className="p-info">
                        <div className="p-name">{reg.name}</div>
                        <div className="p-phone">{reg.phone}</div>
                        <span className={`status-badge ${reg.status === 'verified' ? 'status-verified' : 'status-pending'}`}>
                          {reg.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {/* MODAL */}
      {selectedReg && (
        <div className="modal-overlay" onClick={() => setSelectedReg(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <div>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
                  <img src={selectedReg.photoUrl} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} alt="" />
                  <div>
                    <h2 className="p-name" style={{ fontSize: '32px' }}>{selectedReg.name}</h2>
                    <p className="p-phone">{selectedReg.phone}</p>
                    <p className="p-phone">Registered: {new Date(selectedReg.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="doc-view" style={{ marginBottom: '20px' }}>
                  <span className="doc-label">Payment Proof (₹300)</span>
                  <a href={selectedReg.paymentProofUrl} target="_blank">
                    <img src={selectedReg.paymentProofUrl} className="doc-img" alt="Payment" />
                  </a>
                </div>

                {selectedReg.status === 'pending' && (
                  <div className="action-row">
                    <button className="btn-v" onClick={() => updateStatus(selectedReg.id, 'verified')}>Approve Player</button>
                    <button className="btn-r" onClick={() => updateStatus(selectedReg.id, 'rejected')}>Reject</button>
                  </div>
                )}
              </div>

              <div>
                <div className="doc-view">
                  <span className="doc-label">Aadhaar / ID Card</span>
                  <a href={selectedReg.aadhaarUrl} target="_blank">
                    <img src={selectedReg.aadhaarUrl} className="doc-img" alt="ID" />
                  </a>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedReg(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
            >✕</button>
          </div>
        </div>
      )}
    </>
  );
}