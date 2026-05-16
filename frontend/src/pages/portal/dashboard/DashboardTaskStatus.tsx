import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CheckSquare, Clock } from "lucide-react";
import { formatTrackedTime } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardTaskStatusProps {
  taskDistribution: DashboardData["charts"]["taskDistribution"];
  taskStats: DashboardData["taskStats"];
}

const COLORS = {
  todo: "#94a3b8",
  inProgress: "#3b82f6",
  done: "#22c55e",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-muted-foreground font-semibold">
        {payload[0].value} tasks
      </p>
    </div>
  );
};

export function DashboardTaskStatus({
  taskDistribution,
  taskStats,
}: DashboardTaskStatusProps) {
  const total =
    taskDistribution.todo + taskDistribution.inProgress + taskDistribution.done;

  const data = [
    { name: "Todo", value: taskDistribution.todo, color: COLORS.todo },
    {
      name: "In Progress",
      value: taskDistribution.inProgress,
      color: COLORS.inProgress,
    },
    { name: "Done", value: taskDistribution.done, color: COLORS.done },
  ].filter((d) => d.value > 0);

  const donePercent =
    total > 0 ? Math.round((taskDistribution.done / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Task Status</h3>
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold">
            {total} total
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-xs text-muted-foreground font-semibold">
            No tasks yet
          </p>
        </div>
      ) : (
        <>
          {/* Donut */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold">{donePercent}%</p>
              <p className="text-[11px] text-muted-foreground font-semibold">done</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="flex flex-col gap-1.5">
            {[
              {
                label: "Todo",
                value: taskDistribution.todo,
                color: COLORS.todo,
              },
              {
                label: "In Progress",
                value: taskDistribution.inProgress,
                color: COLORS.inProgress,
              },
              {
                label: "Done",
                value: taskDistribution.done,
                color: COLORS.done,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground font-semibold">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{item.value}</span>
                  <span className="text-[11px] text-muted-foreground w-8 text-right font-semibold">
                    {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Time tracking */}
          <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  Tracked time
                </p>
                <p className="text-sm font-bold">
                  {formatTrackedTime(taskStats.totalTrackedTime)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground font-semibold">Estimate</p>
              <p className="text-sm font-bold">{taskStats.totalEstimate}h</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
