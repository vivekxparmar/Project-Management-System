import type { Project } from "@/types";
import { formatDate } from "@/lib/utils";
import { getProjectStatusColor, getInitials } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderOpen } from "lucide-react";

interface ProjectListProps {
  projects: Project[];
}

export default function ProjectList({ projects }: ProjectListProps) {
  const navigate = useNavigate();

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FolderOpen className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          No projects yet
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1 font-semibold">
          Create your first project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold text-foreground uppercase tracking-wide">
        <div className="col-span-5">Project</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Members</div>
        <div className="col-span-2">Created</div>
        <div className="col-span-1">Role</div>
      </div>

      {projects.map((project, i) => (
        <motion.div
          key={project._id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => navigate(`/projects/portal/${project._id}`)}
          className="grid grid-cols-12 gap-4 px-4 py-3 bg-card border border-border rounded-2xl
            cursor-pointer hover:border-primary/30 hover:bg-muted/20 transition-all items-center"
        >
          {/* Name + description */}
          <div className="col-span-5 min-w-0">
            <p className="text-sm font-medium truncate">{project.name}</p>
            {/* {project.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {project.description}
              </p>
            )} */}
          </div>

          {/* Status */}
          <div className="col-span-2">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 rounded-lg border ${getProjectStatusColor(project.status)}`}
            >
              {project.status}
            </Badge>
          </div>

          {/* Members */}
          <div className="col-span-2">
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 3).map((m) => (
                <Avatar key={m._id} className="h-6 w-6 border-2 border-card">
                  <AvatarImage src={m.user.avatar} />
                  <AvatarFallback className="text-[9px] font-semibold bg-primary text-primary-foreground">
                    {getInitials(m.user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 3 && (
                <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground">
                    +{project.members.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Created */}
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground font-semibold">
              {formatDate(project.createdAt)}
            </span>
          </div>

          {/* My role */}
          <div className="col-span-1">
            <span className="text-[10px] text-muted-foreground font-semibold">
              {(project.myRole ?? "Member").toUpperCase()}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
