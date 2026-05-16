import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardSprintProgressProps {
  sprintStats: DashboardData["sprintStats"];
}

export function DashboardSprintProgress({
  sprintStats,
}: DashboardSprintProgressProps) {
  const completionRate = Math.round(sprintStats.completionRate * 100) / 100;

  const rows = [
    {
      label: "Total Sprints",
      value: sprintStats.total,
      color: "text-foreground",
      badge: "bg-red-200 text-red-700 font-semibold rounded-lg",
    },
    {
      label: "Planned",
      value: sprintStats.planned,
      color: "text-gray-600",
      badge: "bg-gray-200 text-gray-700 font-semibold rounded-lg",
    },
    {
      label: "Active",
      value: sprintStats.active,
      color: "text-blue-600",
      badge: "bg-blue-200 text-blue-700 font-semibold rounded-lg",
    },
    {
      label: "Completed",
      value: sprintStats.completed,
      color: "text-green-600",
      badge: "bg-green-200 text-green-700 font-semibold rounded-lg",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sprint Overview</h3>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold">
            {sprintStats.total} sprint{sprintStats.total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Sprint completion rate */}
      <div className="flex flex-col gap-2 p-3 bg-muted/40 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-semibold">
            Completion Rate
          </span>
          <span className="text-xs font-bold">{completionRate}%</span>
        </div>
        <Progress
          value={completionRate}
          className={cn(
            "h-2 rounded-full",
            completionRate === 100 && "[&>div]:bg-green-500",
          )}
        />
      </div>

      {/* Sprint stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="bg-muted/30 rounded-xl p-3 flex flex-col gap-1"
          >
            <p className={cn("text-xl font-bold", row.color)}>{row.value}</p>
            <Badge className={(cn("text-[11px] "), row.badge)}>
              {row.label}
            </Badge>
          </div>
        ))}
      </div>

      {/* Velocity */}
      {sprintStats.averageVelocity > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
          <span className="text-xs text-muted-foreground">Avg. Velocity</span>
          <span className="text-sm font-bold text-primary">
            {sprintStats.averageVelocity} pts/sprint
          </span>
        </div>
      )}
    </div>
  );
}
