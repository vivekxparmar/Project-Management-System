import React, { useState, useRef, useEffect } from "react";
import { useTaskStore, useProjectStore, useSprintStore } from "@/stores";
import { taskService, subtaskService } from "@/services";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Plus,
  Check,
  Clock,
  GripVertical,
  Search,
  XCircle,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Pencil,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  getPriorityColor,
  getTaskStatusColor,
  getInitials,
  canEditTask,
  canDeleteTask,
  canCreateTask,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTimer } from "@/hooks";
import type { Task, Subtask } from "@/types";

interface BacklogTableProps {
  tasks: Task[];
  projectId: string;
  myRole: string;
}

interface FilterState {
  priority: string[];
  status: string[];
  assignee: string[];
}

// Live timer display
function LiveTimer({
  activeTimerStart,
  trackedTime,
}: {
  activeTimerStart: string | null;
  trackedTime: number;
}) {
  const { formatted, isRunning } = useTimer({ activeTimerStart, trackedTime });
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        isRunning ? "text-primary font-medium" : "font-semibold",
      )}
    >
      {formatted}
    </span>
  );
}

// Estimate cell with increment control
function EstimateCell({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (val: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const [isDirty, setIsDirty] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocal(value);
    setIsDirty(false);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setLocal(value);
        setIsDirty(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleChange = (val: number) => {
    const clamped = Math.max(0, val);
    setLocal(clamped);
    setIsDirty(clamped !== value);
  };

  const handleSubmit = () => {
    if (isDirty) {
      onChange(local);
    }
    setOpen(false);
    setIsDirty(false);
  };

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className="text-xs tabular-nums rounded-md px-0 py-1 hover:bg-muted disabled:opacity-50 flex gap-1 items-center text-primary font-semibold"
      >
        <Clock size={12} />
        {value}h
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 flex items-center gap-1 rounded-xl border bg-background p-2 shadow-lg">
          <button
            onClick={() => handleChange(local - 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-muted-foreground hover:bg-muted"
          >
            −
          </button>
          <span className="w-10 text-center text-xs tabular-nums">
            {local}h
          </span>
          <button
            onClick={() => handleChange(local + 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-muted-foreground hover:bg-muted"
          >
            +
          </button>
          <button
            onClick={handleSubmit}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white"
          >
            <Check className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// Assignee Avatar Group Component
function AssigneeAvatarGroup({
  assignees,
  size = "h-6 w-6",
  maxDisplay = 3,
}: {
  assignees:
    | Array<{ _id: string; name: string; avatar?: string }>
    | undefined
    | null;
  size?: string;
  maxDisplay?: number;
}) {
  const safeAssignees = assignees && Array.isArray(assignees) ? assignees : [];

  if (safeAssignees.length === 0) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const displayAssignees = safeAssignees.slice(0, maxDisplay);
  const remainingCount = safeAssignees.length - maxDisplay;

  const getInitialsInline = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  };

  return (
    <div className="flex items-center -space-x-1">
      {displayAssignees.map((assignee, index) => {
        if (!assignee || !assignee._id) return null;

        return (
          <TooltipProvider key={assignee._id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar
                  className={cn(
                    size,
                    "cursor-help ring-1 ring-background",
                    index === 0 && "relative z-10",
                    index === 1 && "relative z-0",
                  )}
                >
                  <AvatarImage src={assignee.avatar || undefined} />
                  <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                    {getInitialsInline(assignee.name || "")}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="bg-primary font-medium text-primary-foreground">
                <p className="text-xs">{assignee.name || "Unknown User"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  size,
                  "rounded-full bg-muted flex items-center justify-center ring-1 ring-background cursor-help",
                )}
              >
                <span className="text-[10px] font-medium">
                  +{remainingCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {safeAssignees
                  .slice(maxDisplay)
                  .map((a) => a?.name || "Unknown")
                  .join(", ")}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default function BacklogTable({
  tasks,
  projectId,
  myRole,
}: BacklogTableProps) {
  const {
    addBacklogTask,
    updateBacklogTask,
    removeBacklogTask,
    addBacklogSubtask,
    updateBacklogSubtask,
    removeBacklogSubtask,
    toggleTaskExpanded,
  } = useTaskStore();

  const currentProject = useProjectStore((s) => s.currentProject);
  const sprints = useSprintStore((s) => s.sprints);

  const projectMembers =
    currentProject?.members?.map((member) => ({
      _id: member.user._id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatar,
      role: member.role,
    })) ?? [];

  const canEdit = canEditTask(myRole);
  const canDelete = canDeleteTask(myRole);
  const canCreate = canCreateTask(myRole);

  // Add task inline
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const newTaskRef = useRef<HTMLInputElement>(null);

  // Add subtask inline
  const [addingSubtask, setAddingSubtask] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const newSubtaskRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "task" | "subtask";
    id: string;
    taskId?: string;
    name: string;
  } | null>(null);

  // Move to sprint dialog states
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [currentMoveTask, setCurrentMoveTask] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Inline editing state
  const [editing, setEditing] = useState<{
    type: "task-title" | "subtask-title";
    id: string;
    value: string;
    parentId?: string;
  } | null>(null);

  // Sorting, Filtering, and Search states
  const [sortConfig, setSortConfig] = useState<{
    key: "priority" | "estimate";
    direction: "asc" | "desc";
  } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    priority: [],
    status: [],
    assignee: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSubmitting = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const priorityOrder: { [key: string]: number } = {
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
    P5: 5,
  };

  const getInitialsInline = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  };

  // Handle move to sprint
  const handleMoveToSprint = async () => {
    if (!currentMoveTask || !selectedSprintId) return;

    try {
      await taskService.moveToSprint(
        currentMoveTask.id,
        selectedSprintId,
        projectId,
      );
      removeBacklogTask(currentMoveTask.id);
      toast.success(`Task moved to sprint successfully`);
      setMoveDialogOpen(false);
      setSelectedSprintId("");
      setCurrentMoveTask(null);
    } catch (error) {
      toast.error("Failed to move task to sprint");
    }
  };

  // Filter, search, and sort tasks
  const getFilteredAndSortedTasks = () => {
    let filteredTasks = [...tasks];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredTasks = filteredTasks.filter((task) =>
        task.title.toLowerCase().includes(query),
      );
    }

    if (filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        filters.priority.includes(task.priority),
      );
    }

    if (filters.status.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        filters.status.includes(task.status),
      );
    }

    if (filters.assignee.length > 0) {
      filteredTasks = filteredTasks.filter((task) => {
        if (!task.assignees || task.assignees.length === 0) return false;
        return task.assignees.some((assignee) =>
          filters.assignee.includes(assignee._id),
        );
      });
    }

    if (sortConfig) {
      filteredTasks.sort((a, b) => {
        if (sortConfig.key === "priority") {
          const orderA = priorityOrder[a.priority];
          const orderB = priorityOrder[b.priority];
          return sortConfig.direction === "asc"
            ? orderA - orderB
            : orderB - orderA;
        } else if (sortConfig.key === "estimate") {
          return sortConfig.direction === "asc"
            ? (a.estimate || 0) - (b.estimate || 0)
            : (b.estimate || 0) - (a.estimate || 0);
        }
        return 0;
      });
    }

    return filteredTasks;
  };

  const filteredAndSortedTasks = getFilteredAndSortedTasks();

  const handleSort = (key: "priority" | "estimate") => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const resetSorting = () => setSortConfig(null);

  const handleFilterChange = (
    type: keyof FilterState,
    value: string,
    checked: boolean,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [type]: checked
        ? [...prev[type], value]
        : prev[type].filter((v) => v !== value),
    }));
  };

  const clearFilters = () => {
    setFilters({
      priority: [],
      status: [],
      assignee: [],
    });
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  };

  const resetAll = () => {
    clearFilters();
    clearSearch();
    resetSorting();
  };

  const hasActiveFilters = () => {
    return (
      filters.priority.length > 0 ||
      filters.status.length > 0 ||
      filters.assignee.length > 0
    );
  };

  const getActiveFiltersCount = () => {
    return (
      filters.priority.length + filters.status.length + filters.assignee.length
    );
  };

  const hasActiveSorting = () => sortConfig !== null;
  const hasActiveSearch = () => searchQuery.trim().length > 0;
  const hasActiveModifications = () =>
    hasActiveFilters() || hasActiveSorting() || hasActiveSearch();

  // ADD TASK
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || isSubmitting.current) return;
    isSubmitting.current = true;
    const title = newTaskTitle.trim();
    setNewTaskTitle("");
    setAddingTask(false);
    try {
      const res = await taskService.createBacklog({
        title,
        projectId,
        isInBacklog: true,
      });
      addBacklogTask({ ...res.data.data, subtasks: [], assignees: [] });
      toast.success("Task added to backlog.");
    } catch {
      toast.error("Failed to add task.");
    } finally {
      isSubmitting.current = false;
    }
  };

  // ADD SUBTASK
  const handleAddSubtask = async (taskId: string) => {
    if (!newSubtaskTitle.trim() || isSubmitting.current) return;
    isSubmitting.current = true;
    const title = newSubtaskTitle.trim();
    setNewSubtaskTitle("");
    setAddingSubtask(null);
    try {
      const res = await subtaskService.create({ title, taskId, projectId });
      addBacklogSubtask(taskId, res.data.data);
      toast.success("Subtask created.");
    } catch {
      toast.error("Failed to add subtask.");
    } finally {
      isSubmitting.current = false;
    }
  };

  // UPDATE TASK
  const handleUpdateTask = async (
    taskId: string,
    updates: Record<string, any>,
  ) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    updateBacklogTask(taskId, updates);
    try {
      await taskService.update(taskId, {
        ...updates,
        projectId,
      });
    } catch {
      updateBacklogTask(taskId, task);
      toast.error("Failed to update task.");
    }
  };

  // UPDATE SUBTASK
  const handleUpdateSubtask = async (
    taskId: string,
    subtaskId: string,
    updates: Record<string, any>,
  ) => {
    const task = tasks.find((t) => t._id === taskId);
    const subtask = task?.subtasks.find((s) => s._id === subtaskId);
    if (!subtask) return;

    const oldSubtaskState = { ...subtask };
    const oldTaskState = { ...task };

    updateBacklogSubtask(taskId, subtaskId, updates);
    try {
      const response = await subtaskService.update(subtaskId, {
        ...updates,
        projectId,
      });

      if (response.data.data) {
        updateBacklogSubtask(taskId, subtaskId, response.data.data);
      }

      if (response.data.taskUpdate) {
        updateBacklogTask(taskId, {
          status: response.data.taskUpdate.status,
          estimate: response.data.taskUpdate.estimate,
          trackedTime: response.data.taskUpdate.trackedTime,
          assignees: response.data.taskUpdate.assignees,
        });
      }

      toast.success("Subtask updated successfully");
    } catch {
      updateBacklogSubtask(taskId, subtaskId, oldSubtaskState);
      updateBacklogTask(taskId, oldTaskState);
      toast.error("Failed to update subtask.");
    }
  };

  // DELETE TASK
  const handleDeleteTask = async (taskId: string) => {
    removeBacklogTask(taskId);
    try {
      await taskService.delete(taskId, projectId);
      toast.success("Task deleted.");
    } catch {
      toast.error("Failed to delete task.");
    }
    setDeleteTarget(null);
  };

  // DELETE SUBTASK
  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    removeBacklogSubtask(taskId, subtaskId);
    try {
      await subtaskService.delete(subtaskId, projectId);
      toast.success("Subtask deleted.");
    } catch {
      toast.error("Failed to delete subtask.");
    }
    setDeleteTarget(null);
  };

  const cancelCreate = () => {
    setAddingTask(false);
    setAddingSubtask(null);
    setNewTaskTitle("");
    setNewSubtaskTitle("");
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-full flex flex-col min-h-0 px-4">
        {/* Header with search, filters, and sorting */}
        <div className="flex-none space-y-4 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search backlog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64 h-8 text-sm rounded-lg font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Sort Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant={
                    sortConfig?.key === "priority" ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={() => handleSort("priority")}
                  className="gap-2 h-8 text-xs rounded-lg"
                >
                  Priority
                  <ArrowUpDown className="h-3 w-3" />
                  {sortConfig?.key === "priority" && (
                    <span className="text-xs ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </Button>
                <Button
                  variant={
                    sortConfig?.key === "estimate" ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={() => handleSort("estimate")}
                  className="gap-2 h-8 text-xs rounded-lg"
                >
                  Estimate
                  <ArrowUpDown className="h-3 w-3" />
                  {sortConfig?.key === "estimate" && (
                    <span className="text-xs ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </Button>
                {hasActiveSorting() && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetSorting}
                        className="gap-1 h-8 w-8 p-0 rounded-lg"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-primary text-primary-foreground font-medium">
                      Reset sorting
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Filter Popover */}
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 relative h-8 text-xs rounded-lg"
                  >
                    <Filter className="h-3 w-3" />
                    Filters
                    {hasActiveFilters() && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
                      >
                        {getActiveFiltersCount()}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[500px] p-4 rounded-2xl"
                  align="start"
                >
                  <div className="space-y-4">
                    <div className="flex flex-row justify-between items-center">
                      <h4 className="font-medium text-sm">Filter Tasks</h4>
                      {hasActiveFilters() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-7 gap-1 text-xs rounded-lg"
                        >
                          <XCircle className="h-3 w-3" />
                          Clear all
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-between gap-6">
                      {/* Priority Filters */}
                      <div>
                        <label className="text-xs font-medium mb-2 block">
                          Priority
                        </label>
                        <div className="space-y-2">
                          {PRIORITY_OPTIONS.map((priority) => (
                            <label
                              key={priority.value}
                              className="flex items-center gap-2 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filters.priority.includes(
                                  priority.value,
                                )}
                                onChange={(e) =>
                                  handleFilterChange(
                                    "priority",
                                    priority.value,
                                    e.target.checked,
                                  )
                                }
                                className="rounded border-gray-300"
                              />
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-2 py-0",
                                  getPriorityColor(priority.value),
                                )}
                              >
                                {priority.label}
                              </Badge>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Status Filters */}
                      <div>
                        <label className="text-xs font-medium mb-2 block">
                          Status
                        </label>
                        <div className="space-y-2">
                          {TASK_STATUS_OPTIONS.map((status) => (
                            <label
                              key={status.value}
                              className="flex items-center gap-2 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filters.status.includes(status.value)}
                                onChange={(e) =>
                                  handleFilterChange(
                                    "status",
                                    status.value,
                                    e.target.checked,
                                  )
                                }
                                className="rounded border-gray-300"
                              />
                              <Badge
                                className={cn(
                                  "text-[10px] px-2 py-0",
                                  getTaskStatusColor(status.value),
                                )}
                              >
                                {status.label}
                              </Badge>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Assignee Filters */}
                      <div>
                        <label className="text-xs font-medium mb-2 block">
                          Assignee
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {projectMembers.map((member) => (
                            <label
                              key={member._id}
                              className="flex items-center gap-2 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filters.assignee.includes(member._id)}
                                onChange={(e) =>
                                  handleFilterChange(
                                    "assignee",
                                    member._id,
                                    e.target.checked,
                                  )
                                }
                                className="rounded border-gray-300"
                              />
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.avatar || undefined} />
                                <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                                  {getInitialsInline(member.name || "")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[100px]">
                                {member.name}
                              </span>
                            </label>
                          ))}
                          {projectMembers.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No team members available
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Reset All Button */}
              {hasActiveModifications() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAll}
                  className="gap-2 h-8 text-xs rounded-lg"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset All
                </Button>
              )}
            </div>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters() && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Active filters:
              </span>
              {filters.priority.map((p) => {
                const priority = PRIORITY_OPTIONS.find(
                  (opt) => opt.value === p,
                );
                return (
                  <Badge
                    key={p}
                    variant="secondary"
                    className="gap-1 cursor-pointer text-[10px] px-2 py-0"
                    onClick={() => handleFilterChange("priority", p, false)}
                  >
                    {priority?.label}
                    <XCircle className="h-2.5 w-2.5" />
                  </Badge>
                );
              })}
              {filters.status.map((s) => {
                const status = TASK_STATUS_OPTIONS.find(
                  (opt) => opt.value === s,
                );
                return (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="gap-1 cursor-pointer text-[10px] px-2 py-0"
                    onClick={() => handleFilterChange("status", s, false)}
                  >
                    {status?.label}
                    <XCircle className="h-2.5 w-2.5" />
                  </Badge>
                );
              })}
              {filters.assignee.map((a) => {
                const member = projectMembers.find((m) => m._id === a);
                return (
                  <Badge
                    key={a}
                    variant="secondary"
                    className="gap-1 cursor-pointer text-[10px] px-2 py-0"
                    onClick={() => handleFilterChange("assignee", a, false)}
                  >
                    {member?.name || "Unknown"}
                    <XCircle className="h-2.5 w-2.5" />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Search Results Count */}
          {hasActiveSearch() && (
            <div className="text-xs text-muted-foreground font-semibold">
              Found {filteredAndSortedTasks.length} task(s) matching "
              {searchQuery}"
            </div>
          )}
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 min-h-0 overflow-auto custom-scroll">
          <Table className="w-full">
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border">
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 min-w-[300px]">
                  Title
                </TableHead>
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 min-w-[122px]">
                  Status
                </TableHead>
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 min-w-[100px]">
                  Priority
                </TableHead>
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 min-w-[85px]">
                  Estimate
                </TableHead>
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 min-w-[85px]">
                  Tracked
                </TableHead>
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 min-w-[90px]">
                  Creator
                </TableHead>
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 min-w-[90px]">
                  Assignees
                </TableHead>
                <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 max-w-[50px]">
                  Action
                </TableHead>
                {/* <TableHead className="px-3 py-3 w-[70px]" /> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTasks.length === 0 && !addingTask ? (
                <TableRow>
                  <td colSpan={8} className="py-12 text-center">
                    <p className="text-xs text-muted-foreground font-semibold">
                      {hasActiveSearch()
                        ? `No tasks found matching "${searchQuery}"`
                        : hasActiveFilters()
                          ? "No tasks match the selected filters."
                          : "No tasks in the backlog."}
                    </p>
                  </td>
                </TableRow>
              ) : (
                filteredAndSortedTasks.map((task) => (
                  <React.Fragment key={task._id}>
                    {/* TASK ROW */}
                    <TableRow className="group border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {/* Title */}
                      <TableCell className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTaskExpanded(task._id)}
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            {task.isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {editing?.type === "task-title" &&
                          editing.id === task._id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                autoFocus
                                value={editing.value}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    value: e.target.value,
                                  })
                                }
                                onBlur={() => {
                                  if (
                                    editing.value.trim() &&
                                    editing.value !== task.title
                                  ) {
                                    handleUpdateTask(task._id, {
                                      title: editing.value.trim(),
                                    });
                                  }
                                  setEditing(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                className="h-7 text-sm rounded-lg px-2 py-0 w-64"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-medium truncate",
                                  canEdit &&
                                    "cursor-pointer hover:text-primary transition-colors",
                                )}
                                onDoubleClick={() =>
                                  canEdit &&
                                  setEditing({
                                    type: "task-title",
                                    id: task._id,
                                    value: task.title,
                                  })
                                }
                              >
                                {task.title}
                              </span>
                              {canEdit && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-lg"
                                  onClick={() =>
                                    setEditing({
                                      type: "task-title",
                                      id: task._id,
                                      value: task.title,
                                    })
                                  }
                                >
                                  <Pencil size={12} />
                                </Button>
                              )}
                              {task.subtasks.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 h-4 rounded-md shrink-0 font-semibold"
                                >
                                  {
                                    task.subtasks.filter(
                                      (s) => s.status === "Done",
                                    ).length
                                  }
                                  /{task.subtasks.length}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-3 py-2.5">
                        <Badge
                          className={cn(
                            "text-[10px] px-2 py-0 rounded-md",
                            getTaskStatusColor(task.status),
                          )}
                        >
                          {
                            TASK_STATUS_OPTIONS.find(
                              (s) => s.value === task.status,
                            )?.label
                          }
                        </Badge>
                      </TableCell>

                      {/* Priority */}
                      <TableCell className="px-3 py-2.5">
                        {canEdit ? (
                          <Select
                            value={task.priority}
                            onValueChange={(val: any) =>
                              handleUpdateTask(task._id, { priority: val })
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-6 min-w-[60px] w-fit gap-1.5 rounded-lg border px-2 text-[11px] font-medium",
                                getPriorityColor(task.priority),
                              )}
                            >
                              <SelectValue>{task.priority}</SelectValue>
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              side="bottom"
                              align="start"
                              className="rounded-xl"
                            >
                              {PRIORITY_OPTIONS.map((p) => (
                                <SelectItem
                                  key={p.value}
                                  value={p.value}
                                  className="rounded-lg"
                                >
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[11px] px-2 py-0 pointer-events-none rounded-full",
                                      getPriorityColor(p.value),
                                    )}
                                  >
                                    {p.label}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0 rounded-full",
                              getPriorityColor(task.priority),
                            )}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Estimate */}
                      <TableCell className="px-3 py-2.5">
                        <span className="text-xs text-foreground tabular-nums flex gap-1 items-center font-semibold">
                          <Clock size={12} />
                          {task.estimate}h
                        </span>
                      </TableCell>

                      {/* Tracked */}
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center text-foreground font-semibold gap-1">
                          <Clock className="h-3 w-3 text-foreground" />
                          <LiveTimer
                            activeTimerStart={null}
                            trackedTime={task.trackedTime}
                          />
                        </div>
                      </TableCell>

                      {/* Creator */}
                      <TableCell className="px-3 py-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-6 w-6 cursor-help">
                              <AvatarImage src={task.creator?.avatar} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(task.creator?.name ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent className="bg-primary text-primary-foreground font-medium">
                            <p>{task.creator?.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Assignees */}
                      <TableCell className="px-3 py-2.5">
                        <AssigneeAvatarGroup
                          assignees={task.assignees || []}
                          size="h-6 w-6"
                          maxDisplay={3}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-0.5">
                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-lg bg-transparent"
                                  onClick={() => {
                                    setCurrentMoveTask({
                                      id: task._id,
                                      title: task.title,
                                    });
                                    setMoveDialogOpen(true);
                                  }}
                                >
                                  <ArrowLeftRight className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-primary text-primary-foreground font-medium">
                                Move to sprint
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-lg bg-transparent hover:text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "task",
                                      id: task._id,
                                      name: task.title,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-primary text-primary-foreground font-medium">
                                Delete task
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* SUBTASK ROWS */}
                    {task.isExpanded &&
                      task.subtasks.map((subtask) => (
                        <TableRow
                          key={subtask._id}
                          className="group border-b border-border/30 bg-muted/10 hover:bg-muted/30 transition-colors"
                        >
                          {/* Title */}
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center gap-2 pl-8">
                              <GripVertical className="h-3 w-3 text-muted-foreground" />

                              {editing?.type === "subtask-title" &&
                              editing.id === subtask._id ? (
                                <Input
                                  autoFocus
                                  value={editing.value}
                                  onChange={(e) =>
                                    setEditing({
                                      ...editing,
                                      value: e.target.value,
                                    })
                                  }
                                  onBlur={() => {
                                    if (
                                      editing.value.trim() &&
                                      editing.value !== subtask.title
                                    ) {
                                      handleUpdateSubtask(
                                        task._id,
                                        subtask._id,
                                        { title: editing.value.trim() },
                                      );
                                    }
                                    setEditing(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      e.currentTarget.blur();
                                    if (e.key === "Escape") setEditing(null);
                                  }}
                                  className="h-6 text-xs rounded-lg px-2 py-0 w-50"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-xs truncate font-medium",
                                      subtask.status === "Done" &&
                                        "line-through text-muted-foreground",
                                      canEdit &&
                                        "cursor-pointer hover:text-primary transition-colors",
                                    )}
                                    onDoubleClick={() =>
                                      canEdit &&
                                      setEditing({
                                        type: "subtask-title",
                                        id: subtask._id,
                                        value: subtask.title,
                                      })
                                    }
                                  >
                                    {subtask.title}
                                  </span>
                                  {canEdit && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-lg"
                                      onClick={() =>
                                        setEditing({
                                          type: "subtask-title",
                                          id: subtask._id,
                                          value: subtask.title,
                                        })
                                      }
                                    >
                                      <Pencil size={10} />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-0 py-1.5">
                            {canEdit ? (
                              <Select
                                value={subtask.status}
                                onValueChange={(val: any) =>
                                  handleUpdateSubtask(task._id, subtask._id, {
                                    status: val,
                                  })
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-5 min-w-[84px] w-fit gap-1.5 rounded-lg !bg-transparent border-0 text-[9px]",
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  side="bottom"
                                  align="start"
                                  className="rounded-xl"
                                >
                                  {TASK_STATUS_OPTIONS.map((s) => (
                                    <SelectItem
                                      key={s.value}
                                      value={s.value}
                                      className="rounded-lg"
                                    >
                                      <Badge
                                        className={cn(
                                          "text-[9px] px-2 py-0 pointer-events-none rounded-full",
                                          getTaskStatusColor(s.value),
                                        )}
                                      >
                                        {s.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                className={cn(
                                  "text-[9px] ml-3 px-2 py-0 rounded-full",
                                  getTaskStatusColor(subtask.status),
                                )}
                              >
                                {
                                  TASK_STATUS_OPTIONS.find(
                                    (s) => s.value === subtask.status,
                                  )?.label
                                }
                              </Badge>
                            )}
                          </TableCell>

                          {/* Priority */}
                          <TableCell className="px-3 py-1.5">
                            {canEdit ? (
                              <Select
                                value={subtask.priority}
                                onValueChange={(val: any) =>
                                  handleUpdateSubtask(task._id, subtask._id, {
                                    priority: val,
                                  })
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-5 min-w-[60px] w-fit gap-1.5 rounded-lg border text-[11px] font-medium",
                                    getPriorityColor(subtask.priority),
                                  )}
                                >
                                  <SelectValue>{subtask.priority}</SelectValue>
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  side="bottom"
                                  align="start"
                                  className="rounded-xl"
                                >
                                  {PRIORITY_OPTIONS.map((p) => (
                                    <SelectItem
                                      key={p.value}
                                      value={p.value}
                                      className="rounded-lg"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[11px] font-medium px-2 py-0 pointer-events-none rounded-full",
                                          getPriorityColor(p.value),
                                        )}
                                      >
                                        {p.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-2 py-0 rounded-full",
                                  getPriorityColor(subtask.priority),
                                )}
                              >
                                {subtask.priority}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Estimate */}
                          <TableCell className="px-3 py-1.5">
                            <EstimateCell
                              value={subtask.estimate}
                              disabled={!canEdit}
                              onChange={(val) =>
                                handleUpdateSubtask(task._id, subtask._id, {
                                  estimate: val,
                                })
                              }
                            />
                          </TableCell>

                          {/* Tracked */}
                          <TableCell className="px-3 py-1.5">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <LiveTimer
                                activeTimerStart={subtask.activeTimerStart}
                                trackedTime={subtask.trackedTime}
                              />
                            </div>
                          </TableCell>

                          {/* Creator */}
                          <TableCell className="px-3 py-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 cursor-help">
                                  <AvatarImage src={subtask.creator?.avatar} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {getInitials(subtask.creator?.name ?? "?")}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent className="bg-primary text-primary-foreground font-medium">
                                <p>{subtask.creator?.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Subtask Assignee */}
                          <TableCell className="px-3 py-1.5">
                            {canEdit ? (
                              <Select
                                value={subtask.assignee?._id ?? "unassigned"}
                                onValueChange={(val) => {
                                  const resolved =
                                    val === "unassigned"
                                      ? null
                                      : (projectMembers.find(
                                          (m) => m._id === val,
                                        ) ?? null);
                                  handleUpdateSubtask(task._id, subtask._id, {
                                    assigneeId:
                                      val === "unassigned" ? null : val,
                                    assignee: resolved,
                                  });
                                }}
                              >
                                <SelectTrigger className="h-8 w-fit min-w-0 gap-2 border-0 px-0 pr-2 !bg-transparent shadow-none">
                                  <SelectValue>
                                    {subtask.assignee ? (
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage
                                            src={subtask.assignee.avatar}
                                          />
                                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                            {getInitialsInline(
                                              subtask.assignee.name,
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">
                                        Un
                                      </span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  side="bottom"
                                  align="start"
                                  className="rounded-xl"
                                >
                                  <SelectItem
                                    value="unassigned"
                                    className="text-sm rounded-lg"
                                  >
                                    <span className="text-foreground">
                                      Unassigned
                                    </span>
                                  </SelectItem>
                                  {projectMembers.map((member) => (
                                    <SelectItem
                                      key={member._id}
                                      value={member._id}
                                      className="text-sm rounded-lg"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage
                                            src={member.avatar || undefined}
                                          />
                                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                            {getInitialsInline(member.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span>
                                          {member.name} ({member.role})
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={subtask.assignee?.avatar} />
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {getInitialsInline(
                                    subtask.assignee?.name || "",
                                  )}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </TableCell>

                          {/* Delete subtask */}
                          <TableCell className="px-3 py-1.5">
                            {canDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 rounded-lg hover:text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      setDeleteTarget({
                                        type: "subtask",
                                        id: subtask._id,
                                        taskId: task._id,
                                        name: subtask.title,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-primary text-primary-foreground font-medium">
                                  Delete subtask
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* ADD SUBTASK ROW */}
                    {task.isExpanded && canCreate && (
                      <TableRow className="border-b border-border/30 bg-muted/5">
                        <td colSpan={8} className="px-4 py-4">
                          {addingSubtask === task._id ? (
                            <div className="flex items-center gap-2 pl-10">
                              <div className="w-3 h-px bg-border shrink-0" />
                              <Input
                                ref={newSubtaskRef}
                                autoFocus
                                value={newSubtaskTitle}
                                onChange={(e) =>
                                  setNewSubtaskTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleAddSubtask(task._id);
                                  if (e.key === "Escape") {
                                    setAddingSubtask(null);
                                    setNewSubtaskTitle("");
                                  }
                                }}
                                onBlur={() => {
                                  if (!newSubtaskTitle.trim()) {
                                    setAddingSubtask(null);
                                  }
                                }}
                                placeholder="Subtask title... (Enter to save)"
                                className="h-6 text-xs rounded-lg flex-1 max-w-md"
                              />
                              <Button
                                size="sm"
                                className="h-6 text-xs rounded-lg px-2"
                                onClick={() => handleAddSubtask(task._id)}
                              >
                                Add
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs rounded-lg px-2"
                                onClick={cancelCreate}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAddingSubtask(task._id);
                                if (!task.isExpanded) {
                                  toggleTaskExpanded(task._id);
                                }
                              }}
                              className="flex items-center gap-1.5 pl-10 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              Add subtask
                            </button>
                          )}
                        </td>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}

              {/* ADD TASK ROW */}
              {canCreate && (
                <TableRow>
                  <td colSpan={8} className="px-4 py-4">
                    {addingTask ? (
                      <div className="flex items-center gap-2">
                        <Input
                          ref={newTaskRef}
                          autoFocus
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddTask();
                            if (e.key === "Escape") cancelCreate();
                          }}
                          onBlur={() => {
                            if (!newTaskTitle.trim()) {
                              cancelCreate();
                            }
                          }}
                          placeholder="Task title... (Enter to save)"
                          className="h-8 text-sm rounded-xl flex-1 max-w-md"
                        />
                        <Button
                          size="sm"
                          className="h-8 rounded-xl text-xs"
                          onClick={handleAddTask}
                        >
                          Add Task
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-xl text-xs"
                          onClick={cancelCreate}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingTask(true)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold hover:text-primary transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Task
                      </button>
                    )}
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MOVE TO SPRINT DIALOG */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move task to sprint</DialogTitle>
            <DialogDescription>
              Select a sprint to move{" "}
              <span className="font-semibold text-foreground">
                "{currentMoveTask?.title}"
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Sprint</label>
              <Select
                value={selectedSprintId}
                onValueChange={setSelectedSprintId}
              >
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Choose a sprint..." />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  //   sideOffset={6}
                  className="w-[var(--radix-select-trigger-width)] rounded-xl z-50"
                >
                  {sprints.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No sprints available
                    </div>
                  ) : (
                    sprints.map((sprint) => (
                      <SelectItem
                        key={sprint._id}
                        value={sprint._id}
                        className="rounded-lg"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{sprint.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMoveDialogOpen(false);
                setSelectedSprintId("");
                setCurrentMoveTask(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMoveToSprint}
              disabled={!selectedSprintId}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Move to Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ?{" "}
              {deleteTarget?.type === "task" &&
                "All subtasks will also be deleted. "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "task") {
                  handleDeleteTask(deleteTarget.id);
                } else {
                  handleDeleteSubtask(deleteTarget.taskId!, deleteTarget.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
