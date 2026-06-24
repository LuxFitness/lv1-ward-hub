import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError, IS_MOCK } from './lib/api';
import { useUiStore } from './store/uiStore';
import type { Tab } from './store/uiStore';
import { LoginPage } from './components/LoginPage';
import { RosterView } from './components/RosterView';
import { HomeView } from './components/HomeView';
import { PipelineView } from './components/PipelineView';
import { SacramentView } from './components/SacramentView';
import { MoveInsView } from './components/MoveInsView';
import { MeetingsView } from './components/MeetingsView';
import { CalendarView } from './components/CalendarView';
import { CallingPanel } from './components/CallingPanel';
import { cn } from './lib/utils';
import type { Member } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const TABS: { id: Tab; label: string }[] = [
  { id: 'home',      label: 'Dashboard' },
  { id: 'pipeline',  label: 'Pipeline' },
  { id: 'sacrament', label: 'Sacrament' },
  { id: 'meetings',  label: 'Meetings' },
  { id: 'calendar',  label: 'Calendar' },
  { id: 'move-ins',  label: 'Move-Ins' },
  { id: 'roster',    label: 'Roster' },
  { id: 'members',   label: 'Members' },
];

// ── Members tab ────────────────────────────────────────────────────────────

function MembersView() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['members'],
    queryFn: () => apiFetch<Member[]>('/api/members'),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState('');
  const [movedIn, setMovedIn]   = useState('');

  const addMember = useMutation({
    mutationFn: async () => {
      const member = await apiFetch<Member>('/api/members', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      await apiFetch('/api/move-ins', {
        method: 'POST',
        body: JSON.stringify({
          family_name: name.trim().split(' ').slice(-1)[0],
          names: name.trim(),
          moved_in_date: movedIn || undefined,
        }),
      });
      return member;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['move-ins'] });
      setName('');
      setMovedIn('');
      setShowForm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">Failed to load members.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{(data ?? []).length} members</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Add Member
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-card border border-border rounded-lg space-y-3">
          <p className="text-xs font-semibold text-foreground">New Member</p>
          <div className="space-y-2">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="date"
              value={movedIn}
              onChange={e => setMovedIn(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40 text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addMember.mutate()}
              disabled={!name.trim() || addMember.isPending}
              className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addMember.isPending ? 'Saving…' : 'Add Member'}
            </button>
            <button
              onClick={() => { setShowForm(false); setName(''); setMovedIn(''); }}
              className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
          </div>
          {addMember.isError && (
            <p className="text-xs text-destructive">{(addMember.error as Error)?.message ?? 'Failed to add member'}</p>
          )}
        </div>
      )}

      {(!data || data.length === 0) ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No members yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
          {data.map((m) => (
            <div key={m.id} className="flex items-center px-4 py-3 gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">{m.name.charAt(0)}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{m.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── App shell ──────────────────────────────────────────────────────────────

function AppShell() {
  const { isAuthenticated, isLoading, setAuthenticated, setLoading, activeTab, setActiveTab } = useUiStore();

  useEffect(() => {
    if (IS_MOCK) {
      setAuthenticated(true);
      setLoading(false);
      return;
    }
    apiFetch<{ authenticated: boolean }>('/api/auth/check')
      .then(() => {
        setAuthenticated(true);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setAuthenticated(false);
        setLoading(false);
      });
  }, [setAuthenticated, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.20 0.05 260)' }}>
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Church-branded header */}
      <header className="sticky top-0 z-10" style={{ background: 'oklch(0.20 0.05 260)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Church cross/temple mark */}
            <div className="w-7 h-7 rounded bg-white/15 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold leading-none">⛪</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Long Valley 1st Ward</p>
              <p className="text-white/50 text-[10px] leading-tight">Bishopric Hub</p>
            </div>
          </div>
          {IS_MOCK && (
            <span className="text-[10px] font-semibold bg-[#C5A028]/20 text-[#C5A028] border border-[#C5A028]/40 px-2 py-0.5 rounded">
              MOCK
            </span>
          )}
        </div>

        {/* Tab bar — scrollable for 6 tabs */}
        <nav className="flex border-t border-white/10 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'shrink-0 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap',
                activeTab === tab.id
                  ? 'text-white border-[#C5A028]'
                  : 'text-white/50 border-transparent hover:text-white/80',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto">
        {activeTab === 'home'      && <HomeView />}
        {activeTab === 'pipeline'  && <PipelineView />}
        {activeTab === 'sacrament' && <SacramentView />}
        {activeTab === 'meetings'  && <MeetingsView />}
        {activeTab === 'calendar'  && <CalendarView />}
        {activeTab === 'move-ins'  && <MoveInsView />}
        {activeTab === 'roster'    && <RosterView />}
        {activeTab === 'members'   && <MembersView />}
      </main>

      <CallingPanel />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
