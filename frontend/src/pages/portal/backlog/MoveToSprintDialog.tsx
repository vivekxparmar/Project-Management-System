import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSprintStore, useTaskStore } from "@/stores";
import { taskService } from "@/services";
import { getSprintStatusColor } from "@/lib/constants";
import { formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MoveToSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export default function MoveToSprintDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}: MoveToSprintDialogProps) {
  const sprints = useSprintStore((s) => s.sprints);
  const { moveTaskToSprint, backlogTasks } = useTaskStore();
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Only allow moving to Planned or Active sprints that are not locked
  const availableSprints = sprints.filter(
    (s) => s.status !== "Completed" && !s.isLocked,
  );

  const handleMove = async () => {
    if (!selectedSprintId) {
      toast.error("Please select a sprint.");
      return;
    }
    setIsLoading(true);
    const task = backlogTasks.find((t) => t._id === taskId);
    if (!task) return;

    // Optimistic
    moveTaskToSprint(taskId, selectedSprintId, {
      ...task,
      sprintId: selectedSprintId,
      isInBacklog: false,
    });

    try {
      await taskService.moveToSprint(taskId, selectedSprintId, task.projectId);
      toast.success("Task moved to sprint.");
      onOpenChange(false);
      setSelectedSprintId("");
    } catch {
      // Rollback — add back to backlog
      useTaskStore.getState().addBacklogTask(task);
      useTaskStore.getState().removeTask(taskId, selectedSprintId);
      toast.error("Failed to move task.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setSelectedSprintId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Move to sprint</DialogTitle>
          <DialogDescription className="text-xs">
            Select a sprint to move{" "}
            <span className="font-medium text-foreground">"{taskTitle}"</span>{" "}
            into.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Sprint</Label>
            {availableSprints.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-3">
                No available sprints. Create a sprint first or unlock an
                existing one.
              </p>
            ) : (
              <Select
                value={selectedSprintId}
                onValueChange={setSelectedSprintId}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Select a sprint..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {availableSprints.map((sprint) => (
                    <SelectItem
                      key={sprint._id}
                      value={sprint._id}
                      className="rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{sprint.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0",
                            getSprintStatusColor(sprint.status),
                          )}
                        >
                          {sprint.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatShortDate(sprint.endDate)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleMove}
              disabled={
                isLoading || !selectedSprintId || availableSprints.length === 0
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Move to sprint"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
