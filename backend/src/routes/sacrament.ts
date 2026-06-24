/**
 * Sacrament meeting planner routes.
 *
 * Google Drive pull (POST /sync-sheets { direction: 'pull' }):
 *   Downloads the Sacrament Meeting Planner XLSX from Google Drive and upserts
 *   all upcoming weeks into sacrament_weeks.
 *
 *   Required env var:
 *     GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON string of a service account key
 *                                    (needs Drive API readonly scope)
 *   Optional env var:
 *     SACRAMENT_SHEET_ID           — override the known file ID
 *
 *   Setup:
 *     1. Create a GCP project, enable the Google Drive API.
 *     2. Create a service account and download the JSON key file.
 *     3. Share the Sacrament Meeting Planner XLSX with the service account
 *        email (client_email in the JSON) — Viewer access is enough.
 *     4. Set GOOGLE_SERVICE_ACCOUNT_JSON=<contents of key file> in Render.
 *
 * Column mapping in the XLSX (0-indexed, data starts at row 2):
 *  0:date  1:presiding  2:conducting  11:opening_prayer  12:closing_prayer
 *  13:speaker1  14:speaker2  15:speaker3  16:chorister  17:organist
 *  18:opening_hymn  19:sacrament_hymn  21:closing_hymn  22:approved
 */

import { Router } from 'express';
import { supabase } from '../db';

export const sacramentRouter = Router();

// Known file ID for the Sacrament Meeting Planner XLSX
const KNOWN_SHEET_ID = '1ac9Y2D8xj6PvXz4cR5Z-u98VWym0ROk-';

function parseXlsxDate(raw: any): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === 'string') {
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const yr = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${yr}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  }
  return null;
}

// ── List weeks: upcoming (next ~6 months) + last 4 weeks ─────────────────────

sacramentRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('sacrament_weeks')
    .select('*')
    .gte('date', new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10))
    .order('date', { ascending: true })
    .limit(40);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// ── Create week ───────────────────────────────────────────────────────────────

sacramentRouter.post('/', async (req, res) => {
  const { date, presiding, conducting, speakers } = req.body as {
    date: string;
    presiding?: string;
    conducting?: string;
    speakers?: Array<{ slot: string; name: string | null; topic: string | null }>;
  };

  if (!date) return res.status(400).json({ error: 'date is required' });

  const { data, error } = await supabase
    .from('sacrament_weeks')
    .insert({ date, presiding: presiding ?? null, conducting: conducting ?? null, speakers: speakers ?? [] })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A week for that date already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// ── Update week fields ────────────────────────────────────────────────────────

sacramentRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body as Partial<Record<string, unknown>>;

  const ALLOWED = new Set([
    'presiding', 'conducting', 'opening_prayer', 'closing_prayer',
    'speakers', 'opening_hymn', 'sacrament_hymn', 'closing_hymn',
    'chorister', 'organist', 'approved', 'move_ins',
    'callings_to_present', 'releases_to_present',
    'stake_business', 'ward_business',
  ]);

  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.has(k))
  );

  if (Object.keys(safe).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const { data, error } = await supabase
    .from('sacrament_weeks')
    .update(safe)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Week not found' });
  res.json(data);
});

// ── Google Drive XLSX pull ────────────────────────────────────────────────────

sacramentRouter.post('/sync-sheets', async (req, res) => {
  const FILE_ID = process.env.SACRAMENT_SHEET_ID ?? KNOWN_SHEET_ID;
  const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!SA_JSON) {
    return res.status(501).json({
      error: 'Google Drive sync is not configured',
      setup: [
        '1. Create a GCP project and enable the Drive API.',
        '2. Create a service account and download the JSON key file.',
        `3. Share file ID "${FILE_ID}" with the service account email (Viewer access).`,
        '4. Set GOOGLE_SERVICE_ACCOUNT_JSON=<key file contents> in Render environment variables.',
      ].join(' '),
    });
  }

  const { direction = 'pull' } = req.body as { direction?: 'pull' | 'push' };
  if (direction !== 'pull') {
    return res.status(400).json({ error: 'Only pull is supported; edit the XLSX directly for changes.' });
  }

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(SA_JSON),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const fileRes = await drive.files.get(
      { fileId: FILE_ID, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const XLSX = await import('xlsx');
    const wb = XLSX.read(Buffer.from(fileRes.data as ArrayBuffer), { type: 'buffer', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const today = new Date().toISOString().slice(0, 10);
    const SPECIAL_KEYWORDS = [
      'fast & testimony', 'ym camp', 'yw camp', 'stake conference',
      'general conference', 'primary presentation', 'christmas program', 'sand hollow',
    ];

    const upserts: any[] = [];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      const date = parseXlsxDate(r[0]);
      if (!date || date < today) continue;

      const s1 = (r[13] ?? '').toString().trim();
      const s2 = (r[14] ?? '').toString().trim();
      const s3 = (r[15] ?? '').toString().trim();

      const isSpecial = SPECIAL_KEYWORDS.some(k => s1.toLowerCase().includes(k));
      const speakers = isSpecial
        ? [{ slot: s1, name: null, topic: null }]
        : [
            s1 ? { slot: 'Youth', name: s1, topic: null } : null,
            s2 ? { slot: 'Speaker 1', name: s2, topic: null } : null,
            s3 ? { slot: 'Speaker 2', name: s3, topic: null } : null,
          ].filter(Boolean);

      if (speakers.length === 0) {
        speakers.push(
          { slot: 'Youth', name: null, topic: null },
          { slot: 'Speaker 1', name: null, topic: null },
          { slot: 'Speaker 2', name: null, topic: null }
        );
      }

      upserts.push({
        date,
        presiding:      (r[1]  ?? '').toString().trim() || null,
        conducting:     (r[2]  ?? '').toString().trim() || null,
        opening_prayer: (r[11] ?? '').toString().trim() || null,
        closing_prayer: (r[12] ?? '').toString().trim() || null,
        speakers,
        chorister:      (r[16] ?? '').toString().trim() || null,
        organist:       (r[17] ?? '').toString().trim() || null,
        opening_hymn:   (r[18] ?? '').toString().trim() || null,
        sacrament_hymn: (r[19] ?? '').toString().trim() || null,
        closing_hymn:   (r[21] ?? '').toString().trim() || null,
        approved: ['approved', 'yes', '✓'].includes(
          (r[22] ?? '').toString().toLowerCase().trim()
        ),
      });
    }

    for (const row of upserts) {
      await supabase.from('sacrament_weeks').upsert(row, { onConflict: 'date' });
    }

    return res.json({ ok: true, direction, synced: upserts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Sync failed' });
  }
});
