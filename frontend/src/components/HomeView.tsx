import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { RosterEntry, PendingCalling, CallingStatus } from '@/types';
import type { UpcomingOrdinance, SacramentWeek, MoveIn } from '@/lib/mockData';
import { ORG_NAMES } from '@/lib/mockData';

// ── helpers ────────────────────────────────────────────────────────────────

const PIPELINE_STATUS_ORDER: CallingStatus[] = ['recommended', 'extended', 'accepted', 'sustained'];

const STATUS_LABELS: Record<CallingStatus, string> = {
  recommended: 'Proposed',
  extended: 'Approved',
  accepted: 'Called',
  declined: 'Declined',
  sustained: 'Sustained',
  set_apart: 'Set Apart',
  released: 'Released',
  cancelled: 'Cancelled',
};

const STATUS_PILL: Record<string, string> = {
  recommended: 'bg-blue-50 text-blue-700 border border-blue-200',
  extended: 'bg-amber-50 text-amber-700 border border-amber-200',
  accepted: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  sustained: 'bg-violet-50 text-violet-700 border border-violet-200',
};

const ORDINANCE_ICON: Record<UpcomingOrdinance['type'], string> = {
  baby_blessing: '👶',
  baptism: '💧',
  ordination: '🙌',
  temple: '⛪',
  patriarchal: '📜',
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayOfWeek(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionCard({ title, children, badge }: { title: string; children: React.ReactNode; badge?: number | string }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
        {badge !== undefined && (
          <span className="text-xs font-bold text-muted-foreground">{badge}</span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatTile({ label, value, sub, color = 'default' }: {
  label: string;
  value: number | string;
  sub?: string;
  color?: 'default' | 'red' | 'gold' | 'green' | 'blue';
}) {
  const valueColor = {
    default: 'text-foreground',
    red: 'text-destructive',
    gold: 'text-[#C5A028]',
    green: 'text-emerald-600',
    blue: 'text-primary',
  }[color];

  const borderColor = {
    default: 'border-t-border',
    red: 'border-t-destructive',
    gold: 'border-t-[#C5A028]',
    green: 'border-t-emerald-500',
    blue: 'border-t-primary',
  }[color];

  return (
    <div className={cn('bg-card border border-border rounded-xl p-5 border-t-4', borderColor)}>
      <p className={cn('text-3xl font-bold tracking-tight', valueColor)}>{value}</p>
      <p className="text-sm font-medium text-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function PipelineRow({ calling, onOpen }: { calling: PendingCalling; onOpen: () => void }) {
  const isOverdue = calling.days_in_stage > calling.threshold_days;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border last:border-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{calling.member_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{calling.position_name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('text-[11px] font-medium px-2.5 py-1 rounded-full border', STATUS_PILL[calling.status] ?? 'bg-muted text-muted-foreground')}>
          {STATUS_LABELS[calling.status]}
        </span>
        {isOverdue && (
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            {calling.days_in_stage}d
          </span>
        )}
      </div>
    </div>
  );
}

function ThisSunday({ week }: { week: SacramentWeek }) {
  const days = daysUntil(week.date);
  const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`;
  const speakersAssigned = week.speakers.filter(s => s.name).length;

  return (
    <div className="px-5 py-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{formatDayOfWeek(week.date)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
          week.approved
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200',
        )}>
          {week.approved ? '✓ Approved' : 'Needs Approval'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Conducting</p>
          <p className="text-foreground">{week.conducting}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Speakers</p>
          <p className={cn(speakersAssigned === week.speakers.length ? 'text-foreground' : 'text-amber-600')}>
            {speakersAssigned}/{week.speakers.length} assigned
          </p>
        </div>
        {week.move_ins.length > 0 && (
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Welcome Move-Ins</p>
            <p className="text-foreground">{week.move_ins.join(', ')}</p>
          </div>
        )}
        {week.callings_to_present.length > 0 && (
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Callings/Releases</p>
            <p className="text-foreground">{week.callings_to_present.length + week.releases_to_present.length} to present</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrdinanceRow({ item }: { item: UpcomingOrdinance }) {
  const soon = item.date ? daysUntil(item.date) <= 7 : false;
  return (
    <div className="flex items-start gap-4 px-5 py-3.5 border-b border-border last:border-0">
      <span className="text-base shrink-0 mt-0.5">{ORDINANCE_ICON[item.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.nextStep}</p>
      </div>
      <div className="shrink-0 text-right">
        {item.date ? (
          <p className={cn('text-xs font-semibold', soon ? 'text-amber-600' : 'text-muted-foreground')}>
            {formatShortDate(item.date)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">TBD</p>
        )}
      </div>
    </div>
  );
}

function VacantByOrg({ roster }: { roster: RosterEntry[] }) {
  const vacants = roster.filter(r => r.calling_id === null);
  const byOrg = vacants.reduce<Record<string, number>>((acc, r) => {
    acc[r.org_unit_id] = (acc[r.org_unit_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {Object.entries(byOrg).map(([org, count]) => (
        <div key={org} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
          <p className="text-sm text-foreground">{ORG_NAMES[org] ?? org.replace(/_/g, ' ')}</p>
          <span className="text-xs font-bold bg-destructive/10 text-destructive px-2.5 py-0.5 rounded-full">
            {count} open
          </span>
        </div>
      ))}
    </>
  );
}

function RecentMoveIn({ person }: { person: MoveIn }) {
  const days = daysAgo(person.moved_in_date);
  const stepsLeft = [!person.welcomed_in_sm, !person.assigned_ministers, !person.bishopric_visit].filter(Boolean).length;
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">{person.family_name.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{person.family_name} Family</p>
        <p className="text-xs text-muted-foreground">{days}d ago · {person.names}</p>
      </div>
      {stepsLeft > 0 && (
        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
          {stepsLeft} left
        </span>
      )}
    </div>
  );
}

// ── HomeView ───────────────────────────────────────────────────────────────

export function HomeView() {
  const { data: roster, isLoading: r1 } = useQuery({ queryKey: ['callings', 'roster'], queryFn: () => apiFetch<RosterEntry[]>('/api/callings') });
  const { data: pending, isLoading: r2 } = useQuery({ queryKey: ['callings', 'pending'], queryFn: () => apiFetch<PendingCalling[]>('/api/callings/pending') });
  const { data: upcoming, isLoading: r3 } = useQuery({ queryKey: ['upcoming'], queryFn: () => apiFetch<UpcomingOrdinance[]>('/api/upcoming') });
  const { data: sacrament, isLoading: r4 } = useQuery({ queryKey: ['sacrament'], queryFn: () => apiFetch<SacramentWeek[]>('/api/sacrament') });
  const { data: moveIns, isLoading: r5 } = useQuery({ queryKey: ['move-ins'], queryFn: () => apiFetch<MoveIn[]>('/api/move-ins') });

  const { openPanel } = useUiStore();

  if (r1 || r2 || r3 || r4 || r5) {
    return (
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const vacantCount = roster?.filter(r => !r.calling_id).length ?? 0;
  const pipelineCount = pending?.length ?? 0;
  const urgentCount = pending?.filter(c => c.days_in_stage > c.threshold_days).length ?? 0;
  const upcomingSoonCount = upcoming?.filter(u => u.date && daysUntil(u.date) <= 14).length ?? 0;

  const proposedCallings = pending?.filter(c => c.status === 'recommended') ?? [];
  const inProgressCallings = pending?.filter(c =>
    (['extended', 'accepted', 'sustained'] as CallingStatus[]).includes(c.status)
  ) ?? [];

  const nextSunday = sacrament?.find(w => daysUntil(w.date) >= 0) ?? null;
  const recentMoveIns = moveIns?.filter(m => daysAgo(m.moved_in_date) <= 90).slice(0, 4) ?? [];
  const upcomingOrdinances = upcoming?.filter(u => !u.date || daysUntil(u.date) <= 60).slice(0, 6) ?? [];

  return (
    <div className="pb-10">
      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6">
        <StatTile label="Vacant Positions" value={vacantCount} sub="need a calling" color="red" />
        <StatTile label="In Pipeline" value={pipelineCount} sub={urgentCount > 0 ? `${urgentCount} overdue` : 'on track'} color="blue" />
        <StatTile label="Upcoming Ordinances" value={upcoming?.length ?? 0} sub={upcomingSoonCount > 0 ? `${upcomingSoonCount} in 2 weeks` : 'scheduled'} color="gold" />
        <StatTile label="Protecting Children" value="97%" sub="training complete" color="green" />
      </div>

      {/* 2-column grid on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 px-6">

        {/* Left column */}
        <div className="space-y-5">

          {/* This Sunday */}
          {nextSunday && (
            <SectionCard title="This Sunday">
              <ThisSunday week={nextSunday} />
            </SectionCard>
          )}

          {/* Proposed Callings */}
          {proposedCallings.length > 0 && (
            <SectionCard title="Proposed — Needs Discussion" badge={proposedCallings.length}>
              {proposedCallings.map(c => (
                <PipelineRow key={c.id} calling={c} onOpen={() => openPanel(c.id)} />
              ))}
            </SectionCard>
          )}

          {/* Active Pipeline */}
          {inProgressCallings.length > 0 && (
            <SectionCard title="Calling Pipeline" badge={inProgressCallings.length}>
              {inProgressCallings.map(c => (
                <PipelineRow key={c.id} calling={c} onOpen={() => openPanel(c.id)} />
              ))}
            </SectionCard>
          )}

        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Upcoming Ordinances */}
          {upcomingOrdinances.length > 0 && (
            <SectionCard title="Upcoming Ordinances & Events" badge={upcomingOrdinances.length}>
              {upcomingOrdinances.map(item => (
                <OrdinanceRow key={item.id} item={item} />
              ))}
            </SectionCard>
          )}

          {/* Recent Move-Ins */}
          {recentMoveIns.length > 0 && (
            <SectionCard title="Recent Move-Ins" badge={recentMoveIns.length}>
              {recentMoveIns.map(p => (
                <RecentMoveIn key={p.id} person={p} />
              ))}
            </SectionCard>
          )}

          {/* Vacant Positions */}
          {vacantCount > 0 && (
            <SectionCard title="Vacant Positions" badge={vacantCount}>
              <VacantByOrg roster={roster ?? []} />
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  );
}
