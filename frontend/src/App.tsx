import { useEffect } from 'react';
import { apiFetch, ApiError } from './lib/api';
import { useUiStore } from './store/uiStore';
import { LoginPage } from './components/LoginPage';

export default function App() {
  const { isAuthenticated, isLoading, setAuthenticated, setLoading } = useUiStore();

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
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">LV1 Ward Hub</h1>
      <p className="text-slate-500 mt-1">Dashboard coming soon — Phase 01-09</p>
    </div>
  );
}
