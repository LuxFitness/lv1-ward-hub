import { create } from 'zustand';

interface UiState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  setError: (msg: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  error: null,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setLoading: (val) => set({ isLoading: val }),
  setError: (msg) => set({ error: msg }),
}));
