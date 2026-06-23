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
import type { Calling, CallingStatus } from '@/types';

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
    queryFn: () => apiFetch<Calling>(`/api/callings/${callingId}`),
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
          {calling.member_id ? (
            <span>Member #{calling.member_id}</span>
          ) : (
            <span className="italic text-slate-400">No member assigned</span>
          )}
        </p>
      </div>

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

interface VacantPositionProps {
  positionId: string;
  onClose: () => void;
}

function VacantPosition({ positionId, onClose }: VacantPositionProps) {
  const createCalling = useCreateCalling();

  function handleCreate() {
    createCalling.mutate(
      { position_id: positionId },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <p className="text-sm text-slate-500">
          This position is currently vacant. Start a new calling pipeline to
          recommend someone.
        </p>
      </div>
      <Button
        variant="default"
        className="w-full"
        disabled={createCalling.isPending}
        onClick={handleCreate}
      >
        Start Calling Pipeline
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
