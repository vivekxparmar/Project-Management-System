import { Skeleton } from "@/components/ui/skeleton";

interface PageLoaderProps {
  rows?: number;
}

export default function PageLoader({ rows = 6 }: PageLoaderProps) {
  return (
    <div className="flex flex-col gap-3 p-6 w-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Table header skeleton */}
      <div className="flex gap-3 mb-2">
        <Skeleton className="h-5 w-64 rounded" />
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton
            className="h-5 rounded"
            style={{ width: `${55 + Math.random() * 20}%` }}
          />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}
