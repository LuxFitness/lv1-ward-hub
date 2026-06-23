import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiFetch, ApiError } from './lib/api';
import { useUiStore } from './store/uiStore';
import { LoginPage } from './components/LoginPage';
import { RosterView } from './components/RosterView';
import { CallingPanel } from './components/CallingPanel';
import { cn } from './lib/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

type Tab = 'roster' | 'pending' | 'members';

function AppShell() {
  const { isAuthenticated, isLoading, setAuthenticated, setLoading } =
    useUiStore();
  const [activeTab, setActiveTab] = useState<Tab>('roster');

  useEffect(() => {
    apiFetch<{ authenticated: boolean }>('/api/auth/check')
      .then(() => {
        setAuthenticated(true);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setAuthenticated(false);
        }
        setLoading(false);
      });
  }, [setAuthenticated, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-base font-semibold text-slate-900">
            LV1 Ward Hub
          </h1>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-4 px-4">
          {(['roster', 'pending', 'members'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'roster'
                ? 'Calling Roster'
                : tab === 'pending'
                  ? 'Pending Actions'
                  : 'Members'}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content */}
      <main className="max-w-2xl mx-auto">
        {activeTab === 'roster' && <RosterView />}
        {activeTab === 'pending' && (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400">
              Pending Actions — coming in a future plan.
            </p>
          </div>
        )}
        {activeTab === 'members' && (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400">
              Members — coming in a future plan.
            </p>
          </div>
        )}
      </main>

      {/* Slide-in panel — self-managed via Zustand */}
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
