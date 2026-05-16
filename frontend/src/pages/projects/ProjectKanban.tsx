import type { Project, ProjectStatus } from "@/types";
// import { PROJECT_STATUS_OPTIONS, getProjectStatusColor } from "@/lib/constants";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { projectService } from "@/services";
import { useProjectStore } from "@/stores";
import { toast } from "sonner";
import ProjectCard from "./ProjectCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectKanbanProps {
  projects: Project[];
}

export default function ProjectKanban({ projects }: ProjectKanbanProps) {
  const { updateProjectStatus } = useProjectStore();

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    projectId: string,
  ) => {
    e.dataTransfer.setData("projectId", projectId);
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    status: ProjectStatus,
  ) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("projectId");
    const project = projects.find((p) => p._id === projectId);
    if (!project || project.status === status) return;

    // Optimistic
    updateProjectStatus(projectId, status);

    try {
      await projectService.updateStatus(projectId, status);
      toast.success(`Project moved to ${status}`);
    } catch (error: any) {
      // Rollback
      updateProjectStatus(projectId, project.status);
      toast.error(
        error?.response?.data?.message || "Failed to update project status.",
      );
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const columns = PROJECT_STATUS_OPTIONS.map((s) => ({
    status: s.value,
    label: s.label,
    color: s.color,
    projects: projects.filter((p) => p?.status === s.value),
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map((col) => (
        <div
          key={col.status}
          onDrop={(e) => handleDrop(e, col.status as ProjectStatus)}
          onDragOver={handleDragOver}
          className="flex flex-col gap-3 min-h-[120px]"
        >
          {/* Column header */}
          <div className="flex items-center gap-2 px-1">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-lg border",
                col.color,
              )}
            >
              {col.label}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium ml-auto">
              {col.projects.length}
            </span>
          </div>

          {/* Drop zone */}
          <div
            className="flex flex-col gap-2.5 flex-1 rounded-2xl border-2 border-dashed border-transparent
            transition-colors p-1 min-h-[80px]"
          >
            {col.projects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-border py-8">
                <p className="text-xs text-muted-foreground/50 font-semibold">
                  No projects
                </p>
              </div>
            ) : (
              col.projects.map((project) => (
                <div
                  key={project._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project._id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <ProjectCard project={project} />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
