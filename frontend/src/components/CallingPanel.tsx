import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import { useTransitionCalling, useCreateCalling } from '@/hooks/useCallings';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CallingDetail, CallingStatus, Member } from '@/types';

// Valid next transitions per state — mirrors backend state machine (client-side UX only)
const VALID_TRANSITIONS: Record<CallingStatus, CallingStatus[]> = {
  recommended: ['extended', 'cancelled'],
  extended: ['accepted', 'declined', 'cancelled'],
  accepted: ['sustained', 'cancelled'],
  declined: [],
  sustained: ['set_apart', 'cancelled'],
  set_apart: ['released'],
  released: [],
  cancelled: [],
};

const TRANSITION_LABELS: Record<CallingStatus, string> = {
  extended: 'Extend Calling',
  accepted: 'Mark Accepted',
  declined: 'Mark Declined',
  sustained: 'Mark Sustained',
  set_apart: 'Set Apart',
  released: 'Release from Calling',
  cancelled: 'Cancel Pipeline',
  recommended: 'Recommend',
};

const STATUS_LABELS: Record<CallingStatus, string> = {
  recommended: 'Recommended',
  extended: 'Extended',
  accepted: 'Accepted',
  declined: 'Declined',
  sustained: 'Sustained',
  set_apart: 'Active',
  released: 'Released',
  cancelled: 'Cancelled',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const BADGE_VARIANT: Record<CallingStatus, BadgeVariant> = {
  set_apart: 'default',
  recommended: 'secondary',
  extended: 'secondary',
  accepted: 'secondary',
  sustained: 'secondary',
  declined: 'outline',
  released: 'outline',
  cancelled: 'outline',
};

const TERMINAL_STATUSES: CallingStatus[] = ['declined', 'released', 'cancelled'];
const DESTRUCTIVE_TRANSITIONS: CallingStatus[] = ['declined', 'cancelled'];

function formatDaysAgo(dateStr: string): string {
  const entered = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - entered.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

interface CallingDetailProps {
  callingId: string;
  onClose: () => void;
}

function CallingDetail({ callingId, onClose }: CallingDetailProps) {
  const { data: calling, isLoading, error } = useQuery({
    queryKey: ['callings', 'detail', callingId],
    queryFn: () => apiFetch<CallingDetail>(`/api/callings/${callingId}`),
    enabled: true,
  });

  const transition = useTransitionCalling();

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !calling) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-600">Failed to load calling details.</p>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(calling.status);
  const nextTransitions = VALID_TRANSITIONS[calling.status] ?? [];

  function handleTransition(nextStatus: CallingStatus) {
    transition.mutate(
      { id: callingId, status: nextStatus },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <Badge variant={BADGE_VARIANT[calling.status]}>
          {STATUS_LABELS[calling.status]}
        </Badge>
        {calling.state_entered_at && (
          <span className="text-xs text-slate-400">
            {formatDaysAgo(calling.state_entered_at)}
          </span>
        )}
      </div>

      {/* Member info */}
      <div className="space-y-1">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
          Member
        </p>
        <p className="text-sm text-slate-700">
          {calling.members?.name ? (
            <span>{calling.members.name}</span>
          ) : (
            <span className="italic text-slate-400">No member assigned</span>
          )}
        </p>
      </div>

      {/* Position info */}
      {calling.positions && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Position
          </p>
          <p className="text-sm text-slate-700">{calling.positions.name}</p>
          {calling.positions.org_units?.name && (
            <p className="text-xs text-slate-400">{calling.positions.org_units.name}</p>
          )}
        </div>
      )}

      {/* Bishopric owner */}
      {calling.bishopric_owner && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Assigned To
          </p>
          <p className="text-sm text-slate-700">{calling.bishopric_owner}</p>
        </div>
      )}

      {/* Notes */}
      {calling.notes && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Notes
          </p>
          <p className="text-sm text-slate-600">{calling.notes}</p>
        </div>
      )}

      {/* Terminal state message */}
      {isTerminal && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-sm text-slate-500">
            This pipeline entry is complete. Create a new one for the position
            if needed.
          </p>
        </div>
      )}

      {/* Action buttons — only valid next transitions are rendered (D-05: hidden, not disabled) */}
      {!isTerminal && nextTransitions.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Actions
          </p>
          {nextTransitions.map((nextStatus) => {
            const isDestructive = DESTRUCTIVE_TRANSITIONS.includes(nextStatus);
            return (
              <Button
                key={nextStatus}
                variant={isDestructive ? 'destructive' : 'default'}
                className="w-full"
                disabled={transition.isPending}
                onClick={() => handleTransition(nextStatus)}
              >
                {TRANSITION_LABELS[nextStatus]}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Inline member combobox ─────────────────────────────────────────────────

function MemberCombobox({
  value,
  onChange,
}: {
  value: Member | null;
  onChange: (m: Member | null) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref               = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => apiFetch<Member[]>('/api/members'),
  });

  const filtered = query.length >= 1
    ? members.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : [];

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {!open ? (
        <button
          onClick={() => { setQuery(''); setOpen(true); }}
          className={cn(
            'w-full text-left text-sm px-3 py-2 rounded-lg border border-border bg-background',
            'hover:bg-muted/40 transition-colors',
            value ? 'text-foreground' : 'text-muted-foreground italic',
          )}
        >
          {value?.name ?? 'Search for a member…'}
        </button>
      ) : (
        <>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search members…"
            onKeyDown={e => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && filtered[0]) { onChange(filtered[0]); setOpen(false); setQuery(''); }
            }}
            className="w-full text-sm px-3 py-2 rounded-lg border border-primary/40 bg-primary/5 outline-none focus:ring-2 focus:ring-primary/30"
          />
          {filtered.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {filtered.map(m => (
                <button
                  key={m.id}
                  onMouseDown={() => { onChange(m); setOpen(false); setQuery(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface VacantPositionProps {
  positionId: string;
  onClose: () => void;
}

function VacantPosition({ positionId, onClose }: VacantPositionProps) {
  const createCalling = useCreateCalling();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  function handleCreate() {
    createCalling.mutate(
      {
        position_id: positionId,
        ...(selectedMember ? { member_id: selectedMember.id } : {}),
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <p className="text-sm text-slate-500">
          This position is currently vacant. Search for the member you'd like to recommend.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Recommend</p>
        <MemberCombobox value={selectedMember} onChange={setSelectedMember} />
        {selectedMember && (
          <button
            onClick={() => setSelectedMember(null)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <Button
        variant="default"
        className="w-full"
        disabled={createCalling.isPending}
        onClick={handleCreate}
      >
        {createCalling.isPending ? 'Starting…' : 'Start Calling Pipeline'}
      </Button>
    </div>
  );
}

export function CallingPanel() {
  const { panelOpen, selectedCallingId, selectedPositionId, closePanel } =
    useUiStore();

  const title = selectedCallingId
    ? 'Calling Details'
    : selectedPositionId
      ? 'Vacant Position'
      : 'Calling';

  return (
    <Sheet open={panelOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {selectedCallingId && (
            <SheetDescription>
              View calling status and advance through the pipeline.
            </SheetDescription>
          )}
          {selectedPositionId && !selectedCallingId && (
            <SheetDescription>
              No active pipeline for this position.
            </SheetDescription>
          )}
        </SheetHeader>

        {selectedCallingId && (
          <CallingDetail callingId={selectedCallingId} onClose={closePanel} />
        )}

        {!selectedCallingId && selectedPositionId && (
          <VacantPosition
            positionId={selectedPositionId}
            onClose={closePanel}
          />
        )}

        {!selectedCallingId && !selectedPositionId && (
          <div className="p-4">
            <p className="text-sm text-slate-400">Nothing selected.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
