import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types";
import {
  Zap,
  Bug,
  FolderOpen,
  Users,
  MessageSquare,
  ScrollText,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Lock,
  Unlock,
  CheckCircle2,
  UserPlus,
  UserMinus,
  RotateCcw,
} from "lucide-react";

interface AuditLogItemProps {
  log: AuditLog;
}

// Map action strings to icons and colors
const ACTION_CONFIG: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  create: { icon: Plus, color: "text-green-500", label: "Created" },
  update: { icon: Pencil, color: "text-blue-500", label: "Updated" },
  delete: { icon: Trash2, color: "text-red-500", label: "Deleted" },
  archive: { icon: Lock, color: "text-yellow-500", label: "Archived" },
  restore: { icon: Unlock, color: "text-yellow-500", label: "Restored" },
  status_change: {
    icon: RotateCcw,
    color: "text-blue-500",
    label: "Changed status",
  },
  // Keep old mappings for backward compatibility
  created_project: {
    icon: Plus,
    color: "text-green-500",
    label: "Created project",
  },
  updated_project: {
    icon: Pencil,
    color: "text-blue-500",
    label: "Updated project",
  },
  changed_project_status: {
    icon: RotateCcw,
    color: "text-blue-500",
    label: "Changed project status",
  },
  created_sprint: {
    icon: Plus,
    color: "text-green-500",
    label: "Created sprint",
  },
  updated_sprint: {
    icon: Pencil,
    color: "text-blue-500",
    label: "Updated sprint",
  },
  changed_sprint_status: {
    icon: RotateCcw,
    color: "text-blue-500",
    label: "Changed sprint status",
  },
  locked_sprint: {
    icon: Lock,
    color: "text-yellow-500",
    label: "Locked sprint",
  },
  unlocked_sprint: {
    icon: Unlock,
    color: "text-yellow-500",
    label: "Unlocked sprint",
  },
  deleted_sprint: {
    icon: Trash2,
    color: "text-red-500",
    label: "Deleted sprint",
  },
  created_task: { icon: Plus, color: "text-green-500", label: "Created task" },
  updated_task: { icon: Pencil, color: "text-blue-500", label: "Updated task" },
  changed_task_status: {
    icon: RotateCcw,
    color: "text-blue-500",
    label: "Changed task status",
  },
  deleted_task: { icon: Trash2, color: "text-red-500", label: "Deleted task" },
  created_subtask: {
    icon: Plus,
    color: "text-green-500",
    label: "Created subtask",
  },
  updated_subtask: {
    icon: Pencil,
    color: "text-blue-500",
    label: "Updated subtask",
  },
  changed_subtask_status: {
    icon: RotateCcw,
    color: "text-blue-500",
    label: "Changed subtask status",
  },
  deleted_subtask: {
    icon: Trash2,
    color: "text-red-500",
    label: "Deleted subtask",
  },
  reported_bug: { icon: Bug, color: "text-red-500", label: "Reported bug" },
  updated_bug: { icon: Pencil, color: "text-blue-500", label: "Updated bug" },
  deleted_bug: { icon: Trash2, color: "text-red-500", label: "Deleted bug" },
  added_resource: {
    icon: FolderOpen,
    color: "text-purple-500",
    label: "Added resource",
  },
  deleted_resource: {
    icon: Trash2,
    color: "text-red-500",
    label: "Deleted resource",
  },
  added_member: {
    icon: UserPlus,
    color: "text-green-500",
    label: "Added member",
  },
  removed_member: {
    icon: UserMinus,
    color: "text-red-500",
    label: "Removed member",
  },
  updated_member_role: {
    icon: Users,
    color: "text-blue-500",
    label: "Updated member role",
  },
  task_moved_to_backlog: {
    icon: ArrowLeftRight,
    color: "text-orange-500",
    label: "Moved task to backlog",
  },
  task_moved_to_sprint: {
    icon: ArrowLeftRight,
    color: "text-orange-500",
    label: "Moved task to sprint",
  },
};

const ENTITY_ICONS: Record<string, any> = {
  project: FolderOpen,
  sprint: Zap,
  task: CheckCircle2,
  subtask: CheckCircle2,
  bug: Bug,
  resource: FolderOpen,
  member: Users,
  comment: MessageSquare,
};

const ENTITY_COLORS: Record<string, string> = {
  project: "bg-blue-400/15 text-blue-600",
  sprint: "bg-purple-400/15 text-purple-600",
  task: "bg-green-400/15 text-green-600",
  subtask: "bg-green-400/15 text-green-600",
  bug: "bg-red-400/15 text-red-600",
  resource: "bg-orange-400/15 text-orange-600",
  member: "bg-pink-400/15 text-pink-600",
  comment: "bg-gray-400/15 text-gray-600",
};

// Format field name for display
// const formatFieldName = (field: string): string => {
//   return field
//     .replace(/_/g, " ")
//     .split(" ")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(" ");
// };

// Get value as readable string
const getValueString = (value: any): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length > 3) return `[${value.length} items]`;
    return `[${value.map((v) => getValueString(v)).join(", ")}]`;
  }
  if (typeof value === "object") {
    if (value._id) return value.name || value.title || value._id;
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    if (keys.length <= 2) {
      return keys.map((k) => `${k}: ${getValueString(value[k])}`).join(", ");
    }
    return `{${keys.length} fields}`;
  }
  return String(value);
};

// Build a human-readable description from changes map
// function buildChangeDescription(changes: Record<string, any>): string | null {
//   if (!changes || Object.keys(changes).length === 0) return null;

//   const entries = Object.entries(changes);

//   return entries
//     .map(([field, value]) => {
//       const fieldName = formatFieldName(field);
//       const valueStr = getValueString(value);

//       if (!valueStr || valueStr === "—") return null;

//       return `${fieldName}: ${valueStr}`;
//     })
//     .filter(Boolean)
//     .join(" · ");
// }

export function AuditLogItem({ log }: AuditLogItemProps) {
  const config = ACTION_CONFIG[log.action] ?? {
    icon: ScrollText,
    color: "text-muted-foreground",
    label: log.action.replace(/_/g, " "),
  };

  const ActionIcon = config.icon;
  const EntityIcon = ENTITY_ICONS[log.entityType] ?? ScrollText;
  const entityColor =
    ENTITY_COLORS[log.entityType] ?? "bg-gray-400/15 text-gray-600";

  // Handle changes - could be nested (like { name: { old, new } })
  // const changeDesc = buildChangeDescription(log.changes ?? {});

  // Get user info - use `user` object from response
  const user = log.user;
  const userName = user?.name || log.userName || "Unknown User";
  const userAvatar = user?.avatar || "";

  const timeStr = new Date(log.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TooltipProvider delayDuration={0}>
      <div className="group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
        {/* Actor avatar */}
        <Avatar className="h-7 w-7 shrink-0 mt-0.5 cursor-pointer">
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Actor name */}
            <span className="text-xs font-semibold">{userName}</span>

            {/* Action icon + label */}
            <div className="flex items-center gap-1 font-medium">
              <ActionIcon className={cn("h-3 w-3 shrink-0", config.color)} />
              <span className="text-xs text-muted-foreground">
                {config.label} {log.entityType}
              </span>
            </div>

            {/* Entity name */}
            {log.entityName && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[12px] px-1.5 py-0 rounded-lg gap-1 font-medium",
                  entityColor,
                )}
              >
                <EntityIcon className="h-2.5 w-2.5" />
                <span className="truncate max-w-[140px]">{log.entityName}</span>
              </Badge>
            )}
          </div>

          {/* Change details */}
          {/* {changeDesc && (
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed font-medium">
              {changeDesc}
            </p>
          )} */}

          {/* Metadata extras */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              {Object.entries(log.metadata)
                .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                .join(" · ")}
            </p>
          )}
        </div>

        {/* Time */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[12px] text-muted-foreground shrink-0 mt-0.5 tabular-nums cursor-default font-medium">
              {timeStr}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            className="text-xs bg-primary text-primary-foreground"
          >
            {new Date(log.createdAt).toLocaleString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
