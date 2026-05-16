import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface UIState {
  // Global app loading (initial load)
  isAppLoading: boolean;

  // Sidebar collapsed state
  isSidebarCollapsed: boolean;

  // Active project portal tab (for breadcrumbs)
  activePortalTab: string;

  // Actions
  setAppLoading: (loading: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePortalTab: (tab: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    immer((set) => ({
      isAppLoading: true,
      isSidebarCollapsed: false,
      activePortalTab: "sprint",

      setAppLoading: (loading) =>
        set((state) => {
          state.isAppLoading = loading;
        }),

      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.isSidebarCollapsed = collapsed;
        }),

      setActivePortalTab: (tab) =>
        set((state) => {
          state.activePortalTab = tab;
        }),
    })),
    { name: "UIStore" },
  ),
);
