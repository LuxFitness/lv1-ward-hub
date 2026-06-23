import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MoveIn, RecordStatus } from '@/lib/mockData';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

const RECORD_LABELS: Record<RecordStatus, string> = {
  transferred: 'Records In',
  pending: 'Records Pending',
  requested: 'Transfer Requested',
  out_of_unit: 'Out-of-Unit',
};

const RECORD_STYLE: Record<RecordStatus, string> = {
  transferred: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  requested: 'bg-blue-50 text-blue-700 border-blue-200',
  out_of_unit: 'bg-red-50 text-red-700 border-red-200',
};

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'w-4 h-4 rounded-full flex items-center justify-center shrink-0 border',
        done ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-border',
      )}>
        {done && <span className="text-white text-[9px] font-bold">✓</span>}
      </div>
      <span className={cn('text-xs', done ? 'text-foreground line-through' : 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  );
}

function MoveInCard({ person }: { person: MoveIn }) {
  const days = daysAgo(person.moved_in_date);
  const isRecent = days <= 30;

  const stepsComplete = [
    !!person.welcomed_in_sm,
    !!person.assigned_ministers,
    !!person.bishopric_visit,
  ].filter(Boolean).length;

  return (
    <div className={cn(
      'bg-card border rounded-xl p-5 shadow-sm',
      isRecent ? 'border-primary/30' : 'border-border',
    )}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{person.family_name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{person.family_name} Family</p>
            <p className="text-xs text-muted-foreground mt-0.5">{person.names}</p>
          </div>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border block', RECORD_STYLE[person.record_status])}>
            {RECORD_LABELS[person.record_status]}
          </span>
          <p className="text-[10px] text-muted-foreground">Moved in {formatDate(person.moved_in_date)}</p>
        </div>
      </div>

      {/* Progress checklist */}
      <div className="space-y-2 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Welcome Checklist ({stepsComplete}/3)
        </p>
        <CheckItem done={!!person.welcomed_in_sm} label={person.welcomed_in_sm ? `Welcomed in SM — ${formatDate(person.welcomed_in_sm)}` : 'Welcome in sacrament meeting'} />
        <CheckItem done={!!person.assigned_ministers} label={person.assigned_ministers ? `Ministers assigned — ${person.assigned_ministers}` : 'Assign ministers'} />
        <CheckItem done={!!person.bishopric_visit} label={person.bishopric_visit ? `Bishopric visit — ${formatDate(person.bishopric_visit)}` : 'Bishopric home visit'} />
      </div>

      {person.notes && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">{person.notes}</p>
        </div>
      )}
    </div>
  );
}

export function MoveInsView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['move-ins'],
    queryFn: () => apiFetch<MoveIn[]>('/api/move-ins'),
  });

  if (isLoading) {
    return (
      <div className="p-5 space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">Failed to load move-ins.</p>
      </div>
    );
  }

  const people = data ?? [];
  const recent = people.filter(p => daysAgo(p.moved_in_date) <= 90);
  const older = people.filter(p => daysAgo(p.moved_in_date) > 90);

  const needsRecords = recent.filter(p => p.record_status !== 'transferred').length;
  const needsVisit = recent.filter(p => !p.bishopric_visit).length;

  return (
    <div className="pb-10">
      {/* Summary bar */}
      <div className="flex gap-3 px-5 pt-5 pb-1">
        <div className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-center">
          <p className="text-xl font-bold text-foreground">{recent.length}</p>
          <p className="text-[11px] text-muted-foreground">Last 90 days</p>
        </div>
        {needsRecords > 0 && (
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xl font-bold text-amber-700">{needsRecords}</p>
            <p className="text-[11px] text-amber-600">Records pending</p>
          </div>
        )}
        {needsVisit > 0 && (
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xl font-bold text-primary">{needsVisit}</p>
            <p className="text-[11px] text-muted-foreground">Visits needed</p>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {recent.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No recent move-ins.</p>
          </div>
        ) : (
          recent.map(p => <MoveInCard key={p.id} person={p} />)
        )}

        {older.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">Older Move-Ins</p>
            {older.map(p => <MoveInCard key={p.id} person={p} />)}
          </>
        )}
      </div>
    </div>
  );
}
