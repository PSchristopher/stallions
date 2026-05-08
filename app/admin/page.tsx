'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type RegistrationStatus = 'pending' | 'approved' | 'sold' | 'unsold' | 'verified' | 'rejected';
type AdminView = 'players' | 'lot';
type PlayerFilter = 'all' | 'pending' | 'approved' | 'sold' | 'unsold';

type Registration = {
  id: number;
  name: string;
  phone: string;
  playingRole: string;
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

const whatsappGroupInviteUrl = 'https://chat.whatsapp.com/C6YO6ywZIq96LlnNJ6GS41?mode=gi_t';

function getStatusLabel(status: RegistrationStatus) {
  if (status === 'approved' || status === 'verified') return 'Approved';
  if (status === 'sold') return 'Sold';
  if (status === 'unsold' || status === 'rejected') return 'Unsold';
  return 'Pending';
}

function getStatusClass(status: RegistrationStatus) {
  if (status === 'approved' || status === 'verified') return 'status-approved';
  if (status === 'sold') return 'status-sold';
  if (status === 'unsold' || status === 'rejected') return 'status-unsold';
  return 'status-pending';
}

function isApprovedForLot(status: RegistrationStatus) {
  return status === 'approved' || status === 'verified' || status === 'unsold' || status === 'rejected';
}

function isStatusMatch(status: RegistrationStatus, filter: PlayerFilter) {
  if (filter === 'all') return true;
  if (filter === 'approved') return status === 'approved' || status === 'verified';
  if (filter === 'unsold') return status === 'unsold' || status === 'rejected';
  return status === filter;
}

function getWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

function getApprovalWhatsAppUrl(player: Registration) {
  const groupLine = whatsappGroupInviteUrl
    ? `Join the official SPL player group here: ${whatsappGroupInviteUrl}`
    : 'The official SPL player group invite will be shared shortly.';
  const message = [
    `Hi ${player.name}, your SPL Season 2 registration is approved.`,
    `Playing role: ${player.playingRole}.`,
    groupLine,
    'Please keep your payment screenshot and ID proof available if the organiser asks for verification.'
  ].join('\n\n');

  return `https://wa.me/${getWhatsAppPhone(player.phone)}?text=${encodeURIComponent(message)}`;
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
    const pool = registrations.filter((registration) => isApprovedForLot(registration.status));
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
        pickedPlayer.status === 'unsold' || pickedPlayer.status === 'rejected'
          ? 'Unsold approved player selected again from the lot pool.'
          : 'Approved player selected from the current lot pool.'
      );
      setIsSpinning(false);
    }, 5000);
  }

  async function handleLotDecision(newStatus: RegistrationStatus) {
    if (!lotPlayer) return;

    const player = lotPlayer;
    const updated = await updateStatus(player.id, newStatus);
    if (!updated) return;

    setLotMessage(
      newStatus === 'sold'
        ? `${player.name} was marked sold and removed from future lots.`
        : `${player.name} was marked unsold and can appear again in the next lot draw.`
    );
    setLotPlayer(null);
  }

  async function approveAndOpenWhatsApp(player: Registration) {
    const whatsappWindow = window.open('about:blank', '_blank');
    const updated = await updateStatus(player.id, 'approved');
    if (!updated) {
      whatsappWindow?.close();
      return;
    }

    setLotMessage(`${player.name} was approved and added to the lot pool.`);
    setLotPlayer((current) => (current && current.id === player.id ? null : current));
    setSelectedReg(null);

    const whatsappUrl = getApprovalWhatsAppUrl(player);
    if (whatsappWindow) {
      whatsappWindow.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  }

  const filtered = registrations.filter((registration) => {
    const matchesSearch =
      registration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      registration.phone.includes(searchQuery);
    const matchesFilter = isStatusMatch(registration.status, filterStatus);

    return matchesSearch && matchesFilter;
  });

  const pendingCount = registrations.filter((registration) => registration.status === 'pending').length;
  const approvedCount = registrations.filter((registration) => registration.status === 'approved' || registration.status === 'verified').length;
  const soldCount = registrations.filter((registration) => registration.status === 'sold').length;
  const unsoldCount = registrations.filter((registration) => registration.status === 'unsold' || registration.status === 'rejected').length;
  const eligibleLotCount = registrations.filter((registration) => isApprovedForLot(registration.status)).length;

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
        .status-approved { background: #eff6ff; color: #1d4ed8; }
        .status-sold { background: #f0fdf4; color: #166534; }
        .status-unsold { background: #fef2f2; color: #b91c1c; }

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
          font-size: 22px;
          letter-spacing: 2px;
          box-shadow: 0 16px 36px rgba(232, 165, 0, 0.24);
          min-height: 160px;
        }

        .lot-stage {
          display: grid;
          grid-template-columns: minmax(250px, 0.72fr) minmax(360px, 1.08fr);
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
          padding: 20px;
          min-height: 280px;
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
        .lot-picker-loading {
          min-height: 340px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          text-align: center;
          color: var(--body-txt);
          background:
            radial-gradient(circle at 50% 26%, rgba(232, 165, 0, 0.18), transparent 28%),
            linear-gradient(180deg, #f8fbff 0%, #edf4fc 100%);
          padding: 28px;
        }
        .lot-bottle-scene {
          width: min(360px, 96%);
          height: 246px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }
        .lot-bottle {
          width: 142px;
          height: 166px;
          border-radius: 52px 52px 32px 32px;
          border: 5px solid rgba(30, 63, 110, 0.95);
          background:
            radial-gradient(circle at 34% 40%, rgba(255,255,255,0.92) 0 18%, transparent 19%),
            linear-gradient(115deg, rgba(255,255,255,0.84), rgba(232,241,252,0.38) 48%, rgba(193,212,238,0.42)),
            linear-gradient(180deg, rgba(255,255,255,0.28), rgba(26,95,200,0.08));
          box-shadow:
            inset 0 0 0 9px rgba(255,255,255,0.34),
            inset -14px -16px 28px rgba(30,63,110,0.1),
            0 26px 54px rgba(26,95,200,0.2);
          position: relative;
          animation: bottleDrawShake 5s ease-in-out forwards;
          transform-origin: 50% 88%;
          overflow: visible;
          z-index: 2;
        }
        .lot-bottle::before {
          content: '';
          position: absolute;
          top: -40px;
          left: 39px;
          width: 54px;
          height: 48px;
          border-radius: 17px 17px 8px 8px;
          border: 5px solid rgba(30, 63, 110, 0.95);
          border-bottom: none;
          background: linear-gradient(180deg, rgba(232,241,252,0.94), rgba(255,255,255,0.54));
          box-shadow: inset 0 0 0 7px rgba(255,255,255,0.28);
        }
        .lot-bottle::after {
          content: '';
          position: absolute;
          top: 28px;
          left: 26px;
          width: 20px;
          height: 102px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.08));
          transform: rotate(22deg);
          z-index: 3;
          pointer-events: none;
        }
        .bottle-paper-layer {
          position: absolute;
          left: 12px;
          right: 12px;
          top: 26px;
          bottom: 12px;
          border-radius: 42px 42px 24px 24px;
          overflow: hidden;
          z-index: 1;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(30,63,110,0.04));
        }
        .paper-slip {
          position: absolute;
          width: 58px;
          height: 22px;
          border-radius: 6px 10px 6px 10px;
          background:
            linear-gradient(90deg, transparent 49%, rgba(180,198,224,0.3) 50%, transparent 51%),
            linear-gradient(135deg, #fff, #f6f9ff);
          border: 1px solid rgba(164,184,214,0.72);
          box-shadow: 0 8px 18px rgba(10,31,58,0.1);
        }
        .paper-slip.one {
          left: 12px;
          top: 34px;
          transform: rotate(-18deg);
          animation: slipTumbleOne 0.62s ease-in-out 0s 7;
        }
        .paper-slip.two {
          left: 54px;
          top: 66px;
          transform: rotate(16deg);
          animation: slipTumbleTwo 0.7s ease-in-out 0s 6;
        }
        .paper-slip.three {
          left: 35px;
          top: 102px;
          transform: rotate(-6deg);
          animation: slipTumbleThree 0.76s ease-in-out 0s 6;
        }
        .lot-hand {
          position: absolute;
          top: 46px;
          right: -92px;
          width: 190px;
          height: 92px;
          background: transparent;
          transform-origin: left center;
          animation: handReachPick 5s ease-in-out forwards;
          z-index: 5;
        }
        .lot-hand::before {
          content: '';
          position: absolute;
          right: -20px;
          top: 14px;
          width: 72px;
          height: 64px;
          border-radius: 16px 8px 8px 16px;
          background: linear-gradient(135deg, #253f77, #12254e);
          box-shadow: inset 8px 0 18px rgba(255,255,255,0.08), 0 14px 26px rgba(17,37,78,0.16);
        }
        .lot-hand::after {
          content: '';
          position: absolute;
          right: 34px;
          top: 17px;
          width: 108px;
          height: 62px;
          border-radius: 44px 22px 24px 42px;
          background:
            radial-gradient(circle at 28% 60%, rgba(139,78,42,0.16), transparent 28%),
            linear-gradient(135deg, #d58f59 0%, #f2c094 46%, #dea06b 82%);
          box-shadow: 0 18px 30px rgba(83,47,24,0.14);
        }
        .hand-thumb {
          position: absolute;
          left: 10px;
          top: 47px;
          width: 82px;
          height: 22px;
          border-radius: 999px 16px 16px 999px;
          background: linear-gradient(135deg, #f3c39a, #d48850);
          transform: rotate(13deg);
          z-index: 10;
          box-shadow: 0 8px 14px rgba(83,47,24,0.12);
        }
        .hand-finger {
          position: absolute;
          height: 20px;
          border-radius: 999px 12px 12px 999px;
          background: linear-gradient(135deg, #efba8c, #c87a47);
          z-index: 9;
        }
        .hand-finger.one {
          left: 4px;
          top: 28px;
          width: 98px;
          transform: rotate(-7deg);
          background: linear-gradient(135deg, #f4c79e, #d98f57);
          box-shadow: 0 8px 14px rgba(83,47,24,0.1);
        }
        .hand-finger.two {
          display: none;
        }
        .hand-finger.three {
          display: none;
        }
        .paper-picked {
          position: absolute;
          top: 62px;
          right: 126px;
          width: 90px;
          height: 32px;
          border-radius: 7px 11px 7px 11px;
          border: 1px solid #e4b441;
          background:
            linear-gradient(90deg, transparent 48%, rgba(220,170,50,0.18) 50%, transparent 52%),
            linear-gradient(135deg, #fff8db, #fff);
          box-shadow: 0 14px 28px rgba(232,165,0,0.2);
          animation: paperPickWithHand 5s ease-in-out forwards;
          transform-origin: right center;
          z-index: 8;
        }
        .paper-picked::before,
        .paper-picked::after {
          content: '';
          position: absolute;
          left: 12px;
          right: 12px;
          height: 2px;
          background: #d8a11b;
          opacity: 0.42;
        }
        .paper-picked::before { top: 10px; }
        .paper-picked::after { top: 18px; }
        .lot-shadow {
          position: absolute;
          bottom: 8px;
          width: 212px;
          height: 26px;
          border-radius: 50%;
          background: rgba(10,31,58,0.12);
          filter: blur(2px);
          animation: shadowPulse 5s ease-in-out forwards;
        }
        .lot-loading-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 34px;
          line-height: 1;
          letter-spacing: 2px;
          color: var(--navy-txt);
        }
        .lot-loading-copy {
          max-width: 320px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--muted);
        }
        @keyframes bottleDrawShake {
          0%, 12%, 24%, 36%, 48%, 60% { transform: rotate(-8deg) translateY(0); }
          6%, 18%, 30%, 42%, 54% { transform: rotate(9deg) translateY(-5px); }
          68% { transform: rotate(-3deg) translateY(0); }
          78%, 100% { transform: rotate(0deg) translateY(0); }
        }
        @keyframes slipTumbleOne {
          0%, 100% { transform: translate(0, 0) rotate(-18deg); }
          50% { transform: translate(12px, 12px) rotate(24deg); }
        }
        @keyframes slipTumbleTwo {
          0%, 100% { transform: translate(0, 0) rotate(16deg); }
          50% { transform: translate(-18px, -10px) rotate(-22deg); }
        }
        @keyframes slipTumbleThree {
          0%, 100% { transform: translate(0, 0) rotate(-6deg); }
          50% { transform: translate(16px, -10px) rotate(20deg); }
        }
        @keyframes handReachPick {
          0%, 56% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          62% { opacity: 1; }
          74% { transform: translate(-92px, -4px) rotate(-4deg); opacity: 1; }
          84% { transform: translate(-116px, -2px) rotate(-7deg); opacity: 1; }
          100% { transform: translate(-50px, -26px) rotate(2deg); opacity: 1; }
        }
        @keyframes paperPickWithHand {
          0%, 58% { transform: translate(-64px, 58px) rotate(-12deg) scale(0.72); opacity: 0; }
          63% { opacity: 1; }
          74% { transform: translate(-32px, 12px) rotate(-6deg) scale(0.92); opacity: 1; }
          84% { transform: translate(0, -2px) rotate(3deg) scale(1); opacity: 1; }
          100% { transform: translate(70px, -40px) rotate(9deg) scale(1.04); opacity: 1; }
        }
        @keyframes shadowPulse {
          0%, 60% { transform: scaleX(1.08); opacity: 0.2; }
          78%, 100% { transform: scaleX(0.9); opacity: 0.12; }
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
                      Draw one approved player, then mark sold or unsold.
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
                    <span className="summary-value">{approvedCount}</span>
                    <span className="summary-copy">Approved for lot</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-value">{soldCount}</span>
                    <span className="summary-copy">Sold players</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-value">{unsoldCount}</span>
                    <span className="summary-copy">Unsold but eligible</span>
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
                            className={`tab-btn ${filterStatus === 'approved' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('approved')}
                          >
                            Approved
                          </button>
                          <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'sold' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('sold')}
                          >
                            Sold
                          </button>
                          <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'unsold' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('unsold')}
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
                                    <div className="p-phone">{registration.playingRole}</div>
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
                          Start the lot to pull one approved player. Sold players are removed from
                          future draws. Unsold players stay eligible for the next random pick.
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
                          <span className="lot-meta-item">Approved: {approvedCount}</span>
                          <span className="lot-meta-item">Unsold: {unsoldCount}</span>
                          <span className="lot-meta-item">Sold excluded: {soldCount}</span>
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
                            <div className="p-phone" style={{ textAlign: 'center', marginBottom: 8 }}>
                              {lotPlayer.playingRole}
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
                                onClick={() => handleLotDecision('sold')}
                                disabled={saving}
                              >
                                Mark Sold
                              </button>
                              <button
                                type="button"
                                className="btn-r"
                                onClick={() => handleLotDecision('unsold')}
                                disabled={saving}
                              >
                                Mark Unsold
                              </button>
                            </div>
                          </div>
                        ) : isSpinning ? (
                          <div className="lot-picker-loading">
                            <div className="lot-bottle-scene" aria-hidden="true">
                              <div className="lot-shadow" />
                              <div className="lot-bottle">
                                <div className="bottle-paper-layer">
                                  <span className="paper-slip one" />
                                  <span className="paper-slip two" />
                                  <span className="paper-slip three" />
                                </div>
                              </div>
                              <div className="lot-hand">
                                <span className="hand-thumb" />
                                <span className="hand-finger one" />
                                <span className="hand-finger two" />
                                <span className="hand-finger three" />
                              </div>
                              <div className="paper-picked" />
                            </div>
                            <div>
                              <div className="lot-loading-title">Picking Player</div>
                              <div className="lot-loading-copy">
                                Drawing one approved player from the active lot pool.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="lot-empty">
                            <div>
                              <strong>Ready For Draw</strong>
                              The next approved player will appear here with Sold and Unsold controls.
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
                    <p className="p-phone">Role: {selectedReg.playingRole}</p>
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

                {selectedReg.status === 'pending' ? (
                  <div className="action-row">
                    <button
                      type="button"
                      className="btn-v"
                      disabled={saving}
                      onClick={() => approveAndOpenWhatsApp(selectedReg)}
                    >
                      Approve + WhatsApp Invite
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
