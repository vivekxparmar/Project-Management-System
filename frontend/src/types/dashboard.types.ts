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
    totalTrackedTime: number;
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
    activityHeatmap: Array<{ day: number; hour: number; count: number }>;
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
  teamPerformance: any[];
  resourceUsage: {
    total: number;
    byType: Record<string, number>;
    recent: any[];
  };
}

// For backward compatibility with existing components, create a mapped version
export interface DashboardDataMapped {
  counts: {
    totalSprints: number;
    activeSprints: number;
    totalTasks: number;
    backlogTasks: number;
    totalBugs: number;
    totalMembers: number;
  };
  taskStatus: {
    todo: number;
    in_progress: number;
    done: number;
  };
  bugStats: {
    open: number;
    in_progress: number;
    in_review: number;
    fixed: number;
    closed: number;
    total: number;
  };
  priorityBreakdown: Array<{
    priority: string;
    tasks: number;
    bugs: number;
  }>;
  sprintStats: Array<{
    _id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    taskCount: number;
    doneCount: number;
  }>;
  totalTrackedSeconds: number;
  totalEstimateHours: number;
  memberStats: Array<{
    user: { _id: string; name: string; avatar: string };
    role: string;
    assignedTasks: number;
    doneTasks: number;
    assignedBugs: number;
  }>;
}
