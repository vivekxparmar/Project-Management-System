import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Bug, AlertTriangle } from "lucide-react";
// import { cn } from "@/lib/utils";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardBugStatsProps {
  bugStats: DashboardData["bugStats"];
}

const BUG_STATUS_COLORS: Record<string, string> = {
  Open: "#f87171",
  "In Progress": "#60a5fa",
  "In Review": "#a78bfa",
  Fixed: "#34d399",
  Closed: "#94a3b8",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground font-semibold">
        {payload[0].value} bugs
      </p>
    </div>
  );
};

export function DashboardBugStats({ bugStats }: DashboardBugStatsProps) {
  // Use byStatus from backend
  const data = Object.entries(bugStats.byStatus).map(([name, value]) => ({
    name,
    value,
  }));

  // const activeCount = bugStats.open + bugStats.inProgress;
  // const activePercent =
  //   bugStats.total > 0 ? Math.round((activeCount / bugStats.total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold">Bug Statistics</h3>
        <div className="flex items-center gap-2">
          {bugStats.criticalBugs > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 rounded-lg border-red-400/50 text-red-600 bg-red-400/10 gap-1 font-semibold"
            >
              <AlertTriangle className="h-3 w-3" />
              {bugStats.criticalBugs} critical
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <Bug className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-semibold">
              {bugStats.total} total
            </span>
          </div>
        </div>
      </div>

      {bugStats.total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
          <Bug className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No bugs reported</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              barSize={28}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 10,
                  fontWeight: 600,
                  fill: "hsl(var(--muted-foreground))",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fontWeight: 600,
                  fill: "hsl(var(--muted-foreground))",
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted))", radius: 6 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={BUG_STATUS_COLORS[entry.name] ?? "#94a3b8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary row */}
          <div className="grid grid-cols-5 gap-1">
            {data.map((item) => (
              <div key={item.name} className="flex flex-col items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: BUG_STATUS_COLORS[item.name] ?? "#94a3b8",
                  }}
                />
                <span className="text-[11px] font-bold">{item.value}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight font-semibold">
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* Priority breakdown from byPriority */}
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">
              By Priority
            </p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(bugStats.byPriority)
                .filter(([, v]) => v > 0)
                .map(([priority, count]) => (
                  <div
                    key={priority}
                    className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1"
                  >
                    <span className="text-[12px] font-semibold text-primary">
                      {priority}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
