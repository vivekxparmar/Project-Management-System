import { RefreshCw, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { AuditLogFilters } from "./AuditLogFilters";

interface FilterState {
  entityType: string;
  actorId: string;
}

interface AuditLogHeaderProps {
  total: number;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh: () => void;
  projectId: string;
}

export function AuditLogHeader({
  total,
  filters,
  // onFilterChange,
  onRefresh,
  // projectId,
}: AuditLogHeaderProps) {
  const hasActiveFilters = !!(filters.entityType || filters.actorId);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0 flex-wrap">
      {/* Title */}
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Audit Log</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">
          {total} events
        </span>
      </div>

      {hasActiveFilters && (
        <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Filtered
        </span>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* <AuditLogFilters
          filters={filters}
          onFilterChange={onFilterChange}
          projectId={projectId}
        /> */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
