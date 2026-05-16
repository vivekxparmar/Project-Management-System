import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { Resource } from "@/types";

interface ResourceState {
  resources: Resource[];
  isLoading: boolean;

  setResources: (resources: Resource[]) => void;
  setLoading: (loading: boolean) => void;

  addResource: (resource: Resource) => void;

  updateResource: (resourceId: string, updates: Partial<Resource>) => void;

  removeResource: (resourceId: string) => void;

  clearResources: () => void;
}

export const useResourceStore = create<ResourceState>()(
  devtools(
    immer((set) => ({
      resources: [],
      isLoading: false,

      setResources: (resources) =>
        set((state) => {
          state.resources = resources;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      addResource: (resource) =>
        set((state) => {
          const exists = state.resources.some((r) => r._id === resource._id);

          if (!exists) {
            state.resources.unshift(resource);
          }
        }),

      updateResource: (resourceId, updates) =>
        set((state) => {
          const idx = state.resources.findIndex((r) => r._id === resourceId);

          if (idx !== -1) {
            Object.assign(state.resources[idx], updates);
          }
        }),

      removeResource: (resourceId) =>
        set((state) => {
          state.resources = state.resources.filter((r) => r._id !== resourceId);
        }),

      clearResources: () =>
        set((state) => {
          state.resources = [];
        }),
    })),
    {
      name: "ResourceStore",
    },
  ),
);
