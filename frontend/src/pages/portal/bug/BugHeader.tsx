import { useState } from "react";
import { useBugStore } from "@/stores";
import { canReportBug } from "@/lib/constants";
import { Bug, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportBugDialog from "./ReportBugDialog";

interface BugHeaderProps {
  projectId: string;
  myRole: string;
}

export default function BugHeader({ projectId, myRole }: BugHeaderProps) {
  const bugs = useBugStore((s) => s.bugs);
  const [reportOpen, setReportOpen] = useState(false);
  const canReport = canReportBug(myRole);

  const openCount = bugs.filter((b) => b.status === "Open").length;
  const inProgressCount = bugs.filter((b) => b.status === "In Progress").length;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Bug Tracker</h2>
          <span className="text-[12px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">
            {bugs.length} total
          </span>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full font-semibold">
            {openCount} open
          </span>
          <span className="text-[12px] text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full font-semibold">
            {inProgressCount} in progress
          </span>
        </div>

        <div className="flex-1" />

        {canReport && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setReportOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Report Bug
          </Button>
        )}
      </div>

      <ReportBugDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        projectId={projectId}
      />
    </>
  );
}
