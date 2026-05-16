import { useProjectStore } from "../stores";
import { useAuthStore } from "../stores";
import { projectService } from "../services";
import type { Project } from "../types";

export const useProject = () => {
  const {
    projects,
    currentProject,
    isLoading,
    isInitialized,
    setProjects,
    setCurrentProject,
    setLoading,
    setInitialized,
    addProject,
    updateProject,
    updateProjectStatus,
    removeProject,
  } = useProjectStore();

  const user = useAuthStore((s) => s.user);

  // Fetch all projects on mount
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectService.getAll();
      const projects: Project[] = res.data.data;

      // Attach myRole to each project
      const withRole = projects.map((p) => {
        const member = p.members.find((m) => m.user._id === user?._id);
        return {
          ...p,
          myRole: member?.role ?? "Client",
        };
      });

      setProjects(withRole);
      setInitialized(true);

      // Restore last selected project
      const savedId = localStorage.getItem("currentProjectId");
      if (savedId) {
        const saved = withRole.find((p) => p._id === savedId);
        if (saved) setCurrentProject(saved);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  // My role in current project
  const myRole = currentProject
    ? (currentProject.members.find((m) => m.user._id === user?._id)?.role ??
      "Client")
    : null;

  return {
    projects,
    currentProject,
    isLoading,
    isInitialized,
    myRole,
    fetchProjects,
    setCurrentProject,
    addProject,
    updateProject,
    updateProjectStatus,
    removeProject,
  };
};
