import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,

        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = true;
          }),

        setToken: (token) =>
          set((state) => {
            state.token = token;
            localStorage.setItem("token", token);
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        login: (user, token) =>
          set((state) => {
            // console.log("LOGIN SET CALLED", user);
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
            state.isLoading = false;
            localStorage.setItem("token", token);
          }),

        logout: () =>
          set((state) => {
            // console.log("LOGOUT CALLED");
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            localStorage.removeItem("token");
            localStorage.removeItem("currentProjectId");
          }),

        updateUser: (updates) =>
          set((state) => {
            if (state.user) {
              Object.assign(state.user, updates);
            }
          }),
      })),
      {
        name: "auth-storage",
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
        //runs after persisted state is loaded and set to the store, allows us to set isLoading to false
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isLoading = false;
          }
        },
      },
    ),
    { name: "AuthStore" },
  ),
);
