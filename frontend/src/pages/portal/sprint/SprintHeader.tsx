import { useState } from "react";
import { useSprintStore } from "@/stores";
import { useSprint, useRBAC } from "@/hooks";
import { sprintService } from "@/services";
import { toast } from "sonner";
import {
  ChevronDown,
  Plus,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  Play,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSprintStatusColor } from "@/lib/constants";
import { formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import CreateSprintDialog from "./CreateSprintDialog";
import EditSprintDialog from "./EditSprintDialog";
import DeleteSprintDialog from "./DeleteSprintDialog";
import type { Sprint } from "@/types";

interface SprintHeaderProps {
  projectId: string;
}

export default function SprintHeader({ projectId }: SprintHeaderProps) {
  const sprints = useSprintStore((s) => s.sprints);
  const currentSprint = useSprintStore((s) => s.currentSprint);
  const { setCurrentSprint, updateSprintStatus, toggleSprintLock } =
    useSprint(projectId);
  const { canManageSprint, canLockSprint } = useRBAC();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  const handleStatusChange = async (
    sprint: Sprint,
    status: "Planned" | "Active" | "Completed",
  ) => {
    if (sprint.status === status) return;
    setIsChangingStatus(true);
    // Optimistic
    updateSprintStatus(sprint._id, status);
    try {
      await sprintService.updateStatus(sprint._id, status, projectId);
      toast.success(`Sprint marked as ${status}`);
    } catch (err: any) {
      // Rollback
      updateSprintStatus(sprint._id, sprint.status);
      toast.error(
        err.response?.data?.message ?? "Failed to update sprint status.",
      );
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleToggleLock = async () => {
    if (!currentSprint) return;
    setIsTogglingLock(true);
    const newLockState = !currentSprint.isLocked;
    // Optimistic
    toggleSprintLock(currentSprint._id, newLockState);
    try {
      await sprintService.toggleLock(
        currentSprint._id,
        currentSprint.projectId,
        newLockState,
      );
      toast.success(
        currentSprint.isLocked ? "Sprint unlocked." : "Sprint locked.",
      );
    } catch {
      toggleSprintLock(currentSprint._id, currentSprint.isLocked);
      toast.error("Failed to toggle sprint lock.");
    } finally {
      setIsTogglingLock(false);
    }
  };

  const statusIcon = {
    Planned: <Circle className="h-3 w-3" />,
    Active: <Play className="h-3 w-3" />,
    Completed: <CheckCircle2 className="h-3 w-3" />,
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0 flex-wrap">
        {/* Sprint selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-8 gap-1.5 rounded-xl text-sm font-semibold max-w-56 truncate"
            >
              <span className="truncate">
                {currentSprint?.name ?? "Select Sprint"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 rounded-2xl font-semibold"
          >
            <DropdownMenuLabel className="text-[12px] text-muted-foreground font-semibold">
              All Sprints
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sprints.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">No sprints yet</p>
              </div>
            ) : (
              sprints.map((sprint) => (
                <DropdownMenuItem
                  key={sprint._id}
                  onClick={() => setCurrentSprint(sprint)}
                  className={cn(
                    "rounded-xl gap-2 text-sm flex items-center justify-between",
                    currentSprint?._id === sprint._id && "bg-primary/10",
                  )}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{sprint.name}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {formatShortDate(sprint.startDate)}{" "}
                      <ArrowRight className="!w-3" />{" "}
                      {formatShortDate(sprint.endDate)}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[12px] px-1.5 shrink-0 rounded-full font-semibold",
                      getSprintStatusColor(sprint.status),
                    )}
                  >
                    {sprint.status}
                  </Badge>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Current sprint info */}
        {currentSprint && (
          <>
            <Badge
              variant="outline"
              className={cn(
                "text-[12px] px-2 h-6 rounded-lg font-semibold",
                getSprintStatusColor(currentSprint.status),
              )}
            >
              {currentSprint.status}
            </Badge>

            <span className="text-[12px] text-muted-foreground font-semibold hidden sm:block">
              {formatShortDate(currentSprint.startDate)} -{" "}
              {formatShortDate(currentSprint.endDate)}
            </span>

            {currentSprint.isLocked && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 h-6 rounded-lg gap-1 border-yellow-400/50 text-yellow-600 bg-yellow-400/10 font-semibold"
              >
                <Lock className="h-2.5 w-2.5" />
                Locked
              </Badge>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Status change */}
          {currentSprint && canManageSprint && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl font-medium text-xs gap-1.5"
                  disabled={isChangingStatus}
                >
                  {statusIcon[currentSprint.status]}
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 rounded-2xl">
                {(["Planned", "Active", "Completed"] as const).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(currentSprint, status)}
                    disabled={currentSprint.status === status}
                    className={cn(
                      "rounded-xl gap-2 text-xs font-medium",
                      currentSprint.status === status && "opacity-50",
                    )}
                  >
                    {statusIcon[status]}
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Lock toggle */}
          {currentSprint && canLockSprint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={handleToggleLock}
                  disabled={isTogglingLock}
                >
                  {currentSprint.isLocked ? (
                    <Unlock className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-primary font-medium text-primary-foreground">
                {currentSprint.isLocked ? "Unlock sprint" : "Lock sprint"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Edit sprint */}
          {currentSprint && canManageSprint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-primary font-medium text-primary-foreground">
                Edit sprint
              </TooltipContent>
            </Tooltip>
          )}

          {/* Delete sprint */}
          {currentSprint && canManageSprint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-primary font-medium text-primary-foreground">
                Delete sprint
              </TooltipContent>
            </Tooltip>
          )}

          {/* Create sprint */}
          {canManageSprint && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateSprintDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
      />
      {currentSprint && (
        <>
          <EditSprintDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            sprint={currentSprint}
          />
          <DeleteSprintDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            sprint={currentSprint}
          />
        </>
      )}
    </TooltipProvider>
  );
}
