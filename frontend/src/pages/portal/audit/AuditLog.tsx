import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { auditService } from "@/services";
import { AuditLogHeader } from "./AuditLogHeader";
import { AuditLogList } from "./AuditLogList";
import PageLoader from "@/components/shared/PageLoader";
import type { AuditLog as AuditLogType } from "@/types";

interface FilterState {
  entityType: string;
  actorId: string;
}

export default function AuditLog() {
  const { projectId } = useParams<{ projectId: string }>();

  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    entityType: "",
    actorId: "",
  });

  const LIMIT = 40;

  const fetchLogs = useCallback(
    async (pageNum: number, currentFilters: FilterState, reset = false) => {
      if (!projectId) return;
      if (pageNum === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const res = await auditService.getAll(projectId, {
          page: pageNum,
          limit: LIMIT,
          ...(currentFilters.entityType && {
            entityType: currentFilters.entityType,
          }),
          ...(currentFilters.actorId && { actor: currentFilters.actorId }),
        });

        const data: AuditLogType[] = res.data.data;
        const totalCount: number = res.data.total;

        setTotal(totalCount);
        setLogs((prev) => (reset || pageNum === 1 ? data : [...prev, ...data]));
        setHasMore(data.length === LIMIT);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [projectId],
  );

  // Initial fetch
  useEffect(() => {
    setPage(1);
    fetchLogs(1, filters, true);
  }, [projectId, filters]);

  useEffect(() => {
    const handleNewLog = (e: CustomEvent) => {
      setLogs((prev) => [e.detail, ...prev]);
      setTotal((t) => t + 1);
    };
    window.addEventListener("audit:new" as any, handleNewLog);
    return () => window.removeEventListener("audit:new" as any, handleNewLog);
  }, []);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, filters);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleRefresh = () => {
    setPage(1);
    fetchLogs(1, filters, true);
  };

  if (isLoading) return <PageLoader rows={8} />;

  return (
    <div className="flex flex-col h-full">
      <AuditLogHeader
        total={total}
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        projectId={projectId!}
      />
      <AuditLogList
        logs={logs}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
