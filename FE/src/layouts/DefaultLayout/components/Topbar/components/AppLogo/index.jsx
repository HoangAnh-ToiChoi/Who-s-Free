import { Link } from "react-router";

function AppLogo({ className }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 shrink-0 ${className ?? ""}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-xs">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      </div>
      <span className="text-base font-bold tracking-tight text-slate-800">
        Who&apos;s Free
      </span>
    </Link>
  );
}

export default AppLogo;
