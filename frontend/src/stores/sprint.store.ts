import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Sprint, SprintStatus } from "../types";

interface SprintState {
  sprints: Sprint[];
  currentSprint: Sprint | null;
  isLoading: boolean;

  // Actions
  setSprints: (sprints: Sprint[]) => void;
  setCurrentSprint: (sprint: Sprint | null) => void;
  setLoading: (loading: boolean) => void;

  addSprint: (sprint: Sprint) => void;
  updateSprint: (sprintId: string, updates: Partial<Sprint>) => void;
  updateSprintStatus: (sprintId: string, status: SprintStatus) => void;
  toggleSprintLock: (sprintId: string, isLocked: boolean) => void;
  removeSprint: (sprintId: string) => void;
  clearSprints: () => void;
}

export const useSprintStore = create<SprintState>()(
  devtools(
    immer((set) => ({
      sprints: [],
      currentSprint: null,
      isLoading: false,

      setSprints: (sprints) =>
        set((state) => {
          state.sprints = sprints;
          // Auto-select active sprint or first sprint
          if (!state.currentSprint && sprints.length > 0) {
            const active = sprints.find((s) => s.status === "Active");
            state.currentSprint = active ?? sprints[0];
          }
        }),

      setCurrentSprint: (sprint) =>
        set((state) => {
          state.currentSprint = sprint;
          if (sprint) {
            const projectId = sprint.projectId;
            localStorage.setItem(`currentSprintId-${projectId}`, sprint._id);
          }
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      addSprint: (sprint) =>
        set((state) => {
          const exists = state.sprints.some((s) => s._id === sprint._id);
          if (exists) return;

          state.sprints.push(sprint);
        }),

      updateSprint: (sprintId, updates) =>
        set((state) => {
          const idx = state.sprints.findIndex((s) => s._id === sprintId);
          if (idx !== -1) Object.assign(state.sprints[idx], updates);
          if (state.currentSprint?._id === sprintId) {
            Object.assign(state.currentSprint, updates);
          }
        }),

      updateSprintStatus: (sprintId, status) =>
        set((state) => {
          const idx = state.sprints.findIndex((s) => s._id === sprintId);
          if (idx !== -1) state.sprints[idx].status = status;
          if (state.currentSprint?._id === sprintId) {
            state.currentSprint.status = status;
          }
        }),

      toggleSprintLock: (sprintId, isLocked) =>
        set((state) => {
          const sprint = state.sprints.find((s) => s._id === sprintId);
          if (sprint) {
            sprint.isLocked = isLocked;
          }

          if (state.currentSprint?._id === sprintId) {
            state.currentSprint.isLocked = isLocked;
          }
        }),

      removeSprint: (sprintId) =>
        set((state) => {
          state.sprints = state.sprints.filter((s) => s._id !== sprintId);
          if (state.currentSprint?._id === sprintId) {
            state.currentSprint = state.sprints[0] ?? null;
          }
        }),

      clearSprints: () =>
        set((state) => {
          state.sprints = [];
          state.currentSprint = null;
        }),
    })),
    { name: "SprintStore" },
  ),
);
