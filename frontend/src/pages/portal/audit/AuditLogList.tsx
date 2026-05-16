import { useRef, useEffect } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { AuditLogItem } from "./AuditLogItem";
import type { AuditLog } from "@/types";
import { Badge } from "@/components/ui/badge";

interface AuditLogListProps {
  logs: AuditLog[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function AuditLogList({
  logs,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: AuditLogListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Infinite scroll — observe bottom sentinel
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (bottomRef.current) {
      observerRef.current.observe(bottomRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <ScrollText className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No audit events yet
        </p>
        <p className="text-xs text-muted-foreground/60">
          All team activity will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="px-4 py-3 flex flex-col gap-0.5">
        {logs.map((log, i) => {
          const prevLog = logs[i - 1];
          const showDateSep =
            !prevLog ||
            new Date(prevLog.createdAt).toDateString() !==
              new Date(log.createdAt).toDateString();

          return (
            <div key={log._id}>
              {/* Date separator */}
              {showDateSep && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px" />
                  <Badge className="text-[12px] rounded-lg bg-muted text-muted-foreground font-semibold px-2 shrink-0">
                    {new Date(log.createdAt).toDateString() ===
                    new Date().toDateString()
                      ? "Today"
                      : new Date(log.createdAt).toDateString() ===
                          new Date(Date.now() - 86400000).toDateString()
                        ? "Yesterday"
                        : new Date(log.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                  </Badge>
                  <div className="flex-1 h-px" />
                </div>
              )}
              <AuditLogItem log={log} />
            </div>
          );
        })}

        {/* Load more sentinel */}
        <div ref={bottomRef} className="py-2">
          {isLoadingMore && (
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!hasMore && logs.length > 0 && (
            <p className="text-center text-[11px] text-muted-foreground py-2">
              You've reached the beginning of the audit log
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
