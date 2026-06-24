import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SacramentWeek, SpeakerSlot } from '@/lib/mockData';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Parse YYYY-MM-DD as local date (not UTC) to avoid off-by-one-day in US timezones
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function shortDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((parseLocalDate(iso).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── EditableText ───────────────────────────────────────────────────────────────
// Click-to-edit inline text field. Saves on blur or Enter, cancels on Escape.

interface EditableTextProps {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  emptyLabel?: string;
}

function EditableText({
  value, onChange, placeholder, className, inputClassName, emptyLabel = 'Click to add',
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value ?? '');

  function commit() {
    const v = draft.trim() || null;
    if (v !== value) onChange(v);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        }}
        className={cn(
          'bg-primary/5 border border-primary/40 rounded px-2 py-0.5 text-sm outline-none',
          'focus:ring-1 focus:ring-primary w-full',
          inputClassName,
        )}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      className={cn(
        'text-left w-full rounded px-1 -mx-1 transition-colors cursor-text group',
        'hover:bg-muted/60',
        className,
      )}
    >
      <span className={cn(!value && 'text-muted-foreground italic text-xs')}>
        {value ?? emptyLabel}
      </span>
      <span className="opacity-0 group-hover:opacity-30 ml-1 text-[9px] select-none"> ✎</span>
    </button>
  );
}

// ── TagEditor — editable list of string tags ───────────────────────────────────

function TagEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState('');

  function commitAdd() {
    const trimmed = draft.trim();
    if (trimmed) onChange([...items, trimmed]);
    setDraft('');
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {items.map((item, i) => (
        <span
          key={i}
          className="group relative text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
        >
          {item}
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-destructive transition-opacity leading-none"
            title="Remove"
          >×</button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          placeholder="Add…"
          onChange={e => setDraft(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitAdd(); }
            if (e.key === 'Escape') { setDraft(''); setAdding(false); }
          }}
          className="text-xs bg-primary/5 border border-primary/40 rounded-full px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary w-28"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors px-1"
        >+ Add</button>
      )}
    </div>
  );
}

// ── Field label ────────────────────────────────────────────────────────────────

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
      {children}
    </p>
  );
}

// ── Main WeekCard (editable) ───────────────────────────────────────────────────

interface WeekCardProps {
  week: SacramentWeek;
  onUpdate: (updates: Partial<SacramentWeek>) => void;
  isSaving?: boolean;
}

function WeekCard({ week, onUpdate, isSaving }: WeekCardProps) {
  const days    = daysUntil(week.date);
  const isPast  = days < -1;
  const isSoon  = days >= 0 && days <= 7;

  const allSpeakersAssigned = week.speakers.every(s => s.name);
  const allHymnsSet         = week.opening_hymn && week.sacrament_hymn && week.closing_hymn;
  const readyToApprove      = allSpeakersAssigned && allHymnsSet;

  function updateSpeaker(idx: number, field: keyof SpeakerSlot, value: string | null) {
    const speakers = week.speakers.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    );
    onUpdate({ speakers });
  }

  return (
    <div
      id={week.id}
      className={cn(
        'bg-card border rounded-xl overflow-hidden shadow-sm scroll-mt-6 transition-opacity',
        isPast ? 'border-border opacity-60' : isSoon ? 'border-primary/40' : 'border-border',
        isSaving && 'opacity-70',
      )}
    >
      {/* Week header */}
      <div className={cn(
        'px-5 py-4 flex items-center justify-between',
        isSoon ? 'bg-primary text-primary-foreground' : 'bg-muted/40',
      )}>
        <div>
          <p className="font-semibold text-sm">{formatDate(week.date)}</p>
          <p className={cn('text-xs mt-0.5', isSoon ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {isPast ? 'Completed' : days === 0 ? 'Today' : `${days} days away`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-[10px] text-current opacity-60 animate-pulse">Saving…</span>}
          {!isPast && (
            <button
              onClick={() => onUpdate({ approved: !week.approved })}
              className={cn(
                'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                week.approved
                  ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                  : readyToApprove
                    ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                    : isSoon
                      ? 'bg-white/20 text-current border-white/30 hover:bg-white/30'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
              )}
            >
              {week.approved ? '✓ Approved' : readyToApprove ? 'Mark Approved' : 'Planning'}
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-1 divide-y divide-border">

        {/* Presiding / Conducting */}
        <div className="grid grid-cols-2 gap-4 py-3">
          <div>
            <RowLabel>Presiding</RowLabel>
            <EditableText
              value={week.presiding}
              onChange={v => onUpdate({ presiding: v })}
              placeholder="Name"
              emptyLabel="Click to set"
              className="text-sm text-foreground"
            />
          </div>
          <div>
            <RowLabel>Conducting</RowLabel>
            <EditableText
              value={week.conducting}
              onChange={v => onUpdate({ conducting: v })}
              placeholder="Name"
              emptyLabel="Click to set"
              className="text-sm text-foreground"
            />
          </div>
        </div>

        {/* Prayers */}
        <div className="grid grid-cols-2 gap-4 py-3">
          <div>
            <RowLabel>Opening Prayer</RowLabel>
            <EditableText
              value={week.opening_prayer}
              onChange={v => onUpdate({ opening_prayer: v })}
              placeholder="Name"
              emptyLabel="Click to set"
              className="text-sm text-foreground"
            />
          </div>
          <div>
            <RowLabel>Closing Prayer</RowLabel>
            <EditableText
              value={week.closing_prayer}
              onChange={v => onUpdate({ closing_prayer: v })}
              placeholder="Name"
              emptyLabel="Click to set"
              className="text-sm text-foreground"
            />
          </div>
        </div>

        {/* Speakers */}
        <div className="py-3">
          <RowLabel>Speakers</RowLabel>
          <div className="space-y-2">
            {week.speakers.map((s, i) => (
              <div key={i} className="grid grid-cols-[5rem_1fr_1fr] gap-2 items-baseline">
                <span className="text-[10px] text-muted-foreground">{s.slot}</span>
                <EditableText
                  value={s.name}
                  onChange={v => updateSpeaker(i, 'name', v)}
                  placeholder="Speaker name"
                  emptyLabel="Not assigned"
                  className={cn('text-sm', s.name ? 'text-foreground font-medium' : 'text-amber-600')}
                />
                <EditableText
                  value={s.topic}
                  onChange={v => updateSpeaker(i, 'topic', v)}
                  placeholder="Topic (optional)"
                  emptyLabel="No topic yet"
                  className="text-xs text-muted-foreground"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Hymns */}
        <div className="grid grid-cols-3 gap-3 py-3">
          {([
            { label: 'Opening Hymn',    field: 'opening_hymn'   },
            { label: 'Sacrament Hymn',  field: 'sacrament_hymn' },
            { label: 'Closing Hymn',    field: 'closing_hymn'   },
          ] as const).map(({ label, field }) => (
            <div key={field}>
              <RowLabel>{label}</RowLabel>
              <EditableText
                value={week[field]}
                onChange={v => onUpdate({ [field]: v })}
                placeholder="#xxx"
                emptyLabel="TBD"
                className="text-xs text-foreground"
              />
            </div>
          ))}
        </div>

        {/* Music */}
        <div className="grid grid-cols-2 gap-4 py-3">
          <div>
            <RowLabel>Chorister</RowLabel>
            <EditableText
              value={week.chorister}
              onChange={v => onUpdate({ chorister: v })}
              placeholder="Name"
              emptyLabel="Click to set"
              className="text-sm text-foreground"
            />
          </div>
          <div>
            <RowLabel>Organist</RowLabel>
            <EditableText
              value={week.organist}
              onChange={v => onUpdate({ organist: v })}
              placeholder="Name"
              emptyLabel="Click to set"
              className="text-sm text-foreground"
            />
          </div>
        </div>

        {/* Ward Business */}
        <div className="py-3 space-y-3">
          <RowLabel>Ward Business</RowLabel>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Welcome Move-Ins</p>
            <TagEditor items={week.move_ins} onChange={v => onUpdate({ move_ins: v })} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">New Callings to Present</p>
            <TagEditor items={week.callings_to_present} onChange={v => onUpdate({ callings_to_present: v })} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Releases to Present</p>
            <TagEditor items={week.releases_to_present} onChange={v => onUpdate({ releases_to_present: v })} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Aside week item ────────────────────────────────────────────────────────────

function WeekAsideItem({
  week, isActive, onClick, onUpdate,
}: {
  week: SacramentWeek;
  isActive: boolean;
  onClick: () => void;
  onUpdate: (updates: Partial<SacramentWeek>) => void;
}) {
  const days   = daysUntil(week.date);
  const isPast = days < -1;
  const isSoon = days >= 0 && days <= 7;

  function updateSpeaker(idx: number, field: keyof SpeakerSlot, value: string | null) {
    const speakers = week.speakers.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    );
    onUpdate({ speakers });
  }

  return (
    <div
      className={cn(
        'w-full border-b border-border',
        isActive ? 'bg-primary/8 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent',
        isPast && 'opacity-50',
      )}
    >
      {/* Clickable header — scrolls to week */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        className="flex items-center justify-between px-4 pt-3.5 pb-2 cursor-pointer"
      >
        <span className={cn('text-xs font-bold', isSoon ? 'text-primary' : 'text-foreground')}>
          {shortDate(week.date)}
        </span>
        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
          week.approved
            ? 'bg-emerald-50 text-emerald-600'
            : isSoon ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
        )}>
          {isPast ? 'Past' : week.approved ? '✓' : `${days}d`}
        </span>
      </div>

      {/* Speaker rows — always editable */}
      <div className="px-4 pb-3.5 space-y-2">
        {week.speakers.map((s, i) => (
          <div key={i} className="min-w-0">
            <span className="text-[10px] text-muted-foreground block mb-0.5">{s.slot}</span>
            <EditableText
              value={s.name}
              onChange={v => updateSpeaker(i, 'name', v)}
              placeholder="Speaker name"
              emptyLabel="Not assigned"
              className={cn('text-[11px]', s.name ? 'text-foreground font-medium' : 'text-amber-600')}
            />
            <EditableText
              value={s.topic}
              onChange={v => updateSpeaker(i, 'topic', v)}
              placeholder="Topic"
              emptyLabel="No topic"
              className="text-[10px] text-muted-foreground"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SacramentView ──────────────────────────────────────────────────────────────

const HEADER_H = 88;

export function SacramentView() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sacrament'],
    queryFn: () => apiFetch<SacramentWeek[]>('/api/sacrament'),
  });

  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [savingId,    setSavingId]    = useState<string | null>(null);
  const [syncState,   setSyncState]   = useState<'idle' | 'syncing' | 'ok' | 'err'>('idle');
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SacramentWeek> }) =>
      apiFetch<SacramentWeek>(`/api/sacrament/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['sacrament'] });
      const prev = queryClient.getQueryData<SacramentWeek[]>(['sacrament']);
      queryClient.setQueryData<SacramentWeek[]>(['sacrament'], old =>
        (old ?? []).map(w => w.id === id ? { ...w, ...updates } : w)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['sacrament'], ctx.prev);
    },
    onSettled: (_data, _err, { id }) => {
      setSavingId(prev => prev === id ? null : prev);
      queryClient.invalidateQueries({ queryKey: ['sacrament'] });
    },
  });

  // Debounce rapid edits (e.g. typing a speaker name) — 600ms
  const handleUpdate = useCallback((id: string, updates: Partial<SacramentWeek>) => {
    setSavingId(id);
    queryClient.setQueryData<SacramentWeek[]>(['sacrament'], old =>
      (old ?? []).map(w => w.id === id ? { ...w, ...updates } : w)
    );
    clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(() => {
      mutation.mutate({ id, updates });
    }, 600);
  }, [mutation, queryClient]);

  function scrollToWeek(id: string) {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function syncWithDrive(direction: 'pull' | 'push') {
    setSyncState('syncing');
    try {
      await apiFetch('/api/sacrament/sync-sheets', {
        method: 'POST',
        body: JSON.stringify({ direction }),
      });
      await queryClient.invalidateQueries({ queryKey: ['sacrament'] });
      setSyncState('ok');
      setTimeout(() => setSyncState('idle'), 2500);
    } catch {
      setSyncState('err');
      setTimeout(() => setSyncState('idle'), 3000);
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-5 p-5">
        <div className="w-56 shrink-0 space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
        <div className="flex-1 space-y-4">
          {[0,1,2].map(i => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-sm text-destructive">Failed to load sacrament schedule.</p>
    </div>
  );

  const upcoming = (data ?? []).filter(w => daysUntil(w.date) >= -1);
  const past     = (data ?? []).filter(w => daysUntil(w.date) < -1);
  const allWeeks = [...upcoming, ...past];

  const needsAttention = upcoming.filter(w => !w.approved && w.speakers.some(s => !s.name));

  return (
    <div className="flex min-h-[calc(100vh-88px)]">

      {/* ── Aside ── */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-card/80"
        style={{ position: 'sticky', top: HEADER_H, height: `calc(100vh - ${HEADER_H}px)`, overflowY: 'auto' }}
      >
        {/* Drive sync controls */}
        <div className="px-3 py-3 border-b border-border bg-muted/40 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Weeks</p>
          <div className="flex gap-1">
            <button
              onClick={() => syncWithDrive('pull')}
              disabled={syncState === 'syncing'}
              className={cn(
                'flex-1 text-[10px] font-semibold px-2 py-1 rounded border transition-colors',
                syncState === 'ok'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                syncState === 'err' ? 'bg-red-50 text-red-600 border-red-200' :
                'bg-card text-muted-foreground border-border hover:bg-primary/5 hover:text-primary hover:border-primary/30',
              )}
              title="Import from Google Sheet"
            >
              {syncState === 'syncing' ? '…' : syncState === 'ok' ? '✓ Synced' : syncState === 'err' ? '✗ Error' : '↓ Pull'}
            </button>
            <button
              onClick={() => syncWithDrive('push')}
              disabled={syncState === 'syncing'}
              className="flex-1 text-[10px] font-semibold px-2 py-1 rounded border border-border bg-card text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors"
              title="Export to Google Sheet"
            >
              ↑ Push
            </button>
          </div>
        </div>

        {allWeeks.map(week => (
          <WeekAsideItem
            key={week.id}
            week={week}
            isActive={activeId === week.id}
            onClick={() => scrollToWeek(week.id)}
            onUpdate={updates => handleUpdate(week.id, updates)}
          />
        ))}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {needsAttention.length > 0 && (
          <div className="mx-5 mt-5 mb-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <span className="text-amber-600">⚠️</span>
            <p className="text-sm text-amber-800">
              <strong>{needsAttention.length}</strong> upcoming {needsAttention.length > 1 ? 'weeks' : 'week'} still need speakers assigned
            </p>
          </div>
        )}

        <div className="p-5 space-y-5">
          {upcoming.map(week => (
            <WeekCard
              key={week.id}
              week={week}
              onUpdate={updates => handleUpdate(week.id, updates)}
              isSaving={savingId === week.id}
            />
          ))}

          {past.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">Past Meetings</p>
              {past.map(week => (
                <WeekCard
                  key={week.id}
                  week={week}
                  onUpdate={updates => handleUpdate(week.id, updates)}
                  isSaving={savingId === week.id}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
