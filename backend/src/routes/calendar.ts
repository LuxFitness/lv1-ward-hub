/**
 * Google Calendar proxy routes.
 *
 * Uses the same service account as the Sheets sync.
 * Share your bishopric Google Calendar with the service account email
 * (client_email in the JSON key) with "Make changes to events" access.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON string of service account key
 *   BISHOP_CALENDAR_ID           — calendar ID from Google Calendar settings
 *                                  (looks like: abc123@group.calendar.google.com)
 */

import { Router } from 'express';

export const calendarRouter = Router();

function getCalendarClient() {
  const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const CAL_ID  = process.env.BISHOP_CALENDAR_ID;
  if (!SA_JSON || !CAL_ID) return null;
  return { SA_JSON, CAL_ID };
}

// ── List upcoming events (next 60 days) ───────────────────────────────────────

calendarRouter.get('/events', async (_req, res) => {
  const cfg = getCalendarClient();
  if (!cfg) {
    return res.status(501).json({
      error: 'Google Calendar is not configured',
      setup: 'Set GOOGLE_SERVICE_ACCOUNT_JSON and BISHOP_CALENDAR_ID in backend/.env. ' +
             'Share the calendar with the service account email (Editor access). ' +
             'Enable Google Calendar API in your Google Cloud project.',
    });
  }

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(cfg.SA_JSON),
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    const cal = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const end = new Date(now.getTime() + 60 * 86400_000);

    const response = await cal.events.list({
      calendarId: cfg.CAL_ID,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    res.json(response.data.items ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create event ──────────────────────────────────────────────────────────────

calendarRouter.post('/events', async (req, res) => {
  const cfg = getCalendarClient();
  if (!cfg) return res.status(501).json({ error: 'Google Calendar is not configured' });

  const { summary, description, start, end, location } = req.body as {
    summary: string;
    description?: string;
    start: string; // ISO datetime
    end: string;
    location?: string;
  };

  if (!summary || !start || !end) {
    return res.status(400).json({ error: 'summary, start, and end are required' });
  }

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(cfg.SA_JSON),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const cal = google.calendar({ version: 'v3', auth });

    const response = await cal.events.insert({
      calendarId: cfg.CAL_ID,
      requestBody: {
        summary,
        description: description ?? undefined,
        location: location ?? undefined,
        start: { dateTime: start },
        end: { dateTime: end },
      },
    });

    res.status(201).json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
