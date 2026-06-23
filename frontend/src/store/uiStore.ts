import { create } from 'zustand';

export type Tab = 'home' | 'pipeline' | 'sacrament' | 'move-ins' | 'roster' | 'members' | 'meetings' | 'calendar';

interface UiState {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  setError: (msg: string | null) => void;

  // Navigation
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Panel state
  panelOpen: boolean;
  selectedCallingId: string | null;
  selectedPositionId: string | null;
  openPanel: (callingId: string) => void;
  openPanelForVacant: (positionId: string) => void;
  closePanel: () => void;
  setSelectedPosition: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  // Auth state
  isAuthenticated: false,
  isLoading: true,
  error: null,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setLoading: (val) => set({ isLoading: val }),
  setError: (msg) => set({ error: msg }),

  // Navigation
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Panel state
  panelOpen: false,
  selectedCallingId: null,
  selectedPositionId: null,
  openPanel: (callingId) =>
    set({ panelOpen: true, selectedCallingId: callingId, selectedPositionId: null }),
  openPanelForVacant: (positionId) =>
    set({ panelOpen: true, selectedCallingId: null, selectedPositionId: positionId }),
  closePanel: () =>
    set({ panelOpen: false, selectedCallingId: null, selectedPositionId: null }),
  setSelectedPosition: (id) => set({ selectedPositionId: id }),
}));
