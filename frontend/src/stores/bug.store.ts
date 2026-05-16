import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Bug } from "../types";

interface BugState {
  bugs: Bug[];
  selectedBugId: string | null;
  isLoading: boolean;

  // Actions
  setBugs: (bugs: Bug[]) => void;
  addBug: (bug: Bug) => void;
  updateBug: (bugId: string, updates: Partial<Bug>) => void;
  removeBug: (bugId: string) => void;
  setSelectedBugId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearBugs: () => void;
}

export const useBugStore = create<BugState>()(
  devtools(
    immer((set) => ({
      bugs: [],
      selectedBugId: null,
      isLoading: false,

      setBugs: (bugs) =>
        set((state) => {
          state.bugs = bugs.map((bug) => ({
            ...bug,
            attachments: bug.attachments || [],
          }));
        }),

      addBug: (bug) =>
        set((state) => {
          if (!bug || !bug._id || !bug.title) return;

          const exists = state.bugs.some((b) => b._id === bug._id);

          if (exists) return;

          state.bugs.push({
            ...bug,
            attachments: bug.attachments || [],
          });
        }),

      updateBug: (bugId, updates) =>
        set((state) => {
          const idx = state.bugs.findIndex((b) => b._id === bugId);
          if (idx !== -1) {
            state.bugs[idx] = {
              ...state.bugs[idx],
              ...updates,
              attachments:
                updates.attachments || state.bugs[idx].attachments || [],
            };
          }
        }),

      removeBug: (bugId) =>
        set((state) => {
          state.bugs = state.bugs.filter((b) => b._id !== bugId);
          if (state.selectedBugId === bugId) state.selectedBugId = null;
        }),

      setSelectedBugId: (id) =>
        set((state) => {
          state.selectedBugId = id;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      clearBugs: () =>
        set((state) => {
          state.bugs = [];
          state.selectedBugId = null;
        }),
    })),
    { name: "BugStore" },
  ),
);
