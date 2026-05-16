import { useState } from "react";
import { Filter, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProjectStore } from "@/stores";
import { getInitials } from "@/lib/constants";

interface FilterState {
  entityType: string;
  actorId: string;
}

interface AuditLogFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  // projectId: string;
}

const ENTITY_TYPES = [
  { value: "project", label: "Project" },
  { value: "sprint", label: "Sprint" },
  { value: "task", label: "Task" },
  { value: "subtask", label: "Subtask" },
  { value: "bug", label: "Bug" },
  { value: "resource", label: "Resource" },
  { value: "member", label: "Member" },
  { value: "comment", label: "Comment" },
];

export function AuditLogFilters({
  filters,
  onFilterChange,
  // projectId,
}: AuditLogFiltersProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<FilterState>(filters);
  const members = useProjectStore((s) => s.currentProject?.members ?? []);

  const activeCount = [filters.entityType, filters.actorId].filter(
    Boolean,
  ).length;

  const handleApply = () => {
    onFilterChange(local);
    setOpen(false);
  };

  const handleClear = () => {
    const cleared = { entityType: "", actorId: "" };
    setLocal(cleared);
    onFilterChange(cleared);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-xl text-xs gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-4 px-1 text-[10px] rounded-full"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Filter Logs</h4>
            {activeCount > 0 && (
              <button
                onClick={handleClear}
                className="text-[12px] text-foreground hover:text-foreground flex items-center gap-1"
              >
                <XCircle className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Entity type */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Entity type</Label>
            <Select
              value={local.entityType || "all"}
              onValueChange={(val) =>
                setLocal((p) => ({
                  ...p,
                  entityType: val === "all" ? "" : val,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full rounded-xl text-xs">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="rounded-2xl p-2 !text-md w-[var(--radix-select-trigger-width)]"
              >
                <SelectItem value="all" className="text-xs rounded-xl">
                  All types
                </SelectItem>
                {ENTITY_TYPES.map((et) => (
                  <SelectItem
                    key={et.value}
                    value={et.value}
                    className="text-xs rounded-xl"
                  >
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actor */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Team member</Label>
            <Select
              value={local.actorId || "all"}
              onValueChange={(val) =>
                setLocal((p) => ({
                  ...p,
                  actorId: val === "all" ? "" : val,
                }))
              }
            >
              <SelectTrigger className="h-9 rounded-xl text-xs w-full">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="rounded-2xl p-2 !text-md w-[var(--radix-select-trigger-width)]"
              >
                <SelectItem value="all" className="text-xs rounded-xl">
                  All members
                </SelectItem>
                {members.map((m) => (
                  <SelectItem
                    key={m.user._id}
                    value={m.user._id}
                    className="text-xs rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.user.avatar} />
                        <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                          {getInitials(m.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {m.user.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl text-xs"
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
