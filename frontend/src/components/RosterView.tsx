import { useState } from 'react';
import { useRoster } from '@/hooks/useCallings';
import { useUiStore } from '@/store/uiStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RosterEntry, CallingStatus } from '@/types';

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

const BADGE_VARIANT: Record<CallingStatus | 'vacant', BadgeVariant> = {
  set_apart: 'default',
  recommended: 'secondary',
  extended: 'secondary',
  accepted: 'secondary',
  sustained: 'secondary',
  declined: 'outline',
  released: 'outline',
  cancelled: 'outline',
  vacant: 'outline',
};

type SortMode = 'org' | 'vacant-first' | 'az';

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface RosterRowItemProps {
  row: RosterEntry;
  onRowClick: (row: RosterEntry) => void;
  showOrg?: boolean;
}

function RosterRowItem({ row, onRowClick, showOrg }: RosterRowItemProps) {
  const isVacant = row.calling_id === null;
  const variant: BadgeVariant = row.status ? BADGE_VARIANT[row.status] : BADGE_VARIANT.vacant;
  const badgeLabel = row.status ? STATUS_LABELS[row.status] : 'Vacant';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRowClick(row)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRowClick(row)}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-b-0',
        'hover:bg-muted/50 active:bg-muted',
        isVacant && 'bg-amber-50/60 hover:bg-amber-50',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{row.position_name}</p>
        {showOrg && (
          <p className="text-[11px] text-muted-foreground">{row.org_unit_name}</p>
        )}
        {isVacant && row.previous_member_name && (
          <p className="text-[11px] text-muted-foreground italic">
            Previously: {row.previous_member_name}
          </p>
        )}
      </div>
      <span className={cn(
        'text-sm truncate max-w-[140px]',
        isVacant ? 'text-amber-600 italic font-medium' : 'text-muted-foreground',
      )}>
        {row.member_name ?? 'Vacant'}
      </span>
      <Badge variant={variant} className="shrink-0">
        {badgeLabel}
      </Badge>
    </div>
  );
}

export function RosterView() {
  const { data: roster, isLoading, error } = useRoster();
  const { openPanel, openPanelForVacant } = useUiStore();
  const [sort, setSort]     = useState<SortMode>('vacant-first');
  const [filter, setFilter] = useState('');

  function handleRowClick(row: RosterEntry) {
    if (row.calling_id !== null) openPanel(row.calling_id);
    else openPanelForVacant(row.position_id);
  }

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">Failed to load roster. Please refresh the page.</p>
      </div>
    );
  }

  if (!roster || roster.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No positions found.</p>
      </div>
    );
  }

  // Filter
  const q = filter.toLowerCase();
  const filtered = q
    ? roster.filter(r =>
        r.position_name.toLowerCase().includes(q) ||
        (r.member_name ?? '').toLowerCase().includes(q) ||
        r.org_unit_name.toLowerCase().includes(q)
      )
    : roster;

  const vacantCount = filtered.filter(r => r.calling_id === null).length;

  if (sort === 'vacant-first' || sort === 'az') {
    // Flat sorted list
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'vacant-first') {
        const av = a.calling_id === null ? 0 : 1;
        const bv = b.calling_id === null ? 0 : 1;
        if (av !== bv) return av - bv;
        return a.org_unit_name.localeCompare(b.org_unit_name) || a.sort_order - b.sort_order;
      }
      return a.position_name.localeCompare(b.position_name);
    });

    return (
      <div className="pb-8">
        <Controls sort={sort} setSort={setSort} filter={filter} setFilter={setFilter} vacantCount={vacantCount} total={filtered.length} />
        <div className="mx-4 rounded-lg overflow-hidden border border-border">
          {sorted.map(row => (
            <RosterRowItem key={row.position_id} row={row} onRowClick={handleRowClick} showOrg />
          ))}
        </div>
      </div>
    );
  }

  // Grouped by org
  const grouped = filtered.reduce<Record<string, RosterEntry[]>>((acc, row) => {
    if (!acc[row.org_unit_id]) acc[row.org_unit_id] = [];
    acc[row.org_unit_id].push(row);
    return acc;
  }, {});

  for (const key of Object.keys(grouped)) {
    // Within each org: vacant first, then by sort_order
    grouped[key].sort((a, b) => {
      const av = a.calling_id === null ? 0 : 1;
      const bv = b.calling_id === null ? 0 : 1;
      return av !== bv ? av - bv : a.sort_order - b.sort_order;
    });
  }

  const orgIds = Object.keys(grouped).sort((a, b) =>
    grouped[a][0].org_unit_name.localeCompare(grouped[b][0].org_unit_name)
  );

  return (
    <div className="pb-8">
      <Controls sort={sort} setSort={setSort} filter={filter} setFilter={setFilter} vacantCount={vacantCount} total={filtered.length} />
      <div className="divide-y divide-border">
        {orgIds.map(orgId => (
          <section key={orgId} className="py-2">
            <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {grouped[orgId][0]?.org_unit_name}
            </h2>
            <div className="rounded-lg overflow-hidden border border-border mx-4">
              {grouped[orgId].map(row => (
                <RosterRowItem key={row.position_id} row={row} onRowClick={handleRowClick} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ── Controls bar ──────────────────────────────────────────────────────────────

function Controls({
  sort, setSort, filter, setFilter, vacantCount, total,
}: {
  sort: SortMode;
  setSort: (s: SortMode) => void;
  filter: string;
  setFilter: (s: string) => void;
  vacantCount: number;
  total: number;
}) {
  const SORTS: { id: SortMode; label: string }[] = [
    { id: 'vacant-first', label: 'Vacant First' },
    { id: 'org',          label: 'By Org' },
    { id: 'az',           label: 'A–Z' },
  ];

  return (
    <div className="px-4 pt-4 pb-3 space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{total} positions</span>
        {vacantCount > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            {vacantCount} vacant
          </span>
        )}
      </div>

      {/* Search + sort pills */}
      <div className="flex gap-2 items-center">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter positions…"
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                sort === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted/60',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
