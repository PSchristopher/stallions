import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin';

export const runtime = 'nodejs';

type ApprovedPlayer = {
  displayNumber: number;
  name: string;
  phone: string;
  playingRole: string;
  photoUrl: string;
};

const roleOrder = ['Batter', 'Bowler', 'All rounder'] as const;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDisplayNumber(value: number) {
  return `#${String(value).padStart(3, '0')}`;
}

function getAbsoluteUrl(request: Request, url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return new URL(url, request.url).toString();
}

function getRoleLabel(role: string) {
  return role === 'All rounder' ? 'All Rounders' : `${role}s`;
}

function renderPlayerCard(request: Request, player: ApprovedPlayer) {
  const photoUrl = escapeHtml(getAbsoluteUrl(request, player.photoUrl));

  return `
    <article class="player-card">
      <div class="photo-frame">
        <img src="${photoUrl}" alt="${escapeHtml(player.name)} photo" />
      </div>
      <div class="display-number">${escapeHtml(formatDisplayNumber(player.displayNumber))}</div>
      <h3>${escapeHtml(player.name)}</h3>
      <p>${escapeHtml(player.phone)}</p>
      <div class="role-pill">${escapeHtml(player.playingRole)}</div>
    </article>`;
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query(
    `SELECT
      display_number AS "displayNumber",
      name,
      phone,
      playing_role AS "playingRole",
      photo_url AS "photoUrl"
    FROM registrations
    WHERE status IN ('approved', 'verified')
    ORDER BY playing_role ASC, display_number ASC`,
    []
  );

  const players = result.rows as ApprovedPlayer[];
  const batterCount = players.filter((player) => player.playingRole === 'Batter').length;
  const bowlerCount = players.filter((player) => player.playingRole === 'Bowler').length;
  const allRounderCount = players.filter((player) => player.playingRole === 'All rounder').length;
  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const sections = roleOrder
    .map((role) => {
      const rolePlayers = players.filter((player) => player.playingRole === role);

      if (rolePlayers.length === 0) {
        return '';
      }

      return `
        <section class="role-section">
          <div class="role-head">
            <span>${escapeHtml(getRoleLabel(role))}</span>
            <strong>${rolePlayers.length} players</strong>
          </div>
          <div class="player-grid">
            ${rolePlayers.map((player) => renderPlayerCard(request, player)).join('')}
          </div>
        </section>`;
    })
    .join('');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>SPL Approved Players Registry</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      body {
        margin: 0;
        background: #edf2f8;
        color: #14213d;
        font-family: Arial, sans-serif;
      }
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 18px;
        background: #0f1a33;
      }
      .toolbar button {
        border: 0;
        border-radius: 6px;
        background: #e4b72f;
        color: #111827;
        cursor: pointer;
        font-weight: 700;
        padding: 10px 14px;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #d7e0ee;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 24px;
        background: #111b33;
        border-bottom: 6px solid #e4b72f;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
      }
      .content { padding: 22px 24px 28px; }
      h1 {
        margin: 0;
        color: #14213d;
        font-size: 30px;
        line-height: 1.1;
        text-align: center;
      }
      .subtitle {
        margin: 6px 0 18px;
        color: #66758f;
        font-size: 14px;
        text-align: center;
      }
      .gold-line {
        height: 3px;
        margin-bottom: 14px;
        background: #e4b72f;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border: 1px solid #d8e1ef;
        margin-bottom: 20px;
      }
      .summary-item {
        padding: 18px 12px;
        text-align: center;
        border-right: 1px solid #d8e1ef;
      }
      .summary-item:last-child { border-right: 0; }
      .summary-value {
        display: block;
        color: #3464a5;
        font-size: 28px;
        font-weight: 800;
        line-height: 1;
      }
      .summary-label {
        color: #7a879d;
        font-size: 12px;
      }
      .role-section {
        margin-top: 18px;
        break-inside: avoid;
      }
      .role-head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: #3563a4;
        color: #ffffff;
        font-size: 17px;
        font-weight: 800;
      }
      .role-head strong {
        color: #fff176;
        font-size: 16px;
      }
      .player-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        border-left: 1px solid #d8e1ef;
      }
      .player-card {
        min-height: 276px;
        padding: 18px 16px 16px;
        text-align: center;
        border-right: 1px solid #d8e1ef;
        border-bottom: 1px solid #d8e1ef;
        break-inside: avoid;
      }
      .photo-frame {
        width: 150px;
        height: 150px;
        margin: 0 auto 12px;
        overflow: hidden;
        border: 3px solid #3563a4;
        background: #edf3fb;
      }
      .photo-frame img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .display-number {
        color: #3563a4;
        font-size: 15px;
        font-weight: 800;
      }
      h3 {
        margin: 6px 0 4px;
        color: #26354e;
        font-size: 18px;
        line-height: 1.2;
      }
      p {
        margin: 0 0 12px;
        color: #78859b;
        font-size: 14px;
      }
      .role-pill {
        display: inline-block;
        min-width: 150px;
        padding: 6px 10px;
        border: 1px solid #6f97ce;
        background: #e7effb;
        color: #3563a4;
        font-size: 13px;
        font-weight: 800;
      }
      .empty {
        padding: 28px;
        text-align: center;
        color: #66758f;
        border: 1px dashed #b8c6dc;
      }
      @media print {
        body { background: #ffffff; }
        .toolbar { display: none; }
        .page {
          width: auto;
          min-height: auto;
          border: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button type="button" onclick="window.print()">Save as PDF</button>
    </div>
    <main class="page">
      <header class="topbar">
        <div>SPL - Approved Players Registry</div>
        <div>${escapeHtml(generatedAt)}</div>
      </header>
      <div class="content">
        <h1>SPL Approved Players</h1>
        <div class="subtitle">Player Registry</div>
        <div class="gold-line"></div>
        <div class="summary">
          <div class="summary-item">
            <span class="summary-value">${players.length}</span>
            <span class="summary-label">Total Players</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">${batterCount}</span>
            <span class="summary-label">Batters</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">${bowlerCount}</span>
            <span class="summary-label">Bowlers</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">${allRounderCount}</span>
            <span class="summary-label">All Rounders</span>
          </div>
        </div>
        ${sections || '<div class="empty">No approved players found.</div>'}
      </div>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
