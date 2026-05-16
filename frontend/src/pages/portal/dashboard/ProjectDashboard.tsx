import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { dashboardService } from "@/services";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardStatCards } from "./DashboardStatCards";
import { DashboardSprintProgress } from "./DashboardSprintProgress";
import { DashboardTaskStatus } from "./DashboardTaskStatus";
import { DashboardBugStats } from "./DashboardBugStats";
import { DashboardPriorityChart } from "./DashboardPriorityChart";

import { DashboardBurndown } from "./DashboardBurndown";
import { DashboardTimeline } from "./DashboardTimeline";
import { DashboardSkeleton } from "./DashboardSkeleton";

// backend response
export interface DashboardData {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    healthScore: number;
  };
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    totalBugs: number;
    openBugs: number;
    resolvedBugs: number;
    totalSprints: number;
    activeSprints: number;
    completionRate: number;
  };
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    totalEstimate: number;
    totalTrackedTime: number; // seconds
    remainingEstimate: number;
    efficiency: number;
    byAssignee: Record<string, any>;
    subtasks: {
      total: number;
      completed: number;
      inProgress: number;
    };
  };
  bugStats: {
    total: number;
    open: number;
    inProgress: number;
    inReview: number;
    fixed: number;
    closed: number;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    averageResolutionTime: number;
    criticalBugs: number;
  };
  sprintStats: {
    total: number;
    planned: number;
    active: number;
    completed: number;
    averageVelocity: number;
    totalPlannedPoints: number;
    totalCompletedPoints: number;
    completionRate: number;
    averageSprintDays: number;
  };
  charts: {
    burndown: {
      hasActiveSprint: boolean;
      sprintName: string;
      startDate: string;
      endDate: string;
      totalPoints: number;
      ideal: Array<{ day: number; date: string; remainingPoints: number }>;
      actual: Array<{ day: number; date: string; remainingPoints: number }>;
    };
    velocity: {
      sprints: any[];
      averageVelocity: number;
      trend: number;
    };
    timeline: Array<{
      date: string;
      tasksCreated: number;
      tasksCompleted: number;
      bugsCreated: number;
      bugsResolved: number;
    }>;
    activityHeatmap: Array<{
      day: number;
      hour: number;
      count: number;
    }>;
    taskDistribution: {
      todo: number;
      inProgress: number;
      done: number;
    };
    priorityDistribution: Record<
      string,
      { tasks: number; bugs: number; total: number }
    >;
    statusDistribution: {
      tasks: { todo: number; inProgress: number; done: number };
      bugs: {
        open: number;
        inProgress: number;
        inReview: number;
        fixed: number;
        closed: number;
      };
    };
  };
  teamPerformance: Array<{
    user: { _id: string; name: string; avatar: string };
    role: string;
    assignedTasks: number;
    doneTasks: number;
    assignedBugs: number;
  }>;
  resourceUsage: {
    total: number;
    byType: Record<string, number>;
    recent: any[];
  };
}

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await dashboardService.getData(projectId);
      setData(res.data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [projectId]);

  if (isLoading && !data) return <DashboardSkeleton />;
  if (!data) return null;

  return (
    <div className="flex flex-col h-full overflow-auto custom-scroll">
      <div className="py-6 flex flex-col gap-5 px-5 mx-auto w-full">
        <DashboardHeader
          lastUpdated={lastUpdated}
          onRefresh={fetchDashboard}
          isRefreshing={isLoading}
          healthScore={data.project.healthScore}
          projectStatus={data.project.status}
        />

        {/* KPI stat cards */}
        <DashboardStatCards
          overview={data.overview}
          sprintStats={data.sprintStats}
        />

        {/* Burndown chart + Task donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DashboardBurndown burndown={data.charts.burndown} />
          </div>
          <DashboardTaskStatus
            taskDistribution={data.charts.taskDistribution}
            taskStats={data.taskStats}
          />
        </div>

        {/* Sprint progress + Bug stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DashboardSprintProgress sprintStats={data.sprintStats} />
          <DashboardBugStats bugStats={data.bugStats} />
        </div>

        {/* Priority chart + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DashboardPriorityChart
            priorityDistribution={data.charts.priorityDistribution}
          />
          <DashboardTimeline timeline={data.charts.timeline} />
        </div>
      </div>
    </div>
  );
}
