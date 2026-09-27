export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Placeholder shaped like a list of notices. */
export function NoticeListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="panel divide-y divide-line" role="status" aria-label="Loading notices">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2.5 p-4 sm:p-5">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="panel" role="status" aria-label="Loading">
      <div className="border-b border-line p-4"><Skeleton className="h-4 w-40" /></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line p-4 last:border-0">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
