import { Link } from "react-router";

function AppLogo({ className }) {
  return (
    <Link to="/" className={`flex items-center gap-2 shrink-0 ${className ?? ""}`}>
      <img
        src="/logo.png"
        alt="Who's Free"
        className="h-8 w-8 rounded-lg object-contain"
      />
      <span className="hidden sm:block text-base font-bold tracking-tight text-slate-800">
        Who&apos;s Free
      </span>
    </Link>
  );
}

export default AppLogo;
