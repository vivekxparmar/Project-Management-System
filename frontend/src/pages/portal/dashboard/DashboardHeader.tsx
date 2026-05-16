import { LayoutDashboard, RefreshCw, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from "@/stores";
import { getProjectStatusColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  // lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  healthScore: number;
  projectStatus: string;
}

function HealthBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-400/15 text-green-600 border-green-400/30"
      : score >= 50
        ? "bg-yellow-400/15 text-yellow-600 border-yellow-400/30"
        : "bg-red-400/15 text-red-600 border-red-400/30";

  const label = score >= 75 ? "Healthy" : score >= 50 ? "Fair" : "At Risk";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] px-2.5 py-0.5 rounded-xl border gap-1.5",
        color,
      )}
    >
      <Heart className="h-3 w-3" />
      {label} · {score}%
    </Badge>
  );
}

export function DashboardHeader({
  // lastUpdated,
  onRefresh,
  isRefreshing,
  healthScore,
  projectStatus,
}: DashboardHeaderProps) {
  const projectName = useProjectStore(
    (s) => s.currentProject?.name ?? "Project",
  );

  // const formatTime = (date: Date) =>
  //   date.toLocaleTimeString("en-US", {
  //     hour: "2-digit",
  //     minute: "2-digit",
  //   });

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <LayoutDashboard className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-[12px] text-muted-foreground font-semibold">
            {projectName}
          </p>
        </div>
      </div>

      {/* Health + status */}
      <div className="flex items-center gap-2">
        <HealthBadge score={healthScore} />
        <Badge
          variant="outline"
          className={cn(
            "text-[11px] px-2.5 py-0.5 rounded-xl border",
            getProjectStatusColor(projectStatus as any),
          )}
        >
          {projectStatus}
        </Badge>
      </div>

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
        />
        Refresh
      </Button>
    </div>
  );
}
