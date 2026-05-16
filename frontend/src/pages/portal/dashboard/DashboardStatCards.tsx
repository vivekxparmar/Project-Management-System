import { motion } from "framer-motion";
import { Zap, CheckSquare, Bug, TrendingUp, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardData } from "./ProjectDashboard";

interface DashboardStatCardsProps {
  overview: DashboardData["overview"];
  sprintStats: DashboardData["sprintStats"];
}

export function DashboardStatCards({
  overview,
  sprintStats,
}: DashboardStatCardsProps) {
  const cards = [
    {
      label: "Total Tasks",
      value: overview.totalTasks,
      sub: `${overview.completedTasks} completed · ${overview.inProgressTasks} in progress`,
      icon: CheckSquare,
      iconBg: "bg-blue-400/20",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Bugs",
      value: overview.totalBugs,
      sub: `${overview.openBugs} open · ${overview.resolvedBugs} resolved`,
      icon: Bug,
      iconBg: "bg-red-400/20",
      iconColor: "text-red-600",
    },
    {
      label: "Sprints",
      value: overview.totalSprints,
      sub: `${sprintStats.active} active · ${sprintStats.completed} completed`,
      icon: Zap,
      iconBg: "bg-purple-400/20",
      iconColor: "text-purple-600",
    },
    {
      label: "Completion Rate",
      value: `${overview.completionRate}%`,
      sub: `${overview.completedTasks} of ${overview.totalTasks} tasks done`,
      icon: TrendingUp,
      iconBg: "bg-green-400/20",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3"
          >
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                card.iconBg,
              )}
            >
              <Icon className={cn("h-4 w-4", card.iconColor)} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                {card.label}
              </p>
              <p className="text-[12px] text-muted-foreground/60 mt-0.5 leading-tight font-semibold">
                {card.sub}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
