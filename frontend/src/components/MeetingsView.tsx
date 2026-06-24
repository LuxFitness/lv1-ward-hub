import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MeetingAgenda, AgendaItem, ActionItem, MeetingType, ActionItemStatus } from '@/lib/mockData';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseLocalDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function shortDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((parseLocalDate(iso).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDue(iso: string | null | undefined) {
  if (!iso) return null;
  const d = daysUntil(iso);
  if (d < 0)  return { label: `${Math.abs(d)}d overdue`, cls: 'text-destructive font-semibold' };
  if (d === 0) return { label: 'Due today', cls: 'text-amber-600 font-semibold' };
  if (d <= 3)  return { label: `${d}d left`, cls: 'text-amber-600' };
  return { label: shortDate(iso), cls: 'text-muted-foreground' };
}

// Derives the effective status: if no ai_status, infer from completed flag
function effectiveStatus(item: ActionItem): ActionItemStatus {
  if (item.ai_status) return item.ai_status;
  return item.completed ? 'closed' : 'open';
}

function isOpen(item: ActionItem): boolean {
  const s = effectiveStatus(item);
  return s === 'open' || s === 'in_progress';
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<ActionItemStatus, ActionItemStatus> = {
  open: 'in_progress',
  in_progress: 'closed',
  closed: 'deferred',
  deferred: 'open',
};

const STATUS_LABEL: Record<ActionItemStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
  deferred: 'Deferred',
};

const STATUS_STYLE: Record<ActionItemStatus, string> = {
  open:        'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  closed:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  deferred:    'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_DOT: Record<ActionItemStatus, string> = {
  open:        'bg-amber-500',
  in_progress: 'bg-blue-500',
  closed:      'bg-emerald-500',
  deferred:    'bg-slate-400',
};

// ── Standing sections per meeting type ───────────────────────────────────────

const STANDING: Record<MeetingType, string[]> = {
  bishopric: [
    'Opening Devotional',
    'Review of Carry-Forward Action Items',
    'Callings & Releases',
    'Upcoming Ordinances',
    'Sacrament Meeting Planning',
    'Youth',
    'Ministering & Welfare',
    'New Business',
    'Closing Prayer',
  ],
  ward_council: [
    'Opening Prayer',
    'Review of Carry-Forward Action Items',
    'Elders Quorum Report',
    'Relief Society Report',
    'Young Men Report',
    'Young Women Report',
    'Primary Report',
    'Sunday School Report',
    'Ministering & Welfare',
    'New Business',
    'Closing Prayer',
  ],
  pec: [
    'Opening Prayer',
    'Review of Carry-Forward Action Items',
    'Ministering Report',
    'Welfare & Self-Reliance',
    'New Business',
    'Closing Prayer',
  ],
};

// ── Inline add form ───────────────────────────────────────────────────────────

function AddActionRow({ onAdd }: { onAdd: (v: { title: string; owner?: string; due_date?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [due,   setDue]   = useState('');

  function commit() {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), ...(owner ? { owner } : {}), ...(due ? { due_date: due } : {}) });
    setTitle(''); setOwner(''); setDue(''); setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2 w-full"
      >
        <span className="text-sm font-bold leading-none">+</span> Add action item
      </button>
    );
  }

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2 mt-1">
      <input
        autoFocus
        value={title}
        placeholder="Action item description"
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false); }}
        className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex gap-2">
        <input
          value={owner}
          placeholder="Owner"
          onChange={e => setOwner(e.target.value)}
          className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="date"
          value={due}
          onChange={e => setDue(e.target.value)}
          className="text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={commit} className="text-xs font-semibold px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
          Add
        </button>
        <button onClick={() => { setOpen(false); setTitle(''); setOwner(''); setDue(''); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Action item row (OAC style) ────────────────────────────────────────────────

function ActionRow({
  item,
  number,
  onStatusCycle,
  onDelete,
  onUpdate,
  dim,
}: {
  item: ActionItem;
  number: string;
  onStatusCycle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<ActionItem>) => void;
  dim?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({ title: item.title, owner: item.owner ?? '', due_date: item.due_date ?? '' });

  // Keep draft in sync when item changes externally
  useEffect(() => {
    if (!editing) setDraft({ title: item.title, owner: item.owner ?? '', due_date: item.due_date ?? '' });
  }, [item.title, item.owner, item.due_date, editing]);

  const save = useCallback(() => {
    if (draft.title.trim()) {
      onUpdate({ title: draft.title.trim(), owner: draft.owner.trim() || null, due_date: draft.due_date || null });
    }
    setEditing(false);
  }, [draft, onUpdate]);

  const status = effectiveStatus(item);
  const due    = formatDue(item.due_date);

  if (editing) {
    return (
      <div className="py-2.5 border-b border-border/50 last:border-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-10">{number}</span>
          <input
            autoFocus
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 text-sm bg-background border border-primary/40 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 pl-12">
          <input
            value={draft.owner}
            placeholder="Owner"
            onChange={e => setDraft(d => ({ ...d, owner: e.target.value }))}
            className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="date"
            value={draft.due_date}
            onChange={e => setDraft(d => ({ ...d, due_date: e.target.value }))}
            className="text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={save} className="text-xs font-semibold px-2 py-1 bg-primary text-primary-foreground rounded">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground px-1">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0 group',
      dim && 'opacity-50',
    )}>
      {/* Status dot — click to cycle */}
      <button
        onClick={onStatusCycle}
        title={`Status: ${STATUS_LABEL[status]} — click to advance`}
        className={cn('mt-1 w-2.5 h-2.5 rounded-full shrink-0 transition-colors', STATUS_DOT[status])}
      />

      {/* Number */}
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5 w-10">{number}</span>

      {/* Title + meta — click title to edit */}
      <div className="flex-1 min-w-0 cursor-text" onClick={() => setEditing(true)}>
        <p className={cn('text-sm text-foreground leading-snug', status === 'closed' && 'line-through text-muted-foreground')}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.owner && <span className="text-[10px] text-muted-foreground">{item.owner}</span>}
          {due && status !== 'closed' && <span className={cn('text-[10px]', due.cls)}>{due.label}</span>}
        </div>
      </div>

      {/* Status badge */}
      <span
        onClick={onStatusCycle}
        className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 cursor-pointer select-none', STATUS_STYLE[status])}
      >
        {STATUS_LABEL[status]}
      </span>

      {/* Edit + Delete */}
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-40 hover:opacity-80 text-muted-foreground text-xs shrink-0 mt-0.5 transition-opacity" title="Edit">✎</button>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-40 hover:opacity-100 text-destructive text-xs shrink-0 mt-0.5 transition-opacity">✕</button>
    </div>
  );
}

// ── Standing agenda item ──────────────────────────────────────────────────────

function StandingRow({ title, item, onToggle, onRename }: {
  title: string;
  item?: AgendaItem;
  onToggle: (status: AgendaItem['status']) => void;
  onRename?: (newTitle: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draft, setDraft] = useState('');
  const discussed = item?.status === 'discussed' || item?.status === 'resolved';
  const displayTitle = item?.title ?? title;

  function commitTitle() {
    if (draft.trim() && draft.trim() !== displayTitle && onRename) onRename(draft.trim());
    setEditingTitle(false);
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0 group">
      <button
        onClick={() => onToggle(discussed ? 'pending' : 'discussed')}
        className={cn(
          'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
          discussed ? 'bg-primary border-primary' : 'bg-background border-border hover:border-primary/60',
        )}
      >
        {discussed && <span className="text-primary-foreground text-[9px] font-bold leading-none">✓</span>}
      </button>

      {editingTitle ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
          className="flex-1 text-sm bg-background border border-primary/40 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <span
          onClick={() => { setDraft(displayTitle); setEditingTitle(true); }}
          className={cn('text-sm flex-1 cursor-text', discussed ? 'text-muted-foreground line-through' : 'text-foreground')}
        >
          {displayTitle}
        </span>
      )}
    </div>
  );
}

// ── Notes textarea ────────────────────────────────────────────────────────────

function NotesField({ value, onSave }: { value: string | null | undefined; onSave: (v: string) => void }) {
  const [draft, setDraft]   = useState(value ?? '');
  const [dirty, setDirty]   = useState(false);
  const timerRef            = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  function onChange(v: string) {
    setDraft(v);
    setDirty(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onSave(v); setDirty(false); }, 1500);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notes</p>
        {dirty && <span className="text-[10px] text-muted-foreground">Saving…</span>}
      </div>
      <textarea
        value={draft}
        onChange={e => onChange(e.target.value)}
        placeholder="Meeting notes, decisions, context…"
        rows={3}
        className="w-full text-sm bg-muted/30 border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ── Current meeting OAC panel ─────────────────────────────────────────────────

function OACPanel({
  meeting,
  meetingType,
  allMeetings,
}: {
  meeting: MeetingAgenda;
  meetingType: MeetingType;
  allMeetings: MeetingAgenda[];
}) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['agenda', meetingType] });

  // All action items across all meetings, sorted chronologically for sequential numbering
  const allItems: (ActionItem & { meetingDate: string; meetingId: string })[] = allMeetings
    .slice()
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .flatMap(m => m.action_items.map(ai => ({ ...ai, meetingDate: m.meeting_date, meetingId: m.id })));

  // Build sequential number map: item.id → "AI-001"
  const aiNumberMap = new Map<string, string>();
  allItems.forEach((item, idx) => {
    aiNumberMap.set(item.id, `AI-${String(idx + 1).padStart(3, '0')}`);
  });

  // Carry-forward: open items from PAST meetings (not the current one)
  const carryForward = allItems.filter(
    ai => ai.meetingId !== meeting.id && isOpen(ai)
  );

  // This meeting's action items
  const thisItems = meeting.action_items;

  // Standing agenda items for this meeting (matched by sort_order)
  const standingTitles = STANDING[meetingType];
  const agendaByOrder = [...meeting.agenda_items].sort((a, b) => a.sort_order - b.sort_order);

  // Mutations
  const addItem = useMutation({
    mutationFn: (body: { title: string; sort_order: number }) =>
      apiFetch(`/api/agenda/${meeting.id}/items`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });

  const patchItem = useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<AgendaItem> }) =>
      apiFetch(`/api/agenda/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onMutate: async ({ itemId, updates }) => {
      await qc.cancelQueries({ queryKey: ['agenda', meetingType] });
      const prev = qc.getQueryData<MeetingAgenda[]>(['agenda', meetingType]);
      qc.setQueryData<MeetingAgenda[]>(['agenda', meetingType], old =>
        (old ?? []).map(m => m.id === meeting.id
          ? { ...m, agenda_items: m.agenda_items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
          : m
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['agenda', meetingType], ctx.prev); },
    onSettled: invalidate,
  });

  const addAction = useMutation({
    mutationFn: (body: { title: string; owner?: string; due_date?: string }) =>
      apiFetch(`/api/agenda/${meeting.id}/actions`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });

  const patchAction = useMutation({
    mutationFn: ({ actionId, updates }: { actionId: string; updates: Partial<ActionItem> }) =>
      apiFetch(`/api/agenda/actions/${actionId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onMutate: async ({ actionId, updates }) => {
      await qc.cancelQueries({ queryKey: ['agenda', meetingType] });
      const prev = qc.getQueryData<MeetingAgenda[]>(['agenda', meetingType]);
      qc.setQueryData<MeetingAgenda[]>(['agenda', meetingType], old =>
        (old ?? []).map(m => ({
          ...m,
          action_items: m.action_items.map(a => a.id === actionId ? { ...a, ...updates } : a),
        }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['agenda', meetingType], ctx.prev); },
    onSettled: invalidate,
  });

  const deleteAction = useMutation({
    mutationFn: (actionId: string) =>
      apiFetch(`/api/agenda/actions/${actionId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const patchNotes = useMutation({
    mutationFn: (notes: string) =>
      apiFetch(`/api/agenda/${meeting.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
    onSuccess: invalidate,
  });

  function cycleStatus(item: ActionItem) {
    const current = effectiveStatus(item);
    const next = STATUS_CYCLE[current];
    patchAction.mutate({
      actionId: item.id,
      updates: {
        ai_status: next,
        completed: next === 'closed',
        completed_at: next === 'closed' ? new Date().toISOString() : null,
      },
    });
  }

  function handleStandingToggle(idx: number, newStatus: AgendaItem['status']) {
    const existing = agendaByOrder[idx];
    if (existing) {
      patchItem.mutate({ itemId: existing.id, updates: { status: newStatus } });
    } else {
      // Create the agenda item on-the-fly
      addItem.mutate({ title: standingTitles[idx], sort_order: idx });
    }
  }

  const days = daysUntil(meeting.meeting_date);
  const openCount = carryForward.length + thisItems.filter(isOpen).length;

  return (
    <div className="space-y-6">
      {/* Meeting header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-foreground leading-tight">{formatDate(meeting.meeting_date)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today' : `In ${days} day${days !== 1 ? 's' : ''}`}
            {openCount > 0 && (
              <span className="ml-2 font-semibold text-amber-600">· {openCount} open action{openCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Standing Agenda ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Standing Agenda
        </p>
        <div className="bg-card border border-border rounded-lg px-4 divide-y divide-border/40">
          {standingTitles.map((title, idx) => (
            <StandingRow
              key={title}
              title={title}
              item={agendaByOrder[idx]}
              onToggle={status => handleStandingToggle(idx, status)}
              onRename={newTitle => {
                const existing = agendaByOrder[idx];
                if (existing) patchItem.mutate({ itemId: existing.id, updates: { title: newTitle } });
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Action Log ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Action Log
        </p>

        {/* Carry-forward block */}
        {carryForward.length > 0 && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 py-2">
              Carry-Forward — {carryForward.length} open from previous meetings
            </p>
            {carryForward.map(item => (
              <ActionRow
                key={item.id}
                item={item}
                number={aiNumberMap.get(item.id) ?? ''}
                onStatusCycle={() => cycleStatus(item)}
                onDelete={() => deleteAction.mutate(item.id)}
                onUpdate={updates => patchAction.mutate({ actionId: item.id, updates })}
              />
            ))}
          </div>
        )}

        {/* This meeting's items */}
        <div className="bg-card border border-border rounded-lg px-4 py-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground py-2">
            This Meeting
          </p>
          {thisItems.length === 0 && (
            <p className="text-xs text-muted-foreground pb-2 italic">No action items yet</p>
          )}
          {thisItems.map(item => (
            <ActionRow
              key={item.id}
              item={item}
              number={aiNumberMap.get(item.id) ?? ''}
              onStatusCycle={() => cycleStatus(item)}
              onDelete={() => deleteAction.mutate(item.id)}
              onUpdate={updates => patchAction.mutate({ actionId: item.id, updates })}
              dim={effectiveStatus(item) === 'closed'}
            />
          ))}
          <AddActionRow onAdd={v => addAction.mutate(v)} />
        </div>
      </section>

      {/* ── Notes ── */}
      <section>
        <NotesField value={meeting.notes} onSave={v => patchNotes.mutate(v)} />
      </section>
    </div>
  );
}

// ── Past meeting row (collapsed) ──────────────────────────────────────────────

function PastMeetingRow({
  meeting,
  allMeetings,
  meetingType,
  aiNumberMap,
}: {
  meeting: MeetingAgenda;
  allMeetings: MeetingAgenda[];
  meetingType: MeetingType;
  aiNumberMap: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const openItems = meeting.action_items.filter(isOpen);
  const closedItems = meeting.action_items.filter(a => !isOpen(a));
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['agenda', meetingType] });

  const patchAction = useMutation({
    mutationFn: ({ actionId, updates }: { actionId: string; updates: Partial<ActionItem> }) =>
      apiFetch(`/api/agenda/actions/${actionId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onMutate: async ({ actionId, updates }) => {
      const prev = qc.getQueryData<MeetingAgenda[]>(['agenda', meetingType]);
      qc.setQueryData<MeetingAgenda[]>(['agenda', meetingType], old =>
        (old ?? []).map(m => ({
          ...m,
          action_items: m.action_items.map(a => a.id === actionId ? { ...a, ...updates } : a),
        }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['agenda', meetingType], ctx.prev); },
    onSettled: invalidate,
  });

  const deleteAction = useMutation({
    mutationFn: (actionId: string) => apiFetch(`/api/agenda/actions/${actionId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  function cycleStatus(item: ActionItem) {
    const next = STATUS_CYCLE[effectiveStatus(item)];
    patchAction.mutate({ actionId: item.id, updates: { ai_status: next, completed: next === 'closed', completed_at: next === 'closed' ? new Date().toISOString() : null } });
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={cn('transition-transform text-muted-foreground text-xs', expanded && 'rotate-90')}>▶</span>
          <span className="text-sm font-medium text-foreground">{shortDate(meeting.meeting_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          {openItems.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {openItems.length} open
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {meeting.action_items.length} action{meeting.action_items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-border bg-muted/20">
          {meeting.notes && (
            <p className="text-xs text-muted-foreground italic pt-3 pb-1 leading-relaxed">{meeting.notes}</p>
          )}
          {meeting.action_items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No action items recorded</p>
          ) : (
            <div className="pt-2">
              {[...openItems, ...closedItems].map(item => (
                <ActionRow
                  key={item.id}
                  item={item}
                  number={aiNumberMap.get(item.id) ?? ''}
                  onStatusCycle={() => cycleStatus(item)}
                  onDelete={() => deleteAction.mutate(item.id)}
                  onUpdate={updates => patchAction.mutate({ actionId: item.id, updates })}
                  dim={!isOpen(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MeetingsView ──────────────────────────────────────────────────────────────

const TAB_LABELS: Record<MeetingType, string> = {
  bishopric:    'Bishopric',
  ward_council: 'Ward Council',
  pec:          'PEC',
};

const DEFAULT_WEEKDAY: Record<MeetingType, number> = {
  bishopric: 1,    // Monday
  ward_council: 0, // Sunday
  pec: 0,          // Sunday
};

function nextWeekday(weekday: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function MeetingsView() {
  const [activeType, setActiveType] = useState<MeetingType>('bishopric');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['agenda', activeType],
    queryFn: () => apiFetch<MeetingAgenda[]>(`/api/agenda?type=${activeType}`),
  });

  const createMeeting = useMutation({
    mutationFn: (meeting_date: string) =>
      apiFetch<MeetingAgenda>('/api/agenda', {
        method: 'POST',
        body: JSON.stringify({ meeting_type: activeType, meeting_date }),
      }),
    onSuccess: async (newMeeting: MeetingAgenda) => {
      // Pre-seed standing items
      const titles = STANDING[activeType];
      for (let i = 0; i < titles.length; i++) {
        await apiFetch(`/api/agenda/${newMeeting.id}/items`, {
          method: 'POST',
          body: JSON.stringify({ title: titles[i], sort_order: i }),
        });
      }
      qc.invalidateQueries({ queryKey: ['agenda', activeType] });
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const meetings = (data ?? []).sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));

  // Current = the upcoming/soonest future meeting (or today)
  const current  = meetings.find(m => m.meeting_date >= today) ?? meetings[0] ?? null;
  const past     = meetings.filter(m => m !== current && m.meeting_date < today);

  // Build global AI number map across ALL meetings (chronological)
  const allItems: (ActionItem & { meetingDate: string })[] = [...meetings]
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .flatMap(m => m.action_items.map(ai => ({ ...ai, meetingDate: m.meeting_date })));
  const aiNumberMap = new Map<string, string>();
  allItems.forEach((item, idx) => aiNumberMap.set(item.id, `AI-${String(idx + 1).padStart(3, '0')}`));

  return (
    <div className="pb-10">
      {/* Meeting type tabs */}
      <div className="flex border-b border-border bg-card">
        {(Object.keys(TAB_LABELS) as MeetingType[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={cn(
              'px-5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
              activeType === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-5 space-y-4">
          {[0, 1].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="p-5 space-y-6">

          {/* ── Current meeting ── */}
          {current ? (
            <OACPanel meeting={current} meetingType={activeType} allMeetings={meetings} />
          ) : (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No {TAB_LABELS[activeType]} meeting scheduled</p>
              <button
                onClick={() => createMeeting.mutate(nextWeekday(DEFAULT_WEEKDAY[activeType]))}
                disabled={createMeeting.isPending}
                className="text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {createMeeting.isPending ? 'Creating…' : '+ Schedule Next Meeting'}
              </button>
            </div>
          )}

          {/* Schedule next meeting button (when current exists) */}
          {current && (
            <div className="flex justify-end">
              <button
                onClick={() => createMeeting.mutate(nextWeekday(DEFAULT_WEEKDAY[activeType]))}
                disabled={createMeeting.isPending}
                className="text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary/30"
              >
                + Schedule Next Meeting
              </button>
            </div>
          )}

          {/* ── Past meetings log ── */}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Past Meetings
              </p>
              {past.map(m => (
                <PastMeetingRow
                  key={m.id}
                  meeting={m}
                  allMeetings={meetings}
                  meetingType={activeType}
                  aiNumberMap={aiNumberMap}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
