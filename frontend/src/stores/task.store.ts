import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Task, Subtask, TaskStatus, TaskUser } from "../types";

interface TaskState {
  tasksBySprintId: Record<string, Task[]>;
  backlogTasks: Task[];
  expandedTaskIds: Record<string, boolean>;

  isLoading: boolean;
  isBacklogLoading: boolean;

  setSprintTasks: (sprintId: string, tasks: Task[]) => void;
  addTask: (sprintId: string, task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string, sprintId: string) => void;
  moveTaskToBacklog: (taskId: string, sprintId: string) => void;
  moveTaskToSprint: (taskId: string, sprintId: string, task: Task) => void;

  updateAssigneeInTasks: (
    userId: string,
    updates: { name?: string; avatar?: string },
  ) => void;

  addSubtask: (sprintId: string, taskId: string, subtask: Subtask) => void;
  updateSubtask: (
    sprintId: string,
    taskId: string,
    subtaskId: string,
    updates: Partial<Subtask>,
  ) => void;
  removeSubtask: (sprintId: string, taskId: string, subtaskId: string) => void;

  setBacklogTasks: (tasks: Task[]) => void;
  addBacklogTask: (task: Task) => void;
  updateBacklogTask: (taskId: string, updates: Partial<Task>) => void;
  removeBacklogTask: (taskId: string) => void;
  addBacklogSubtask: (taskId: string, subtask: Subtask) => void;
  updateBacklogSubtask: (
    taskId: string,
    subtaskId: string,
    updates: Partial<Subtask>,
  ) => void;
  removeBacklogSubtask: (taskId: string, subtaskId: string) => void;

  toggleTaskExpanded: (taskId: string, sprintId?: string) => void;
  setLoading: (loading: boolean) => void;
  setBacklogLoading: (loading: boolean) => void;
  clearTasks: () => void;

  syncTaskFromSubtasks: (taskId: string, sprintId?: string) => void;
}

const deriveTaskStatus = (subtasks: Subtask[]): TaskStatus => {
  if (!subtasks.length) return "Todo";
  if (subtasks.every((s) => s.status === "Done")) return "Done";
  if (subtasks.some((s) => s.status === "In Progress")) return "In Progress";
  if (subtasks.some((s) => s.status === "Done")) return "In Progress";
  return "Todo";
};

const deriveTaskEstimate = (subtasks: Subtask[]): number =>
  subtasks.reduce((sum, s) => sum + (s.estimate ?? 0), 0);

const deriveTrackedTime = (subtasks: Subtask[]): number =>
  subtasks.reduce((sum, s) => sum + (s.trackedTime ?? 0), 0);

const deriveTaskAssignees = (subtasks: Subtask[]): TaskUser[] => {
  const assigneeMap = new Map<string, TaskUser>();

  for (const subtask of subtasks) {
    const assignee = subtask.assignee;
    if (assignee && typeof assignee === "object" && assignee._id) {
      assigneeMap.set(assignee._id, assignee);
    }
  }

  return Array.from(assigneeMap.values());
};

const syncTaskFields = (task: Task) => {
  task.status = deriveTaskStatus(task.subtasks);
  task.estimate = deriveTaskEstimate(task.subtasks);
  task.trackedTime = deriveTrackedTime(task.subtasks);

  const derivedAssignees = deriveTaskAssignees(task.subtasks);

  if (
    task.subtasks.some(
      (s) => s.assignee && typeof s.assignee === "object" && s.assignee._id,
    )
  ) {
    task.assignees = derivedAssignees;
  }
};

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      immer((set, get) => {
        const normalizeTask = (task: Task): Task => ({
          ...task,
          subtasks: task.subtasks ?? [],
          assignees: task.assignees ?? [],
          isExpanded: get().expandedTaskIds[task._id] ?? false,
        });

        return {
          tasksBySprintId: {},
          backlogTasks: [],
          expandedTaskIds: {},

          isLoading: false,
          isBacklogLoading: false,

          setSprintTasks: (sprintId, tasks) =>
            set((state) => {
              state.tasksBySprintId[sprintId] = tasks.map(normalizeTask);
            }),

          addTask: (sprintId, task) =>
            set((state) => {
              if (!state.tasksBySprintId[sprintId]) {
                state.tasksBySprintId[sprintId] = [];
              }

              const exists = state.tasksBySprintId[sprintId].some(
                (t) => t._id === task._id,
              );

              if (exists) return;

              state.tasksBySprintId[sprintId].push(normalizeTask(task));
            }),

          updateTask: (taskId, updates) =>
            set((state) => {
              for (const sprintId in state.tasksBySprintId) {
                const task = state.tasksBySprintId[sprintId].find(
                  (t) => t._id === taskId,
                );
                if (task) {
                  Object.assign(task, updates);
                  return;
                }
              }
            }),

          updateAssigneeInTasks: (userId, updates) =>
            set((state) => {
              const syncTask = (task: Task) => {
                // Update task assignees array
                task.assignees?.forEach((a) => {
                  if (a._id === userId) Object.assign(a, updates);
                });

                // Update task creator
                if (task.creator?._id === userId) {
                  Object.assign(task.creator, updates);
                }

                // Update subtask assignees and creators
                task.subtasks?.forEach((subtask) => {
                  if (
                    subtask.assignee &&
                    typeof subtask.assignee === "object" &&
                    subtask.assignee._id === userId
                  ) {
                    Object.assign(subtask.assignee, updates);
                  }

                  // Update subtask creator
                  if (subtask.creator?._id === userId) {
                    Object.assign(subtask.creator, updates);
                  }
                });
              };

              // Sync sprint tasks
              for (const sprintId in state.tasksBySprintId) {
                state.tasksBySprintId[sprintId].forEach(syncTask);
              }

              // Sync backlog tasks
              state.backlogTasks.forEach(syncTask);
            }),

          removeTask: (taskId, sprintId) =>
            set((state) => {
              state.tasksBySprintId[sprintId] =
                state.tasksBySprintId[sprintId]?.filter(
                  (t) => t._id !== taskId,
                ) ?? [];
              delete state.expandedTaskIds[taskId];
            }),

          moveTaskToBacklog: (taskId, sprintId) =>
            set((state) => {
              const tasks = state.tasksBySprintId[sprintId];
              if (!tasks) return;

              const index = tasks.findIndex((t) => t._id === taskId);
              if (index === -1) return;

              const task = tasks[index];
              tasks.splice(index, 1);

              const exists = state.backlogTasks.some((t) => t._id === task._id);

              if (exists) return;

              state.backlogTasks.push({
                ...task,
                sprintId: null,
                isInBacklog: true,
                isExpanded: state.expandedTaskIds[task._id] ?? false,
              });
            }),

          moveTaskToSprint: (taskId, sprintId, task) =>
            set((state) => {
              state.backlogTasks = state.backlogTasks.filter(
                (t) => t._id !== taskId,
              );

              if (!state.tasksBySprintId[sprintId]) {
                state.tasksBySprintId[sprintId] = [];
              }

              const exists = state.tasksBySprintId[sprintId].some(
                (t) => t._id === task._id,
              );

              if (exists) return;

              state.tasksBySprintId[sprintId].push({
                ...normalizeTask(task),
                sprintId,
                isInBacklog: false,
              });
            }),

          addSubtask: (sprintId, taskId, subtask) =>
            set((state) => {
              const task = state.tasksBySprintId[sprintId]?.find(
                (t) => t._id === taskId,
              );
              if (!task) return;

              const exists = task.subtasks?.some((s) => s._id === subtask._id);
              if (exists) return;

              task.subtasks.push(subtask);
              syncTaskFields(task);
            }),

          updateSubtask: (sprintId, taskId, subtaskId, updates) =>
            set((state) => {
              const task = state.tasksBySprintId[sprintId]?.find(
                (t) => t._id === taskId,
              );
              if (!task) return;

              const subtask = task.subtasks.find((s) => s._id === subtaskId);
              if (!subtask) return;

              Object.assign(subtask, updates);
              syncTaskFields(task);
            }),

          removeSubtask: (sprintId, taskId, subtaskId) =>
            set((state) => {
              const task = state.tasksBySprintId[sprintId]?.find(
                (t) => t._id === taskId,
              );
              if (!task) return;

              task.subtasks = task.subtasks.filter((s) => s._id !== subtaskId);
              syncTaskFields(task);
            }),

          setBacklogTasks: (tasks) =>
            set((state) => {
              state.backlogTasks = tasks.map(normalizeTask);
            }),

          addBacklogTask: (task) =>
            set((state) => {
              const exists = state.backlogTasks.some((t) => t._id === task._id);

              if (exists) return;

              state.backlogTasks.push(normalizeTask(task));
            }),

          updateBacklogTask: (taskId, updates) =>
            set((state) => {
              const task = state.backlogTasks.find((t) => t._id === taskId);
              if (task) Object.assign(task, updates);
            }),

          removeBacklogTask: (taskId) =>
            set((state) => {
              state.backlogTasks = state.backlogTasks.filter(
                (t) => t._id !== taskId,
              );
              delete state.expandedTaskIds[taskId];
            }),

          addBacklogSubtask: (taskId, subtask) =>
            set((state) => {
              const task = state.backlogTasks.find((t) => t._id === taskId);
              if (!task) return;

              const exists = task.subtasks?.some((s) => s._id === subtask._id);
              if (exists) return;

              task.subtasks.push(subtask);
              syncTaskFields(task);
            }),

          updateBacklogSubtask: (taskId, subtaskId, updates) =>
            set((state) => {
              const task = state.backlogTasks.find((t) => t._id === taskId);
              if (!task) return;

              const subtask = task.subtasks.find((s) => s._id === subtaskId);
              if (!subtask) return;

              Object.assign(subtask, updates);
              syncTaskFields(task);
            }),

          removeBacklogSubtask: (taskId, subtaskId) =>
            set((state) => {
              const task = state.backlogTasks.find((t) => t._id === taskId);
              if (!task) return;

              task.subtasks = task.subtasks.filter((s) => s._id !== subtaskId);
              syncTaskFields(task);
            }),

          toggleTaskExpanded: (taskId, sprintId) =>
            set((state) => {
              const task = sprintId
                ? state.tasksBySprintId[sprintId]?.find((t) => t._id === taskId)
                : state.backlogTasks.find((t) => t._id === taskId);

              if (!task) return;

              task.isExpanded = !task.isExpanded;
              state.expandedTaskIds[taskId] = task.isExpanded;
            }),

          setLoading: (loading) =>
            set((state) => {
              state.isLoading = loading;
            }),

          setBacklogLoading: (loading) =>
            set((state) => {
              state.isBacklogLoading = loading;
            }),

          clearTasks: () =>
            set((state) => {
              state.tasksBySprintId = {};
              state.backlogTasks = [];
            }),

          syncTaskFromSubtasks: (taskId, sprintId) =>
            set((state) => {
              const task = sprintId
                ? state.tasksBySprintId[sprintId]?.find((t) => t._id === taskId)
                : state.backlogTasks.find((t) => t._id === taskId);

              if (task) syncTaskFields(task);
            }),
        };
      }),
      {
        name: "task-ui-store",
        partialize: (state) => ({
          expandedTaskIds: state.expandedTaskIds,
        }),
      },
    ),
    { name: "TaskStore" },
  ),
);
