import { useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  Search,
  XCircle,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Paperclip,
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
} from "@/components/ui/alert-dialog";
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
  BUG_STATUS_OPTIONS,
  getPriorityColor,
  getBugStatusColor,
  getInitials,
  canDeleteBug,
  canReportBug,
} from "@/lib/constants";
import { useBugStore, useProjectStore } from "@/stores";
import { bugService } from "@/services";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Bug, Priority } from "@/types";

interface BugTableProps {
  bugs: Bug[];
  projectId: string;
  myRole: string;
  onRowClick: (bugId: string) => void;
}

interface FilterState {
  priority: string[];
  status: string[];
  assignee: string[];
}

export default function BugTable({
  bugs,
  projectId,
  myRole,
  onRowClick,
}: BugTableProps) {
  const { updateBug, removeBug } = useBugStore();
  const members = useProjectStore((s) => s.currentProject?.members ?? []);

  const canDelete = canDeleteBug(myRole);
  const canEdit = canReportBug(myRole);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    priority: [],
    status: [],
    assignee: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: "priority" | "createdAt";
    direction: "asc" | "desc";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bug | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const priorityOrder: Record<string, number> = {
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
    P5: 5,
  };

  // Filter + sort
  const getFiltered = () => {
    let result = [...bugs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.bugNumber.toLowerCase().includes(q),
      );
    }
    if (filters.priority.length)
      result = result.filter((b) => filters.priority.includes(b.priority));
    if (filters.status.length)
      result = result.filter((b) => filters.status.includes(b.status));
    if (filters.assignee.length)
      result = result.filter(
        (b) => b.assignee && filters.assignee.includes(b.assignee._id),
      );

    if (sortConfig) {
      result.sort((a, b) => {
        if (sortConfig.key === "priority") {
          const d = priorityOrder[a.priority] - priorityOrder[b.priority];
          return sortConfig.direction === "asc" ? d : -d;
        }
        const d =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortConfig.direction === "asc" ? d : -d;
      });
    }

    return result;
  };

  const filtered = getFiltered();

  const handleSort = (key: "priority" | "createdAt") =>
    setSortConfig((c) =>
      c?.key === key
        ? { key, direction: c.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );

  const handleFilterChange = (
    type: keyof FilterState,
    value: string,
    checked: boolean,
  ) =>
    setFilters((prev) => ({
      ...prev,
      [type]: checked
        ? [...prev[type], value]
        : prev[type].filter((v) => v !== value),
    }));

  const clearAll = () => {
    setFilters({ priority: [], status: [], assignee: [] });
    setSearchQuery("");
    setSortConfig(null);
  };

  const hasActiveFilters =
    filters.priority.length + filters.status.length + filters.assignee.length >
    0;

  const activeFilterCount =
    filters.priority.length + filters.status.length + filters.assignee.length;

  // Inline status update
  const handleStatusChange = async (bug: Bug, status: string) => {
    const old = bug.status;
    updateBug(bug._id, { status: status as any });
    try {
      await bugService.updateStatus(bug._id, status, bug.projectId);
      toast.success("Bug status updated successfully!");
    } catch {
      updateBug(bug._id, { status: old });
      toast.error("Failed to update status.");
    }
  };

  // Inline assignee update
  const handleAssigneeChange = async (bug: Bug, assigneeId: string | null) => {
    const old = bug.assignee;
    const member = members.find((m) => m.user._id === assigneeId);
    updateBug(bug._id, {
      assignee: member
        ? {
            _id: member.user._id,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar,
          }
        : null,
    });
    try {
      await bugService.updateAssignee(bug._id, assigneeId, bug.projectId);
      toast.success("Bug assignee changed successfully!");
    } catch {
      updateBug(bug._id, { assignee: old });
      toast.error("Failed to update assignee.");
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    removeBug(deleteTarget._id);
    try {
      await bugService.delete(deleteTarget._id, deleteTarget.projectId);
      toast.success("Bug deleted.");
    } catch {
      toast.error("Failed to delete bug.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getInitialsInline = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-full flex flex-col min-h-0 px-4">
        {/* ── TOOLBAR ──────────────────────────────────── */}
        <div className="flex-none space-y-3 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bugs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64 h-8 text-sm rounded-lg font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Sort */}
            <Button
              variant={sortConfig?.key === "priority" ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleSort("priority")}
              className="gap-2 h-8 text-xs rounded-lg"
            >
              Priority
              <ArrowUpDown className="h-3 w-3" />
              {sortConfig?.key === "priority" && (
                <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
              )}
            </Button>
            <Button
              variant={
                sortConfig?.key === "createdAt" ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => handleSort("createdAt")}
              className="gap-2 h-8 text-xs rounded-lg"
            >
              Date
              <ArrowUpDown className="h-3 w-3" />
              {sortConfig?.key === "createdAt" && (
                <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
              )}
            </Button>
            {sortConfig && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortConfig(null)}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}

            {/* Filter */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-8 text-xs rounded-lg"
                >
                  <Filter className="h-3 w-3" />
                  Filters
                  {hasActiveFilters && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[500px] p-4 rounded-2xl"
                align="start"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Filter Bugs</h4>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFilters({ priority: [], status: [], assignee: [] })
                        }
                        className="h-7 gap-1 text-xs rounded-lg"
                      >
                        <XCircle className="h-3 w-3" />
                        Clear all
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-between gap-6">
                    {/* Priority */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">
                        Priority
                      </label>
                      <div className="space-y-2">
                        {PRIORITY_OPTIONS.map((p) => (
                          <label
                            key={p.value}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.priority.includes(p.value)}
                              onChange={(e) =>
                                handleFilterChange(
                                  "priority",
                                  p.value,
                                  e.target.checked,
                                )
                              }
                              className="rounded border-gray-300"
                            />
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0",
                                getPriorityColor(p.value),
                              )}
                            >
                              {p.label}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Status */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">
                        Status
                      </label>
                      <div className="space-y-2">
                        {BUG_STATUS_OPTIONS.map((s) => (
                          <label
                            key={s.value}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.status.includes(s.value)}
                              onChange={(e) =>
                                handleFilterChange(
                                  "status",
                                  s.value,
                                  e.target.checked,
                                )
                              }
                              className="rounded border-gray-300"
                            />
                            <Badge
                              className={cn(
                                "text-[10px] px-2 py-0",
                                getBugStatusColor(s.value),
                              )}
                            >
                              {s.label}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Assignee */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">
                        Assignee
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {members.map((m) => (
                          <label
                            key={m.user._id}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.assignee.includes(m.user._id)}
                              onChange={(e) =>
                                handleFilterChange(
                                  "assignee",
                                  m.user._id,
                                  e.target.checked,
                                )
                              }
                              className="rounded border-gray-300"
                            />
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={m.user.avatar} />
                              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                                {getInitialsInline(m.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[100px]">
                              {m.user.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {(hasActiveFilters || sortConfig || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="gap-2 h-8 text-xs rounded-lg"
              >
                <RotateCcw className="h-3 w-3" />
                Reset All
              </Button>
            )}
          </div>

          {/* Active filter tags */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Active filters:
              </span>
              {filters.priority.map((p) => (
                <Badge
                  key={p}
                  variant="secondary"
                  className="gap-1 cursor-pointer text-[10px] px-2 py-0"
                  onClick={() => handleFilterChange("priority", p, false)}
                >
                  {PRIORITY_OPTIONS.find((o) => o.value === p)?.label}
                  <XCircle className="h-2.5 w-2.5" />
                </Badge>
              ))}
              {filters.status.map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="gap-1 cursor-pointer text-[10px] px-2 py-0"
                  onClick={() => handleFilterChange("status", s, false)}
                >
                  {s}
                  <XCircle className="h-2.5 w-2.5" />
                </Badge>
              ))}
              {filters.assignee.map((a) => (
                <Badge
                  key={a}
                  variant="secondary"
                  className="gap-1 cursor-pointer text-[10px] px-2 py-0"
                  onClick={() => handleFilterChange("assignee", a, false)}
                >
                  {members.find((m) => m.user._id === a)?.user.name}
                  <XCircle className="h-2.5 w-2.5" />
                </Badge>
              ))}
            </div>
          )}

          {searchQuery && (
            <p className="text-xs text-muted-foreground font-semibold">
              Found {filtered.length} bug(s) matching "{searchQuery}"
            </p>
          )}
        </div>

        {/* ── TABLE ────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-auto custom-scroll">
          <Table className="table-fixed w-full">
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border">
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 w-[90px]">
                  Bug ID
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[250px]">
                  Title
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[100px]">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[80px]">
                  Priority
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[80px]">
                  Reporter
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[90px]">
                  Assignee
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[60px]">
                  Files
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[80px]">
                  Reported
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 w-[80px]">
                  Action
                </TableHead>
                {/* <TableHead className="px-3 py-3 w-14" /> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <td colSpan={9} className="py-12 text-center">
                    <p className="text-xs text-muted-foreground font-semibold">
                      {searchQuery
                        ? `No bugs found matching "${searchQuery}"`
                        : hasActiveFilters
                          ? "No bugs match the selected filters."
                          : "No bugs reported yet."}
                    </p>
                  </td>
                </TableRow>
              ) : (
                filtered.map((bug) => (
                  <TableRow
                    key={bug._id}
                    className="group border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onRowClick(bug._id)}
                  >
                    {/* Bug ID */}
                    <TableCell className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold text-primary">
                        {bug.bugNumber}
                      </span>
                    </TableCell>

                    {/* Title */}
                    <TableCell className="px-3 py-3">
                      <div className="max-w-[250px] text-sm font-medium line-clamp-1 truncate">
                        {bug.title}
                      </div>
                    </TableCell>

                    {/* Status — inline editable */}
                    <TableCell
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit ? (
                        <Select
                          value={bug.status}
                          onValueChange={(val) => handleStatusChange(bug, val)}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-6 w-fit min-w-0 gap-1 rounded-lg border-0 !bg-transparent px-0 pr-1 text-[10px] shadow-none [&>span]:w-auto [&>span]:truncate-none [&>svg]:ml-1 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0",
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
                            {BUG_STATUS_OPTIONS.map((s) => (
                              <SelectItem
                                key={s.value}
                                value={s.value}
                                className="rounded-lg"
                              >
                                <Badge
                                  className={cn(
                                    "pointer-events-none rounded-full px-2 py-0 text-[12px] font-semibold",
                                    getBugStatusColor(s.value),
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
                            "text-[12px] px-2 py-0 rounded-full font-semibold",
                            getBugStatusColor(bug.status),
                          )}
                        >
                          {bug.status}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Priority — inline editable */}
                    <TableCell
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit ? (
                        <Select
                          value={bug.priority}
                          onValueChange={(val: Priority) => {
                            const old = bug.priority;
                            updateBug(bug._id, { priority: val });
                            bugService
                              .update(bug._id, {
                                priority: val,
                                projectId: bug.projectId,
                              })
                              .catch(() => {
                                updateBug(bug._id, { priority: old });
                                toast.error("Failed to update priority.");
                              });
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-6 w-fit min-w-[60px] rounded-lg border text-[11px] px-2",
                              getPriorityColor(bug.priority),
                            )}
                          >
                            <SelectValue>{bug.priority}</SelectValue>
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
                                {/* {p.label} */}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[11px] px-2 py-0 rounded-full",
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
                            getPriorityColor(bug.priority),
                          )}
                        >
                          {bug.priority}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Reporter */}
                    <TableCell className="px-3 py-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-6 w-6 cursor-help">
                            <AvatarImage src={bug.reportedBy?.avatar} />
                            <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                              {getInitials(bug.reportedBy?.name ?? "?")}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent className="bg-primary text-primary-foreground">
                          {bug.reportedBy?.name}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Assignee */}
                    <TableCell
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit ? (
                        <Select
                          value={bug.assignee?._id ?? "unassigned"}
                          onValueChange={(val) =>
                            handleAssigneeChange(
                              bug,
                              val === "unassigned" ? null : val,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-fit min-w-0 gap-2 border-0 px-0 pr-2 !bg-transparent shadow-none">
                            <SelectValue>
                              {bug.assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={bug.assignee.avatar} />
                                    <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                                      {getInitialsInline(bug.assignee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">
                                  Un
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            className="rounded-xl font-medium"
                          >
                            <SelectItem
                              value="unassigned"
                              className="rounded-lg text-sm"
                            >
                              Unassigned
                            </SelectItem>
                            {members.map((m) => (
                              <SelectItem
                                key={m.user._id}
                                value={m.user._id}
                                className="rounded-lg text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={m.user.avatar} />
                                    <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                                      {getInitialsInline(m.user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {m.user.name} ({m.role})
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {bug.assignee ? (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={bug.assignee.avatar} />
                                <AvatarFallback className="text-[11px] bg-primary text-primary-foreground">
                                  {getInitialsInline(bug.assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Attachments count */}
                    <TableCell className="px-3 py-3">
                      {bug.attachments && bug.attachments.length > 0 ? (
                        <div className="flex items-center gap-1 text-foreground">
                          <Paperclip className="h-3 w-3" />
                          <span className="text-sm">
                            {bug.attachments.length}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="px-3 py-3">
                      <span className="text-xs text-foreground">
                        {formatRelativeTime(bug.createdAt)}
                      </span>
                    </TableCell>

                    {/* Delete */}
                    <TableCell
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-lg hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(bug)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-primary text-primary-foreground font-medium">
                            Delete bug
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bug?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.bugNumber}: {deleteTarget?.title}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
