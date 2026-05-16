import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTaskStore } from "@/stores";
import { taskService } from "@/services";
import { useRBAC } from "@/hooks";
import BacklogHeader from "./BacklogHeader";
import BacklogTable from "./BacklogTable";
import PageLoader from "@/components/shared/PageLoader";
import { motion } from "framer-motion";
import { Archive } from "lucide-react";

export default function Backlog() {
  const { projectId } = useParams<{ projectId: string }>();
  const { backlogTasks, isBacklogLoading, setBacklogTasks, setBacklogLoading } =
    useTaskStore();
  const { myRole } = useRBAC();

  useEffect(() => {
    if (!projectId) return;
    const fetch = async () => {
      setBacklogLoading(true);
      try {
        const res = await taskService.getBacklog(projectId);
        setBacklogTasks(res.data.data);
      } catch {
        // ignore
      } finally {
        setBacklogLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  if (isBacklogLoading) return <PageLoader rows={6} />;

  return (
    <div className="flex flex-col h-full gap-4">
      <BacklogHeader />
      {backlogTasks.length === 0 ? (
        <EmptyBacklogState />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-hidden"
        >
          <BacklogTable
            tasks={backlogTasks}
            projectId={projectId!}
            myRole={myRole ?? "Client"}
          />
        </motion.div>
      )}
    </div>
  );
}

function EmptyBacklogState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-24">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Archive className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Backlog is empty
      </p>
      <p className="text-xs text-muted-foreground/60">
        Tasks moved out of sprints will appear here
      </p>
    </div>
  );
}
