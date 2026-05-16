import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import { getProjectStatusColor, getInitials } from "@/lib/constants";
import type { Project } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Calendar } from "lucide-react";

// import { useAuthStore } from "@/stores";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  // const user = useAuthStore((s) => s.user);

  const handleOpen = () => {
    console.log("CLICK PROJECT ID:", project._id, project);
    navigate(`/projects/portal/${project._id}`);
  };

  return (
    <>
      <div
        onClick={handleOpen}
        className="group bg-card border border-border rounded-2xl p-4 cursor-pointer
          hover:border-primary/40 hover:shadow-sm transition-all duration-200 flex flex-col gap-3"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            {/* {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed font-semibold">
                {project.description}
              </p>
            )} */}
          </div>
        </div>

        {/* Status badge */}
        <Badge
          variant="outline"
          className={`w-fit text-[10px] px-2 py-0.5 rounded-lg border ${getProjectStatusColor(project.status)}`}
        >
          {project.status}
        </Badge>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {/* Member avatars */}
          <TooltipProvider delayDuration={0}>
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 4).map((m) => (
                <Tooltip key={m._id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 border-2 border-card">
                      <AvatarImage src={m.user.avatar} />
                      <AvatarFallback className="text-[8px] font-semibold bg-primary text-primary-foreground">
                        {getInitials(m.user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="text-xs bg-primary text-primary-foreground font-semibold"
                  >
                    {m.user.name} · {m.role}
                  </TooltipContent>
                </Tooltip>
              ))}
              {project.members.length > 4 && (
                <div className="h-5 w-5 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                  <span className="text-[8px] font-bold text-muted-foreground">
                    +{project.members.length - 4}
                  </span>
                </div>
              )}
            </div>
          </TooltipProvider>

          {/* Date */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
            <Calendar className="h-3 w-3" />
            {formatDate(project.createdAt)}
          </div>
        </div>
      </div>
    </>
  );
}
