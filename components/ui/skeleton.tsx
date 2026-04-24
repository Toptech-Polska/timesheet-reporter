import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-slate-100", className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

export function ReportCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
