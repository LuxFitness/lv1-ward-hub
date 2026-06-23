import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MeetingAgenda, AgendaItem, ActionItem, MeetingType } from '@/lib/mockData';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDue(iso: string | null | undefined) {
  if (!iso) return null;
  const d = daysUntil(iso);
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, color: 'text-destructive' };
  if (d === 0) return { label: 'Due today', color: 'text-amber-600' };
  if (d <= 3)  return { label: `${d}d left`, color: 'text-amber-600' };
  return { label: shortDate(iso), color: 'text-muted-foreground' };
}

// ── Inline add row ──────────────────────────────────────────────────────────

function AddRow({
  placeholder,
  onAdd,
  fields,
}: {
  placeholder: string;
  onAdd: (values: { title: string; owner?: string; due_date?: string }) => void;
  fields?: Array<'owner' | 'due_date'>;
}) {
  const [open, setOpen]     = useState(false);
  const [title, setTitle]   = useState('');
  const [owner, setOwner]   = useState('');
  const [due,   setDue]     = useState('');

  function commit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      ...(fields?.includes('owner') && owner ? { owner: owner.trim() } : {}),
      ...(fields?.includes('due_date') && due ? { due_date: due } : {}),
    });
    setTitle(''); setOwner(''); setDue('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2 w-full"
      >
        <span className="text-base leading-none">+</span> {placeholder}
      </button>
    );
  }

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
      <input
        autoFocus
        value={title}
        placeholder={placeholder}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false); }}
        className="w-full text-sm bg-white border border-border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
      />
      {(fields ?? []).length > 0 && (
        <div className="flex gap-2">
          {fields?.includes('owner') && (
            <input
              value={owner}
              placeholder="Owner"
              onChange={e => setOwner(e.target.value)}
              className="flex-1 text-xs bg-white border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            />
          )}
          {fields?.includes('due_date') && (
            <input
              type="date"
              value={due}
              onChange={e => setDue(e.target.value)}
              className="text-xs bg-white border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={commit}
          className="text-xs font-semibold px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >Add</button>
        <button
          onClick={() => { setOpen(false); setTitle(''); setOwner(''); setDue(''); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
        >Cancel</button>
      </div>
    </div>
  );
}

// ── Agenda item row ─────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-muted-foreground/30',
  discussed: 'bg-primary',
  tabled:    'bg-amber-400',
  resolved:  'bg-emerald-500',
};

const STATUS_CYCLE: Record<string, string> = {
  pending: 'discussed', discussed: 'tabled', tabled: 'resolved', resolved: 'pending',
};

function AgendaItemRow({
  item,
  onStatusChange,
  onDelete,
}: {
  item: AgendaItem;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 group border-b border-border/60 last:border-0">
      <button
        onClick={() => onStatusChange(STATUS_CYCLE[item.status] ?? 'pending')}
        title={`Status: ${item.status} — click to advance`}
        className={cn('mt-0.5 w-3 h-3 rounded-full shrink-0 transition-colors ring-1 ring-border', STATUS_DOT[item.status])}
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-foreground', item.status === 'resolved' && 'line-through text-muted-foreground')}>
          {item.title}
        </p>
        {item.details && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.details}</p>
        )}
        {item.owner && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{item.owner}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-40 hover:opacity-100 text-destructive text-xs shrink-0 transition-opacity"
        title="Remove"
      >✕</button>
    </div>
  );
}

// ── Action item row ─────────────────────────────────────────────────────────

function ActionItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ActionItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const due = formatDue(item.due_date);

  return (
    <div className={cn('flex items-center gap-3 py-2.5 group border-b border-border/60 last:border-0', item.completed && 'opacity-50')}>
      <button
        onClick={onToggle}
        className={cn(
          'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
          item.completed ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-border hover:border-primary',
        )}
      >
        {item.completed && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-foreground', item.completed && 'line-through')}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.owner && (
            <span className="text-[10px] text-muted-foreground">{item.owner}</span>
          )}
          {due && !item.completed && (
            <span className={cn('text-[10px] font-medium', due.color)}>{due.label}</span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-40 hover:opacity-100 text-destructive text-xs shrink-0 transition-opacity"
        title="Remove"
      >✕</button>
    </div>
  );
}

// ── Meeting card ────────────────────────────────────────────────────────────

function MeetingCard({ meeting, isUpcoming }: { meeting: MeetingAgenda; isUpcoming: boolean }) {
  const qc = useQueryClient();
  const meetingType = meeting.meeting_type;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['agenda', meetingType] });
  }

  const addItem = useMutation({
    mutationFn: (body: { title: string; owner?: string }) =>
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
        (old ?? []).map(m =>
          m.id === meeting.id
            ? { ...m, agenda_items: m.agenda_items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
            : m
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['agenda', meetingType], ctx.prev); },
    onSettled: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/agenda/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
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
        (old ?? []).map(m =>
          m.id === meeting.id
            ? { ...m, action_items: m.action_items.map(a => a.id === actionId ? { ...a, ...updates } : a) }
            : m
        )
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

  const days               = daysUntil(meeting.meeting_date);
  const pendingActions     = meeting.action_items.filter(a => !a.completed);
  const openDiscussions    = meeting.agenda_items.filter(i => i.status === 'pending').length;

  return (
    <div className={cn(
      'bg-card border rounded-xl overflow-hidden shadow-sm',
      isUpcoming ? 'border-primary/40' : 'border-border',
    )}>
      {/* Header */}
      <div className={cn(
        'px-5 py-4 flex items-center justify-between',
        isUpcoming ? 'bg-primary text-primary-foreground' : 'bg-muted/40',
      )}>
        <div>
          <p className="font-semibold text-sm">{formatDate(meeting.meeting_date)}</p>
          <p className={cn('text-xs mt-0.5', isUpcoming ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today' : `${days} days away`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {openDiscussions > 0 && !isUpcoming && (
            <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full">{openDiscussions} pending items</span>
          )}
          {pendingActions > 0 && (
            <span className={cn(
              'text-[10px] font-semibold px-2.5 py-1 rounded-full border',
              isUpcoming
                ? 'bg-white/20 text-current border-white/20'
                : 'bg-amber-50 text-amber-700 border-amber-200',
            )}>
              {pendingActions} open action{pendingActions > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 divide-y divide-border">
        {/* Agenda items */}
        <div className="py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Agenda</p>
          {meeting.agenda_items
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(item => (
              <AgendaItemRow
                key={item.id}
                item={item}
                onStatusChange={status => patchItem.mutate({ itemId: item.id, updates: { status: status as AgendaItem['status'] } })}
                onDelete={() => deleteItem.mutate(item.id)}
              />
            ))
          }
          <AddRow
            placeholder="Add agenda item"
            onAdd={({ title, owner }) => addItem.mutate({ title, owner })}
            fields={['owner']}
          />
        </div>

        {/* Action items */}
        <div className="py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Action Items</p>
          {meeting.action_items.map(action => (
            <ActionItemRow
              key={action.id}
              item={action}
              onToggle={() => patchAction.mutate({
                actionId: action.id,
                updates: { completed: !action.completed },
              })}
              onDelete={() => deleteAction.mutate(action.id)}
            />
          ))}
          <AddRow
            placeholder="Add action item"
            onAdd={({ title, owner, due_date }) => addAction.mutate({ title, owner, due_date })}
            fields={['owner', 'due_date']}
          />
        </div>

        {/* Notes */}
        {meeting.notes && (
          <div className="py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{meeting.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Open actions across all meetings ────────────────────────────────────────

function OpenActionsPanel({ meetings }: { meetings: MeetingAgenda[] }) {
  const all = meetings.flatMap(m =>
    m.action_items
      .filter(a => !a.completed)
      .map(a => ({ ...a, meetingDate: m.meeting_date }))
  );

  if (all.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 mb-3">
        Open Actions ({all.length})
      </p>
      <div className="space-y-2">
        {all.map(a => {
          const due = formatDue(a.due_date);
          return (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-foreground flex-1 min-w-0 truncate">{a.title}</span>
              {a.owner && <span className="text-xs text-muted-foreground shrink-0">{a.owner}</span>}
              {due && <span className={cn('text-xs font-medium shrink-0', due.color)}>{due.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MeetingsView ────────────────────────────────────────────────────────────

const TAB_LABELS: Record<MeetingType, string> = {
  bishopric:   'Bishopric',
  ward_council: 'Ward Council',
  pec:         'PEC',
};

const DEFAULT_ITEMS: Record<MeetingType, string[]> = {
  bishopric: [
    'Opening Devotional',
    'Review Action Items',
    'Callings to Discuss',
    'Upcoming Ordinances',
    'Sacrament Meeting Coordination',
    'Youth',
    'Ministry / Welfare',
    'New Business',
    'Closing Prayer',
  ],
  ward_council: [
    'Opening Prayer',
    'Review Action Items',
    'Elders Quorum Report',
    'Relief Society Report',
    'Young Men Report',
    'Young Women Report',
    'Primary Report',
    'Sunday School Report',
    'Ministry / Welfare',
    'New Business',
    'Closing Prayer',
  ],
  pec: [
    'Opening Prayer',
    'Review Action Items',
    'Ministering Report',
    'New Business',
    'Closing Prayer',
  ],
};

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
      // Pre-seed with default agenda items
      const defaults = DEFAULT_ITEMS[activeType] ?? [];
      for (let i = 0; i < defaults.length; i++) {
        await apiFetch(`/api/agenda/${newMeeting.id}/items`, {
          method: 'POST',
          body: JSON.stringify({ title: defaults[i], sort_order: i }),
        });
      }
      qc.invalidateQueries({ queryKey: ['agenda', activeType] });
    },
  });

  const meetings     = (data ?? []).sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
  const today        = new Date().toISOString().slice(0, 10);
  const upcoming     = meetings.filter(m => m.meeting_date >= today);
  const past         = meetings.filter(m => m.meeting_date < today);

  return (
    <div className="pb-10">
      {/* Sub-tab bar */}
      <div className="flex border-b border-border bg-card">
        {(Object.keys(TAB_LABELS) as MeetingType[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={cn(
              'px-5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
              activeType === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-5 space-y-4">
          {[0,1].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Open actions banner */}
          <OpenActionsPanel meetings={meetings} />

          {/* Upcoming meetings */}
          {upcoming.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No upcoming {TAB_LABELS[activeType]} meeting scheduled</p>
              <button
                onClick={() => {
                  // Default to next Monday (or appropriate weekday)
                  const next = new Date();
                  next.setDate(next.getDate() + (7 - next.getDay() + 1) % 7 || 7);
                  createMeeting.mutate(next.toISOString().slice(0, 10));
                }}
                disabled={createMeeting.isPending}
                className="text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                + Schedule Next Meeting
              </button>
            </div>
          ) : (
            upcoming.map(m => (
              <MeetingCard key={m.id} meeting={m} isUpcoming={true} />
            ))
          )}

          {/* Past meetings */}
          {past.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">Past Meetings</p>
              {past.map(m => <MeetingCard key={m.id} meeting={m} isUpcoming={false} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
