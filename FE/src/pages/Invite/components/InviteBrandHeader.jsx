/**
 * InviteBrandHeader - Header hiển thị biểu tượng và tên thương hiệu Who's Free
 */
export function InviteBrandHeader() {
  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
      <div className="inline-flex items-center gap-2 select-none">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs font-bold text-sm">
          W
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900">
          Who's Free
        </span>
      </div>
    </div>
  );
}

export default InviteBrandHeader;
