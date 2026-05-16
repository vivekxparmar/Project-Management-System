import { useState } from "react";
import { useTaskStore } from "@/stores";
import { useRBAC } from "@/hooks";
import { Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateBacklogTaskDialog from "./CreateBacklogTaskDialog";

export default function BacklogHeader() {
  const backlogTasks = useTaskStore((s) => s.backlogTasks);
  const { canCreateTask } = useRBAC();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Backlog</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">
            {backlogTasks.length} task{backlogTasks.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex-1" />

        {/* Create task */}
        {canCreateTask && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        )}
      </div>

      <CreateBacklogTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
