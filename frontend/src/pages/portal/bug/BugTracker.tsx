import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useBugStore } from "@/stores";
import { bugService } from "@/services";
import { useRBAC } from "@/hooks";
import BugHeader from "./BugHeader";
import BugTable from "./BugTable";
import BugDetailSheet from "./BugDetailSheet";
import PageLoader from "@/components/shared/PageLoader";
import { motion } from "framer-motion";
import { Bug } from "lucide-react";

export default function BugTracker() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    bugs,
    isLoading,
    setBugs,
    setLoading,
    selectedBugId,
    setSelectedBugId,
  } = useBugStore();
  const { myRole } = useRBAC();

  const selectedBug = bugs.find((b) => b._id === selectedBugId) ?? null;

  useEffect(() => {
    if (!projectId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await bugService.getAll(projectId);
        setBugs(res.data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  // Sync selectedBugId with URL param
  useEffect(() => {
    const bugId = searchParams.get("bugId");
    if (bugId) {
      setSelectedBugId(bugId);
    } else {
      setSelectedBugId(null);
    }
  }, [searchParams]);

  const handleOpenBug = (bugId: string) => {
    setSearchParams({ bugId });
  };

  const handleCloseBug = () => {
    setSearchParams({});
    setSelectedBugId(null);
  };

  if (isLoading) return <PageLoader rows={6} />;

  return (
    <div className="flex flex-col h-full">
      <BugHeader projectId={projectId!} myRole={myRole ?? "Client"} />

      {bugs.length === 0 ? (
        <EmptyBugState />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-hidden"
        >
          <BugTable
            bugs={bugs}
            projectId={projectId!}
            myRole={myRole ?? "Client"}
            onRowClick={handleOpenBug}
          />
        </motion.div>
      )}

      {/* Right side sheet */}
      <BugDetailSheet
        bug={selectedBug}
        open={!!selectedBugId}
        onClose={handleCloseBug}
        projectId={projectId!}
        myRole={myRole ?? "Client"}
      />
    </div>
  );
}

function EmptyBugState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-24">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Bug className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No bugs reported yet
      </p>
      <p className="text-xs text-muted-foreground/60">
        Report a bug to start tracking issues
      </p>
    </div>
  );
}
