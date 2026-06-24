import { useRoster } from '@/hooks/useCallings';
import { useUiStore } from '@/store/uiStore';
import { Badge } from '@/components/ui/badge';
import type { RosterEntry, CallingStatus } from '@/types';

// Standard LDS ward organization display names and sort order
const ORG_NAMES: Record<string, string> = {
  bishopric: 'Bishopric',
  elders_quorum: 'Elders Quorum',
  relief_society: 'Relief Society',
  primary: 'Primary',
  sunday_school: 'Sunday School',
  young_mens: "Young Men's",
  young_womens: "Young Women's",
  ward_mission: 'Ward Mission',
  ward_council: 'Ward Council',
};

const ORG_ORDER: string[] = [
  'bishopric',
  'elders_quorum',
  'relief_society',
  'primary',
  'sunday_school',
  'young_mens',
  'young_womens',
  'ward_mission',
  'ward_council',
];

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

function getOrgDisplayName(orgUnitId: string): string {
  return ORG_NAMES[orgUnitId] ?? orgUnitId.replace(/_/g, ' ');
}

function sortOrgs(orgIds: string[]): string[] {
  return [...orgIds].sort((a, b) => {
    const ai = ORG_ORDER.indexOf(a);
    const bi = ORG_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
          {[0, 1, 2, 3].map((j) => (
            <div
              key={j}
              className="h-12 rounded-lg bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface RosterRowItemProps {
  row: RosterEntry;
  onRowClick: (row: RosterEntry) => void;
}

function RosterRowItem({ row, onRowClick }: RosterRowItemProps) {
  const isVacant = row.calling_id === null;
  const variant: BadgeVariant = row.status
    ? BADGE_VARIANT[row.status]
    : BADGE_VARIANT.vacant;
  const badgeLabel = row.status ? STATUS_LABELS[row.status] : 'Vacant';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRowClick(row)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRowClick(row)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0"
    >
      <span className="flex-1 text-sm font-medium text-slate-900 truncate">
        {row.position_name}
      </span>
      <span
        className={`text-sm truncate max-w-[140px] ${isVacant ? 'text-slate-400 italic' : 'text-slate-600'}`}
      >
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

  function handleRowClick(row: RosterEntry) {
    if (row.calling_id !== null) {
      openPanel(row.calling_id);
    } else {
      openPanelForVacant(row.position_id);
    }
  }

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-600">
          Failed to load roster. Please refresh the page.
        </p>
      </div>
    );
  }

  if (!roster || roster.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">No positions found.</p>
      </div>
    );
  }

  // Group by org_unit_id
  const grouped = roster.reduce<Record<string, RosterEntry[]>>((acc, row) => {
    const key = row.org_unit_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  // Sort each group by sort_order
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.sort_order - b.sort_order);
  }

  const sortedOrgIds = sortOrgs(Object.keys(grouped));

  return (
    <div className="divide-y divide-slate-200">
      {sortedOrgIds.map((orgId) => (
        <section key={orgId} className="py-2">
          <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {grouped[orgId][0]?.org_unit_name ?? getOrgDisplayName(orgId)}
          </h2>
          <div className="rounded-lg overflow-hidden border border-slate-200 mx-4">
            {grouped[orgId].map((row) => (
              <RosterRowItem
                key={row.position_id}
                row={row}
                onRowClick={handleRowClick}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
