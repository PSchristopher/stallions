import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin';

export const runtime = 'nodejs';

type ApprovedPlayer = {
  displayNumber: number;
  rollNumber: number;
  name: string;
  phone: string;
  playingRole: string;
  photoUrl: string;
};

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

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query(
    `SELECT
      display_number AS "displayNumber",
      roll_num AS "rollNumber",
      name,
      phone,
      playing_role AS "playingRole",
      photo_url AS "photoUrl"
    FROM registrations
    WHERE status IN ('approved', 'verified')
    ORDER BY display_number ASC`,
    []
  );

  const players = result.rows as ApprovedPlayer[];
  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const rows = players
    .map((player) => {
      const photoUrl = escapeHtml(getAbsoluteUrl(request, player.photoUrl));

      return `
        <tr class="player-row" style="height: 78px;">
          <td class="display-number">${escapeHtml(formatDisplayNumber(player.displayNumber))}</td>
          <td class="photo-cell">
            <img src="${photoUrl}" width="64" height="64" style="width:64px;height:64px;display:block;" alt="" />
          </td>
          <td class="name-cell">${escapeHtml(player.name)}</td>
          <td class="phone-cell">${escapeHtml(player.phone)}</td>
          <td>${escapeHtml(player.playingRole)}</td>
        </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #10233f; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #0b1f3a; color: #ffffff; font-weight: 700; text-align: left; }
      th, td { border: 1px solid #c9d7e8; padding: 8px; vertical-align: middle; }
      tr:nth-child(even) td { background: #f4f8fd; }
      .player-row { height: 108px; mso-height-source: userset; }
      .player-row td { height: 108px; }
      .display-number { font-weight: 700; color: #1a5fc8; width: 92px; }
      .photo-cell { width: 86px; height: 108px; text-align: center; overflow: hidden; }
      .photo-cell img { border: 2px solid #d0dff0; }
      .name-cell { font-weight: 700; font-size: 15px; }
      .phone-cell { mso-number-format: "\\@"; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <th>Display No</th>
        <th>Photo</th>
        <th>Name</th>
        <th>Phone Number</th>
        <th>Playing Role</th>
      </tr>
      ${rows || '<tr><td colspan="5">No approved players found.</td></tr>'}
    </table>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': 'attachment; filename="spl-approved-players.xls"',
      'Cache-Control': 'no-store'
    }
  });
}
