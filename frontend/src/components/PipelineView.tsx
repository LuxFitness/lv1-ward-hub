import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import { useCreateCalling } from '@/hooks/useCallings';
import { MemberCombobox } from '@/components/MemberCombobox';
import { cn } from '@/lib/utils';
import type { RosterEntry, CallingStatus, Member } from '@/types';

// ── Column definitions ─────────────────────────────────────────────────────

const COLUMNS: {
  status: CallingStatus;
  label: string;
  sublabel: string;
  dot: string;
  header: string;
}[] = [
  {
    status: 'recommended',
    label: 'Proposed',
    sublabel: 'Awaiting bishopric vote',
    dot: 'bg-blue-500',
    header: 'bg-blue-50 border-blue-200',
  },
  {
    status: 'extended',
    label: 'Approved',
    sublabel: 'Calling extended to member',
    dot: 'bg-amber-500',
    header: 'bg-amber-50 border-amber-200',
  },
  {
    status: 'accepted',
    label: 'Called',
    sublabel: 'Member has accepted',
    dot: 'bg-indigo-500',
    header: 'bg-indigo-50 border-indigo-200',
  },
  {
    status: 'sustained',
    label: 'Sustained',
    sublabel: 'Sustained in sacrament mtg',
    dot: 'bg-violet-500',
    header: 'bg-violet-50 border-violet-200',
  },
  {
    status: 'set_apart',
    label: 'Set Apart',
    sublabel: 'Serving in calling',
    dot: 'bg-emerald-500',
    header: 'bg-emerald-50 border-emerald-200',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function daysInStage(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function orgLabel(orgId: string): string {
  const MAP: Record<string, string> = {
    bishopric: 'Bishopric',
    elders_quorum: 'EQ',
    relief_society: 'RS',
    sunday_school: 'SS',
    young_mens: 'YM',
    young_womens: 'YW',
    primary: 'Primary',
  };
  return MAP[orgId] ?? orgId;
}

function firstName(name: string): string {
  return name.split(' ')[0];
}

function lastName(name: string): string {
  const parts = name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  entry: RosterEntry;
  isTerminal: boolean;
  onOpen: () => void;
}

function PipelineCard({ entry, isTerminal, onOpen }: CardProps) {
  const days = entry.state_entered_at ? daysInStage(entry.state_entered_at) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className={cn(
        'bg-white border border-border rounded-lg p-3 cursor-pointer',
        'hover:border-primary/40 hover:shadow-sm active:scale-[0.98]',
        'transition-all select-none',
        isTerminal && 'opacity-60',
      )}
    >
      <p className="text-sm font-semibold text-foreground leading-tight truncate">
        {lastName(entry.member_name!)}
        <span className="font-normal text-muted-foreground">, {firstName(entry.member_name!)}</span>
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
        {entry.position_name}
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {entry.org_unit_name ?? orgLabel(entry.org_unit_id)}
        </span>
        {days !== null && !isTerminal && (
          <span className={cn(
            'text-[10px] font-semibold',
            days > 14 ? 'text-amber-600' : 'text-muted-foreground',
          )}>
            {days}d
          </span>
        )}
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────

interface ColumnProps {
  col: typeof COLUMNS[number];
  entries: RosterEntry[];
  onOpen: (callingId: string) => void;
}

function PipelineColumn({ col, entries, onOpen }: ColumnProps) {
  return (
    <div className="flex flex-col w-44 shrink-0">
      {/* Column header */}
      <div className={cn('rounded-lg border px-3 py-2.5 mb-3', col.header)}>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full shrink-0', col.dot)} />
          <span className="text-xs font-semibold text-foreground">{col.label}</span>
          <span className="ml-auto text-xs font-bold text-muted-foreground">{entries.length}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{col.sublabel}</p>
      </div>

      {/* Cards */}
      <div className="space-y-2 flex-1">
        {entries.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-lg h-20 flex items-center justify-center">
            <p className="text-[10px] text-muted-foreground">None</p>
          </div>
        ) : (
          entries.map((e) => (
            <PipelineCard
              key={e.calling_id}
              entry={e}
              isTerminal={col.status === 'set_apart'}
              onOpen={() => onOpen(e.calling_id!)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Add Calling Form ───────────────────────────────────────────────────────

function AddCallingForm({ roster, onClose }: { roster: RosterEntry[]; onClose: () => void }) {
  const qc = useQueryClient();
  const createCalling = useCreateCalling();
  const [selectedOrgId, setSelectedOrgId]         = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [selectedMember, setSelectedMember]         = useState<Member | null>(null);

  // Unique orgs in sorted order
  const orgs = [...new Map(
    roster.map(r => [r.org_unit_id, r.org_unit_name])
  ).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  // Positions for selected org, vacant first
  const positions = selectedOrgId
    ? [...roster.filter(r => r.org_unit_id === selectedOrgId)]
        .sort((a, b) => {
          const av = a.calling_id === null ? 0 : 1;
          const bv = b.calling_id === null ? 0 : 1;
          return av !== bv ? av - bv : a.sort_order - b.sort_order;
        })
    : [];

  function submit() {
    if (!selectedPositionId) return;
    createCalling.mutate(
      {
        position_id: selectedPositionId,
        ...(selectedMember ? { member_id: selectedMember.id } : {}),
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['callings'] });
          onClose();
        },
      },
    );
  }

  const selectCls = 'w-full text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="mx-4 mb-3 p-4 bg-card border border-primary/30 rounded-xl space-y-3">
      <p className="text-xs font-semibold text-foreground">Add to Calling Pipeline — Proposed</p>

      {/* Member */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Member</label>
        <MemberCombobox value={selectedMember} onChange={setSelectedMember} />
        {selectedMember && (
          <button onClick={() => setSelectedMember(null)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Organization */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Organization</label>
        <select
          value={selectedOrgId}
          onChange={e => { setSelectedOrgId(e.target.value); setSelectedPositionId(''); }}
          className={selectCls}
        >
          <option value="">Select organization…</option>
          {orgs.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      {/* Position */}
      {selectedOrgId && (
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Calling / Position</label>
          <select
            value={selectedPositionId}
            onChange={e => setSelectedPositionId(e.target.value)}
            className={selectCls}
          >
            <option value="">Select position…</option>
            {positions.map(p => (
              <option key={p.position_id} value={p.position_id}>
                {p.position_name}{p.calling_id === null ? ' (Vacant)' : ' (Filled)'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={!selectedPositionId || createCalling.isPending}
          className="flex-1 text-xs font-semibold px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createCalling.isPending ? 'Adding…' : 'Add to Proposed'}
        </button>
        <button
          onClick={onClose}
          className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted/60 transition-colors"
        >
          Cancel
        </button>
      </div>

      {createCalling.isError && (
        <p className="text-xs text-destructive">{(createCalling.error as Error)?.message}</p>
      )}
    </div>
  );
}

// ── PipelineView ──────────────────────────────────────────────────────────

export function PipelineView() {
  const { data: roster, isLoading, error } = useQuery({
    queryKey: ['callings', 'roster'],
    queryFn: () => apiFetch<RosterEntry[]>('/api/callings'),
  });

  const { openPanel } = useUiStore();
  const [showAddForm, setShowAddForm] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 flex gap-3 overflow-x-auto">
        {COLUMNS.map((c) => (
          <div key={c.status} className="w-44 shrink-0 space-y-2">
            <div className="h-14 rounded-lg bg-muted animate-pulse" />
            {[0, 1].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">Failed to load pipeline.</p>
      </div>
    );
  }

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // Group active callings by status — only include pipeline statuses
  const byStatus: Record<string, RosterEntry[]> = {};
  for (const col of COLUMNS) byStatus[col.status] = [];

  for (const entry of roster ?? []) {
    if (!entry.calling_id || !entry.status || !(entry.status in byStatus)) continue;
    // Set Apart: only show callings set apart within last 30 days
    if (entry.status === 'set_apart') {
      const age = entry.state_entered_at
        ? Date.now() - new Date(entry.state_entered_at).getTime()
        : Infinity;
      if (age > THIRTY_DAYS) continue;
    }
    byStatus[entry.status].push(entry);
  }

  // Sort each column by days in stage descending (oldest first)
  for (const status of Object.keys(byStatus)) {
    byStatus[status].sort((a, b) => {
      const da = a.state_entered_at ? daysInStage(a.state_entered_at) : 0;
      const db = b.state_entered_at ? daysInStage(b.state_entered_at) : 0;
      return db - da;
    });
  }

  const totalInFlight = COLUMNS.slice(0, 4).reduce((n, c) => n + byStatus[c.status].length, 0);

  return (
    <div className="pb-8">
      {/* Summary line + Add button */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {totalInFlight} calling{totalInFlight !== 1 ? 's' : ''} in progress
          {' · '}
          {byStatus['set_apart'].length} currently serving
        </span>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
            showAddForm
              ? 'bg-muted border-border text-muted-foreground'
              : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90',
          )}
        >
          {showAddForm ? 'Cancel' : '+ Add Calling'}
        </button>
      </div>

      {/* Add Calling Form */}
      {showAddForm && (
        <AddCallingForm
          roster={roster ?? []}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Kanban board — horizontally scrollable */}
      <div className="overflow-x-auto px-4 pb-4">
        <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * (176 + 12)}px` }}>
          {COLUMNS.map((col) => (
            <PipelineColumn
              key={col.status}
              col={col}
              entries={byStatus[col.status]}
              onOpen={openPanel}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mx-4 mt-2 p-3 bg-card border border-border rounded-lg">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Flow</p>
        <div className="flex items-center gap-1 flex-wrap">
          {COLUMNS.map((col, i) => (
            <span key={col.status} className="flex items-center gap-1">
              <span className={cn('w-1.5 h-1.5 rounded-full', col.dot)} />
              <span className="text-[11px] text-foreground">{col.label}</span>
              {i < COLUMNS.length - 1 && <span className="text-muted-foreground text-[10px] mx-0.5">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
