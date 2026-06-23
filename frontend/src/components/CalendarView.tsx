import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ward_hub_calendar_url';

export function CalendarView() {
  const [url, setUrl]       = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [draft, setDraft]   = useState(url);
  const [editing, setEditing] = useState(!url);

  useEffect(() => {
    if (url) localStorage.setItem(STORAGE_KEY, url);
  }, [url]);

  function save() {
    const trimmed = draft.trim();
    setUrl(trimmed);
    setEditing(false);
  }

  function clear() {
    setUrl('');
    setDraft('');
    setEditing(true);
    localStorage.removeItem(STORAGE_KEY);
  }

  if (editing) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-88px)] p-8">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
            <span className="text-2xl">📅</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Embed Bishopric Calendar</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Paste your Google Calendar embed URL below. To get it:
          </p>
          <ol className="text-sm text-muted-foreground space-y-2 mb-6 list-none">
            {[
              'Open Google Calendar → Settings',
              'Click your bishopric calendar on the left',
              'Scroll to "Integrate calendar" → copy the "Public URL to this calendar" or the embed URL',
              'Paste it below',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); }}
            placeholder="https://calendar.google.com/calendar/embed?src=..."
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!draft.trim()}
              className="flex-1 text-sm font-semibold px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Embed Calendar
            </button>
            {url && (
              <button
                onClick={() => setEditing(false)}
                className="text-sm px-4 py-2.5 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Want the full API integration instead?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Set <code className="bg-muted px-1 rounded text-[10px]">GOOGLE_SERVICE_ACCOUNT_JSON</code> and{' '}
              <code className="bg-muted px-1 rounded text-[10px]">BISHOP_CALENDAR_ID</code> in{' '}
              <code className="bg-muted px-1 rounded text-[10px]">backend/.env</code> to enable live event creation
              and two-way sync via the <code className="bg-muted px-1 rounded text-[10px]">/api/calendar</code> endpoint.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normalise embed URL — Google Calendar embed needs specific params
  const embedUrl = (() => {
    try {
      const u = new URL(url);
      // If it's a full calendar URL without embed path, convert it
      if (u.pathname === '/calendar/r' || !u.pathname.includes('embed')) {
        const src = u.searchParams.get('src') ?? u.pathname.split('/').pop() ?? '';
        return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(src)}&mode=MONTH&showTitle=0&showNav=1&showPrint=0&showCalendars=0&bgcolor=%23ffffff&color=%23005FA8`;
      }
      // Already an embed URL — add our styling params
      u.searchParams.set('bgcolor', '#ffffff');
      u.searchParams.set('color', '#005FA8');
      u.searchParams.set('showTitle', '0');
      return u.toString();
    } catch {
      return url;
    }
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-88px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bishopric Calendar</p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Change calendar
        </button>
      </div>

      {/* Calendar iframe — fills remaining height */}
      <iframe
        src={embedUrl}
        title="Bishopric Calendar"
        className="flex-1 w-full border-0"
        allowFullScreen
      />
    </div>
  );
}
