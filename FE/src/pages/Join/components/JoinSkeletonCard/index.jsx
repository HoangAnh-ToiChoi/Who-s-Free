/**
 * JoinSkeletonCard - Skeleton loading hiển thị tức thì ở Frame 0 (0ms)
 * Triệt tiêu hiện tượng nhấp nháy màn hình (flash of blank content)
 */
export function JoinSkeletonCard() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Group Card Skeleton */}
      <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/60 flex items-start gap-4">
        <div className="size-12 rounded-xl bg-indigo-200/60 shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-3 w-24 bg-indigo-200/60 rounded-md" />
          <div className="h-4 w-40 bg-slate-200 rounded-md" />
          <div className="h-3 w-56 bg-slate-100 rounded-md" />
        </div>
      </div>

      {/* Expiry Pill Skeleton */}
      <div className="h-8 rounded-xl bg-slate-100 border border-slate-200/50" />

      {/* Button Skeleton */}
      <div className="h-11 rounded-xl bg-slate-200" />
    </div>
  );
}

export default JoinSkeletonCard;
