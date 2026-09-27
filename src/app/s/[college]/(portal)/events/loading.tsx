import { NoticeListSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="page-width space-y-5 py-8" aria-busy="true">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-10 w-56" />
      <NoticeListSkeleton rows={4} />
    </div>
  );
}
