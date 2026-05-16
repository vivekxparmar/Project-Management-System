import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardBurndownProps {
  burndown: DashboardData["charts"]["burndown"];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2.5 text-xs shadow-lg">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foregroundfont-medium">{p.name}:</span>
          <span className="font-medium">{p.value} pts</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardBurndown({ burndown }: DashboardBurndownProps) {
  if (!burndown.hasActiveSprint) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Burndown Chart</h3>
        </div>
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="text-center">
            <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-semibold">
              No active sprint
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1 font-semibold">
              Start a sprint to see the burndown chart
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Merge ideal and actual by day
  const chartData = burndown.ideal.map((idealPoint) => {
    const actualPoint = burndown.actual.find((a) => a.day === idealPoint.day);
    return {
      date: formatShortDate(idealPoint.date),
      Ideal: idealPoint.remainingPoints,
      Actual: actualPoint?.remainingPoints ?? null,
    };
  });

  // Today's position
  const today = new Date().toISOString().split("T")[0];
  const todayIndex = burndown.actual.findIndex((a) => a.date === today);
  const todayLabel =
    todayIndex >= 0 ? formatShortDate(burndown.actual[todayIndex].date) : null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">Burndown Chart</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold">
            {burndown.sprintName} · {formatShortDate(burndown.startDate)} →{" "}
            {formatShortDate(burndown.endDate)}
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-[11px] px-2 py-0.5 rounded-lg bg-blue-400/10 text-blue-600 border-blue-400/30 font-semibold"
        >
          {burndown.totalPoints} total points
        </Badge>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{
              fontSize: 10,
              fontWeight: 600,
              fill: "hsl(var(--muted-foreground))",
            }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
          />
          {/* Today line */}
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{
                value: "Today",
                fontSize: 10,
                fontWeight: 600,
                fill: "hsl(var(--primary))",
                position: "insideTopRight",
              }}
            />
          )}
          {/* Ideal line */}
          <Line
            type="monotone"
            dataKey="Ideal"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
          {/* Actual line */}
          <Line
            type="monotone"
            dataKey="Actual"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Points",
            value: burndown.totalPoints,
            color: "text-foreground",
          },
          {
            label: "Remaining",
            value:
              burndown.actual[burndown.actual.length - 1]?.remainingPoints ??
              burndown.totalPoints,
            color: "text-yellow-600",
          },
          {
            label: "Completed",
            value:
              burndown.totalPoints -
              (burndown.actual[burndown.actual.length - 1]?.remainingPoints ??
                burndown.totalPoints),
            color: "text-green-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-muted/40 rounded-xl px-3 py-2 text-center "
          >
            <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
            <p className="text-[12px] font-semibold text-muted-foreground mt-0.5">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
