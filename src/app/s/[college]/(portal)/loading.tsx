import { NoticeListSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="page-width space-y-8 py-8" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3 max-w-lg" />
        <Skeleton className="h-5 w-1/2 max-w-md" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <NoticeListSkeleton rows={4} />
        <NoticeListSkeleton rows={3} />
      </div>
    </div>
  );
}
