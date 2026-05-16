import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity } from "lucide-react";
import { formatShortDate } from "@/lib/utils";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardTimelineProps {
  timeline: DashboardData["charts"]["timeline"];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2.5 text-xs shadow-lg">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div
          key={p.name}
          className="flex items-center gap-2 mb-0.5 font-semibold"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardTimeline({ timeline }: DashboardTimelineProps) {
  const data = timeline.map((t) => ({
    date: formatShortDate(t.date),
    "Tasks Created": t.tasksCreated,
    "Tasks Completed": t.tasksCompleted,
    "Bugs Created": t.bugsCreated,
    "Bugs Resolved": t.bugsResolved,
  }));

  const hasData = timeline.some(
    (t) =>
      t.tasksCreated > 0 ||
      t.tasksCompleted > 0 ||
      t.bugsCreated > 0 ||
      t.bugsResolved > 0,
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity Timeline</h3>
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold">
            {timeline.length} data point{timeline.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
          <Activity className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground font-semibold">
            No activity recorded yet
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tasksCreated" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="bugsCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tasksCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="Tasks Created"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#tasksCreated)"
              dot={{ r: 3 }}
            />
            <Area
              type="monotone"
              dataKey="Tasks Completed"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#tasksCompleted)"
              dot={{ r: 3 }}
            />
            <Area
              type="monotone"
              dataKey="Bugs Created"
              stroke="#f87171"
              strokeWidth={2}
              fill="url(#bugsCreated)"
              dot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
