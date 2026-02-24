import { create } from 'zustand';

export type MobileTab = 'workspace' | 'customers' | 'history';

interface MobileTabState {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
}

/**
 * Mobile tab navigation state management
 * Used to control the bottom tab bar navigation
 */
export const useMobileTabStore = create<MobileTabState>((set) => ({
  activeTab: 'workspace',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
