/**
 * Sacrament meeting planner routes.
 *
 * Google Drive sync (POST /sync-sheets):
 *   Requires environment variables:
 *     GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON string of service account key
 *     SACRAMENT_SHEET_ID           — spreadsheet ID from the Drive URL
 *     SACRAMENT_SHEET_TAB          — sheet tab name (default: "Sacrament Planner")
 *
 *   Setup: Share your Google Sheet with the service account email address
 *   (found in the JSON key as "client_email") with Editor access.
 *   Enable Google Sheets API in your Google Cloud project.
 */

import { Router } from 'express';
import { supabase } from '../db';

export const sacramentRouter = Router();

// ── List weeks: upcoming (next 8) + last 4 ────────────────────────────────────

sacramentRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('sacrament_weeks')
    .select('*')
    .gte('date', new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10))
    .order('date', { ascending: true })
    .limit(12);

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

// ── Google Sheets sync ────────────────────────────────────────────────────────
//
// POST /api/sacrament/sync-sheets { direction: 'pull' | 'push' }
//
// 'pull' — import from the Google Sheet into the DB (Drive is source of truth)
// 'push' — write upcoming weeks from DB back to the Google Sheet

sacramentRouter.post('/sync-sheets', async (req, res) => {
  const SHEET_ID = process.env.SACRAMENT_SHEET_ID;
  const SA_JSON  = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!SHEET_ID || !SA_JSON) {
    return res.status(501).json({
      error: 'Google Drive sync is not configured',
      setup: 'Set SACRAMENT_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON in backend/.env. ' +
             'Share the sheet with the service account client_email (Editor access). ' +
             'Enable Google Sheets API in your Google Cloud project.',
    });
  }

  const { direction = 'pull' } = req.body as { direction?: 'pull' | 'push' };

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(SA_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const tab = process.env.SACRAMENT_SHEET_TAB ?? 'Sacrament Planner';

    if (direction === 'pull') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A2:Z100`,
      });

      const rows = response.data.values ?? [];
      const upserts = rows
        .filter((r: string[]) => r[0]) // skip empty rows
        .map((r: string[], i: number) => ({
          date: r[0],               // col A: date (YYYY-MM-DD or M/D/YYYY)
          presiding:  r[1] ?? null, // col B
          conducting: r[2] ?? null, // col C
          speakers: [
            { slot: 'Opening',  name: r[3] || null, topic: r[4] || null },
            { slot: 'Main',     name: r[5] || null, topic: r[6] || null },
            { slot: 'Closing',  name: r[7] || null, topic: r[8] || null },
          ],
          opening_hymn:   r[9]  || null,
          sacrament_hymn: r[10] || null,
          closing_hymn:   r[11] || null,
          chorister: r[12] || null,
          organist:  r[13] || null,
          approved:  r[14]?.toLowerCase() === 'yes' || r[14] === '✓' || false,
          google_sheet_row: i + 2,
        }));

      for (const row of upserts) {
        await supabase.from('sacrament_weeks').upsert(row, { onConflict: 'date' });
      }

      return res.json({ ok: true, direction, synced: upserts.length });
    }

    if (direction === 'push') {
      const today = new Date().toISOString().slice(0, 10);
      const { data: weeks } = await supabase
        .from('sacrament_weeks')
        .select('*')
        .gte('date', today)
        .order('date')
        .limit(8);

      const values = (weeks ?? []).map((w: any) => [
        w.date,
        w.presiding ?? '',
        w.conducting ?? '',
        w.speakers?.[0]?.name ?? '',
        w.speakers?.[0]?.topic ?? '',
        w.speakers?.[1]?.name ?? '',
        w.speakers?.[1]?.topic ?? '',
        w.speakers?.[2]?.name ?? '',
        w.speakers?.[2]?.topic ?? '',
        w.opening_hymn ?? '',
        w.sacrament_hymn ?? '',
        w.closing_hymn ?? '',
        w.chorister ?? '',
        w.organist ?? '',
        w.approved ? '✓' : '',
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      return res.json({ ok: true, direction, pushed: values.length });
    }

    res.status(400).json({ error: 'direction must be pull or push' });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Sync failed' });
  }
});
