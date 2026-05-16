import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Project, ProjectStatus } from "../types";

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (val: boolean) => void;

  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  removeProject: (projectId: string) => void;

  // Derived helpers
  getMyRole: (userId: string) => string | null;

  updateMemberInProject: (
    userId: string,
    updates: { name?: string; avatar?: string },
  ) => void;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      immer((set, get) => ({
        projects: [],
        currentProject: null,
        isLoading: false,
        isInitialized: false,

        setProjects: (projects) =>
          set((state) => {
            state.projects = projects;
          }),

        setCurrentProject: (project) =>
          set((state) => {
            state.currentProject = project;
            if (project) {
              localStorage.setItem("currentProjectId", project._id);
            } else {
              localStorage.removeItem("currentProjectId");
            }
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setInitialized: (val) =>
          set((state) => {
            state.isInitialized = val;
          }),

        addProject: (project) =>
          set((state) => {
            state.projects.unshift(project);
          }),

        updateProject: (projectId, updates) =>
          set((state) => {
            const idx = state.projects.findIndex((p) => p._id === projectId);
            if (idx !== -1) Object.assign(state.projects[idx], updates);
            if (state.currentProject?._id === projectId) {
              Object.assign(state.currentProject, updates);
            }
          }),

        updateMemberInProject: (userId, updates) =>
          set((state) => {
            const syncMembers = (project: Project) => {
              // Update in members array
              project.members = project.members.map((m) => {
                const memberId =
                  typeof m.user === "object" ? m.user._id : m.user;
                if (memberId === userId) {
                  return { ...m, user: { ...m.user, ...updates } };
                }
                return m;
              });

              // Update owner if same user
              if (
                typeof project.owner === "object" &&
                project.owner._id === userId
              ) {
                project.owner = { ...project.owner, ...updates };
              }
            };

            // Sync in projects list
            const idx = state.projects.findIndex((p) =>
              p.members.some((m) => {
                const memberId =
                  typeof m.user === "object" ? m.user._id : m.user;
                return memberId === userId;
              }),
            );
            if (idx !== -1) syncMembers(state.projects[idx]);

            // Sync in currentProject
            if (state.currentProject) syncMembers(state.currentProject);
          }),

        updateProjectStatus: (projectId, status) =>
          set((state) => {
            const idx = state.projects.findIndex((p) => p._id === projectId);
            if (idx !== -1) state.projects[idx].status = status;
            if (state.currentProject?._id === projectId) {
              state.currentProject.status = status;
            }
          }),

        removeProject: (projectId) =>
          set((state) => {
            state.projects = state.projects.filter((p) => p._id !== projectId);
            if (state.currentProject?._id === projectId) {
              state.currentProject = null;
            }
          }),

        getMyRole: (userId) => {
          const project = get().currentProject;
          if (!project) return null;
          const member = project.members.find((m) => m.user._id === userId);
          return member?.role ?? null;
        },
      })),
      {
        name: "project-storage",
        partialize: (state) => ({
          currentProject: state.currentProject,
        }),
      },
    ),
    { name: "ProjectStore" },
  ),
);
