import { NoticeListSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="page-width space-y-5 py-8" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-11 w-full" />
      <div className="flex gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-20" />)}</div>
      <NoticeListSkeleton rows={6} />
    </div>
  );
}
