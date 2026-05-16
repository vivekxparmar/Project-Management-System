import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardMemberStatsProps {
  teamPerformance: DashboardData["teamPerformance"];
  overview: DashboardData["overview"];
}

const ROLE_COLORS: Record<string, string> = {
  Owner: "bg-yellow-400/15 text-yellow-600 border-yellow-400/30",
  Admin: "bg-purple-400/15 text-purple-600 border-purple-400/30",
  Developer: "bg-blue-400/15 text-blue-600 border-blue-400/30",
  Designer: "bg-pink-400/15 text-pink-600 border-pink-400/30",
  Client: "bg-gray-400/15 text-gray-600 border-gray-400/30",
};

export function DashboardMemberStats({
  teamPerformance,
  overview,
}: DashboardMemberStatsProps) {
  // teamPerformance may be empty array from backend
  const hasData = teamPerformance.length > 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Team Performance</h3>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold">
            {overview.totalTasks} total tasks
          </span>
        </div>
      </div>

      {!hasData ? (
        // When teamPerformance is empty, show overview summary cards instead
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              label: "Total Tasks",
              value: overview.totalTasks,
              sub: "across all members",
              color: "text-blue-600",
            },
            {
              label: "Completed",
              value: overview.completedTasks,
              sub: `${overview.completionRate}% completion`,
              color: "text-green-600",
            },
            {
              label: "In Progress",
              value: overview.inProgressTasks,
              sub: "being worked on",
              color: "text-yellow-600",
            },
            {
              label: "Open Bugs",
              value: overview.openBugs,
              sub: `${overview.totalBugs} total bugs`,
              color: "text-red-600",
            },
            {
              label: "Active Sprints",
              value: overview.activeSprints,
              sub: `${overview.totalSprints} total sprints`,
              color: "text-purple-600",
            },
            {
              label: "Resolved Bugs",
              value: overview.resolvedBugs,
              sub: "fixed or closed",
              color: "text-teal-600",
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-muted/30 rounded-xl p-3"
            >
              <p className={cn("text-2xl font-bold", item.color)}>
                {item.value}
              </p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                {item.label}
              </p>
              <p className="text-[12px] font-semibold text-muted-foreground/60 mt-0.5">
                {item.sub}
              </p>
            </motion.div>
          ))}
        </div>
      ) : (
        // Full member table when teamPerformance has data
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2.5 pr-4">
                  Member
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2.5 pr-4">
                  Role
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2.5 pr-4">
                  Tasks
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2.5 pr-4 w-40">
                  Progress
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2.5">
                  Bugs
                </th>
              </tr>
            </thead>
            <tbody>
              {teamPerformance.map((m: any, i: number) => {
                const donePercent =
                  m.assignedTasks > 0
                    ? Math.round((m.doneTasks / m.assignedTasks) * 100)
                    : 0;

                return (
                  <motion.tr
                    key={m.user?._id ?? i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={m.user?.avatar} />
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                            {getInitials(m.user?.name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {m.user?.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-lg border",
                          ROLE_COLORS[m.role] ?? ROLE_COLORS["Client"],
                        )}
                      >
                        {m.user.role}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">
                          {m.assignedTasks}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({m.doneTasks} done)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={donePercent}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            donePercent === 100 && "[&>div]:bg-green-500",
                          )}
                        />
                        <span className="text-[11px] font-semibold w-8 text-right tabular-nums">
                          {donePercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">
                          {m.assignedBugs ?? 0}
                        </span>
                        {(m.assignedBugs ?? 0) > 0 && (
                          <span className="text-[10px] text-red-500 font-medium">
                            bug{m.assignedBugs !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
