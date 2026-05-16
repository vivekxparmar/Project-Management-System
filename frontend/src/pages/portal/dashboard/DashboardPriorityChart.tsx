import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { getPriorityColor } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardPriorityChartProps {
  priorityDistribution: DashboardData["charts"]["priorityDistribution"];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2.5 text-xs shadow-lg">
      <div className="mb-1.5">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] rounded-lg font-semibold px-2 py-0",
            getPriorityColor(label),
          )}
        >
          {label}
        </Badge>
      </div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.fill }}
          />
          <span className="text-muted-foreground font-medium">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardPriorityChart({
  priorityDistribution,
}: DashboardPriorityChartProps) {
  // Convert priorityDistribution object to array
  const data = Object.entries(priorityDistribution).map(
    ([priority, stats]) => ({
      priority,
      Tasks: stats.tasks,
      Bugs: stats.bugs,
      total: stats.total,
    }),
  );

  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Priority Breakdown</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[11px] text-muted-foreground font-semibold">
              Tasks
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-[11px] text-muted-foreground font-semibold">
              Bugs
            </span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <p className="text-xs text-muted-foreground">No data yet</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              barSize={14}
              barGap={3}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="priority"
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
                cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
              />
              <Bar
                dataKey="Tasks"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                fillOpacity={0.85}
              />
              <Bar
                dataKey="Bugs"
                fill="#f87171"
                radius={[4, 4, 0, 0]}
                fillOpacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Priority summary */}
          <div className="flex gap-2 flex-wrap">
            {data
              .filter((d) => d.total > 0)
              .map((d) => (
                <div
                  key={d.priority}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px]",
                    getPriorityColor(d.priority as any),
                  )}
                >
                  <span className="font-bold">{d.priority}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{d.total} total</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
