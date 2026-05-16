import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSprintStore, useTaskStore } from "@/stores";
import { useSprint, useRBAC } from "@/hooks";
import SprintHeader from "./SprintHeader";
import SprintTable from "./SprintTable";
import PageLoader from "@/components/shared/PageLoader";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function Sprint() {
  const { projectId } = useParams<{ projectId: string }>();
  const { fetchSprints, fetchSprintTasks } = useSprint(projectId);
  const sprints = useSprintStore((s) => s.sprints);
  const currentSprint = useSprintStore((s) => s.currentSprint);
  const isSprintLoading = useSprintStore((s) => s.isLoading);
  const tasksBySprintId = useTaskStore((s) => s.tasksBySprintId);
  const isTaskLoading = useTaskStore((s) => s.isLoading);
  const { myRole } = useRBAC();

  // Fetch tasks when currentSprint changes
  useEffect(() => {
    if (!currentSprint) return;
    const alreadyLoaded = tasksBySprintId[currentSprint._id];
    if (!alreadyLoaded) {
      fetchSprintTasks(currentSprint._id);
    }
  }, [currentSprint?._id]);

  const tasks = currentSprint ? (tasksBySprintId[currentSprint._id] ?? []) : [];

  if (isSprintLoading) return <PageLoader rows={6} />;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <SprintHeader projectId={projectId!} />

      {/* Body */}
      {!currentSprint ? (
        <EmptySprintState />
      ) : isTaskLoading ? (
        <PageLoader rows={5} />
      ) : (
        <motion.div
          key={currentSprint._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-hidden"
        >
          <SprintTable
            sprint={currentSprint}
            tasks={tasks}
            projectId={projectId!}
            myRole={myRole ?? "Client"}
          />
        </motion.div>
      )}
    </div>
  );
}

function EmptySprintState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-24">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Zap className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No sprints yet
      </p>
      <p className="text-xs text-muted-foreground/60 font-semibold">
        Create your first sprint to start planning
      </p>
    </div>
  );
}
