const BAR_WIDTHS = ["w-1/3", "w-1/2", "w-2/5", "w-1/2", "w-1/4", "w-2/5"];

/**
 * Khung xương lúc modal Chốt lịch đang tải: cùng bố cục với nội dung thật (gợi ý + bảng giờ) để khi tải xong
 * modal không đổi chiều cao đột ngột (giật), nội dung thật trượt lên đúng chỗ.
 */
function FinalizeSkeleton() {
  return (
    <div className="mt-5 flex animate-pulse flex-col gap-4 motion-reduce:animate-none" role="status" aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="h-7 w-32 rounded-lg bg-slate-100" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-100 px-3 py-3">
          <div className="h-3.5 w-1/2 rounded bg-slate-200" />
          <div className="h-2.5 w-1/3 rounded bg-slate-100" />
        </div>
      ))}

      <div className="h-3 w-32 rounded bg-slate-200" />
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="h-8 border-b border-slate-200 bg-slate-50" />
        {BAR_WIDTHS.map((w, i) => (
          <div key={i} className="flex h-11 items-center gap-4 border-b border-slate-100 px-3 last:border-b-0">
            <div className="h-3 w-24 shrink-0 rounded bg-slate-200 sm:w-36" />
            <div className={`h-6 rounded-md bg-indigo-100 ${w}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FinalizeSkeleton;
